import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';
import { getStripeSecret, resolveWebhookSecrets, has, getPlatformFeePercent } from '../_shared/env.ts';

console.log('stripe-webhook starting');
console.log('✅ Webhook configured:', {
  hasStripeSecret: has('STRIPE_SECRET_KEY_LIVE') || has('STRIPE_SECRET'),
  hasPlatformSecret: has('STRIPE_WEBHOOK_SECRET_PLATFORM') || has('STRIPE_WEBHOOK_SECRET'),
  hasConnectSecret: has('STRIPE_WEBHOOK_SECRET_CONNECT'),
  platformFeePercent: getPlatformFeePercent() * 100 + '%'
});

serve(async (req) => {
  // Health/Diagnostics Endpoint
  if (req.method === "GET") {
    const secrets = resolveWebhookSecrets();
    return new Response(JSON.stringify({
      ok: true,
      timestamp: new Date().toISOString(),
      has_stripe_secret: has('STRIPE_SECRET_KEY_LIVE') || has('STRIPE_SECRET'),
      has_platform_webhook_secret: !!secrets.platform,
      has_connect_webhook_secret: !!secrets.connect,
      webhook_secret_sources: {
        platform: secrets.platform ? (has('STRIPE_WEBHOOK_SECRET_PLATFORM') ? 'STRIPE_WEBHOOK_SECRET_PLATFORM' : 'STRIPE_WEBHOOK_SECRET') : null,
        connect: secrets.connect ? 'STRIPE_WEBHOOK_SECRET_CONNECT' : null,
      }
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" }
    });
  }

  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204 });
  }

  // Only accept POST for webhooks
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ 
      ok: false, 
      code: "METHOD_NOT_ALLOWED",
      message: "Only POST requests accepted for webhooks" 
    }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  try {
    // Get signature header
    const sig = req.headers.get("Stripe-Signature");
    if (!sig) {
      return new Response(JSON.stringify({ 
        ok: false, 
        code: "MISSING_SIGNATURE",
        message: "Stripe-Signature header missing" 
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Get webhook secrets
    const { platform, connect } = resolveWebhookSecrets();
    
    if (!platform && !connect) {
      console.error("❌ No webhook secrets configured!");
      return new Response(JSON.stringify({ 
        ok: false, 
        code: "NO_WEBHOOK_SECRETS",
        message: "Webhook secrets not configured. Set STRIPE_WEBHOOK_SECRET_PLATFORM and/or STRIPE_WEBHOOK_SECRET_CONNECT in Edge Secrets."
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Initialize Stripe
    const stripeKey = getStripeSecret();
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Read raw body for signature verification
    const rawBody = await req.text();
    
    // Try to construct event with available secrets
    let event: Stripe.Event | null = null;
    let source: "platform" | "connect" | "unknown" = "unknown";

    // Try platform secret first
    if (platform) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, platform);
        source = "platform";
        console.log(`✅ Webhook validated with platform secret`);
      } catch (e: any) {
        console.log(`Platform secret validation failed: ${e.message}`);
      }
    }

    // If platform failed, try connect secret
    if (!event && connect) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, connect);
        source = "connect";
        console.log(`✅ Webhook validated with connect secret`);
      } catch (e: any) {
        console.log(`Connect secret validation failed: ${e.message}`);
        return new Response(JSON.stringify({ 
          ok: false, 
          code: "BAD_SIGNATURE",
          message: `Webhook signature validation failed: ${e.message}` 
        }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }

    if (!event) {
      return new Response(JSON.stringify({ 
        ok: false, 
        code: "BAD_SIGNATURE_OR_NO_SECRET",
        message: "Could not validate webhook signature with available secrets" 
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    console.log(`📥 Webhook event: ${event.type} (source: ${source}, id: ${event.id})`);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Idempotency check - prevent duplicate processing from retries
    const { data: existingEvent } = await supabase
      .from('stripe_events')
      .select('id, processed_at')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existingEvent?.processed_at) {
      console.log(`⚠️  Event ${event.id} already processed at ${existingEvent.processed_at}, skipping`);
      return new Response(JSON.stringify({ 
        ok: true, 
        message: "Event already processed (idempotent)",
        source,
        event_id: event.id 
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Record event processing start
    if (!existingEvent) {
      await supabase
        .from('stripe_events')
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          webhook_source: source,
          raw_event: event,
        });
    }

    // Helper function to get dynamic platform fee based on subscription plan
    const getDynamicPlatformFee = async (providerId: string): Promise<number> => {
      // First, check if org has manually set transaction_fee_pct
      const { data: org } = await supabase
        .from('organizations')
        .select('transaction_fee_pct')
        .eq('id', providerId)
        .single();
      
      if (org?.transaction_fee_pct !== null && org?.transaction_fee_pct !== undefined) {
        return org.transaction_fee_pct;
      }
      
      // Otherwise, derive from subscription plan
      const { data: subscription } = await supabase
        .from('provider_subscriptions')
        .select('plan')
        .eq('organization_id', providerId)
        .eq('status', 'active')
        .maybeSingle();
      
      // Plan-based fee mapping
      const planFees: Record<string, number> = {
        'free': 0.08,    // 8%
        'beta': 0.03,    // 3%
        'growth': 0.025, // 2.5%
        'pro': 0.02,     // 2%
        'scale': 0.015,  // 1.5%
      };
      
      return subscription?.plan 
        ? (planFees[subscription.plan] || getPlatformFeePercent())
        : getPlatformFeePercent();
    };

    // Helper to get plan config (for updates)
    const getPlanConfig = (plan: string) => {
      const configs: Record<string, { teamLimit: number; feePercent: number }> = {
        'free': { teamLimit: 0, feePercent: 0.08 },
        'beta': { teamLimit: 3, feePercent: 0.03 },
        'growth': { teamLimit: 3, feePercent: 0.025 },
        'pro': { teamLimit: 10, feePercent: 0.02 },
        'scale': { teamLimit: 25, feePercent: 0.015 },
      };
      
      return configs[plan] || { teamLimit: 0, feePercent: 0.08 };
    };

    // Helper function to insert ledger entry with idempotency check
    const insertLedgerEntry = async (entry: any) => {
      // Check if ledger entry already exists to prevent duplicates from webhook retries
      if (entry.stripe_ref) {
        const { data: existing } = await supabase
          .from('ledger_entries')
          .select('id')
          .eq('stripe_ref', entry.stripe_ref)
          .maybeSingle();
        
        if (existing) {
          console.log(`Ledger entry already exists for ${entry.stripe_ref}, skipping`);
          return;
        }
      }
      
      await supabase.from('ledger_entries').insert(entry);
    };

    // Handle Express Connect account updates
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      
      // Determine if payments are fully ready
      const paymentsReady = account.charges_enabled && account.payouts_enabled;
      
      await supabase
        .from('organizations')
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          stripe_onboarding_complete: account.details_submitted || false,
          payments_ready: paymentsReady,
        })
        .eq('stripe_account_id', account.id);
      
      console.log(`Updated account ${account.id}: payments_ready=${paymentsReady}`);
    }

    // Handle payment intent created (authorization)
    if (event.type === 'payment_intent.created') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { org_id, homeowner_id, job_id } = paymentIntent.metadata;

      if (org_id) {
        // Insert ledger entry for charge authorization
        await insertLedgerEntry({
          occurred_at: new Date().toISOString(),
          type: 'charge',
          direction: 'debit',
          amount_cents: paymentIntent.amount,
          currency: paymentIntent.currency,
          stripe_ref: paymentIntent.id,
          party: 'customer',
          job_id: job_id || null,
          provider_id: org_id || null,
          homeowner_id: homeowner_id || null,
          metadata: { status: 'authorized' },
        });
      }
    }

    // Handle provider subscription invoices
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const orgId = invoice.metadata.org_id;

      // Check if this is a subscription invoice (provider plan billing)
      if (invoice.subscription) {
        const { data: subscription } = await supabase
          .from('provider_subscriptions')
          .select('*')
          .eq('stripe_subscription_id', invoice.subscription)
          .single();

        if (subscription) {
          // Update organization with new plan tier and limits using dynamic fees
          const config = getPlanConfig(subscription.plan);
          
          await supabase
            .from('organizations')
            .update({
              plan: subscription.plan,
              team_limit: config.teamLimit,
              transaction_fee_pct: config.feePercent,
            })
            .eq('id', subscription.provider_id);
          
          console.log(`Synced ${subscription.plan} plan to org ${subscription.provider_id}`);

          // Insert ledger entry for subscription revenue
          await insertLedgerEntry({
            occurred_at: new Date().toISOString(),
            type: 'subscription_invoice',
            direction: 'credit',
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            stripe_ref: invoice.id,
            party: 'platform',
            provider_id: subscription.provider_id,
            metadata: { plan: subscription.plan },
          });
        }
      }

      // Handle job payment invoices (legacy)
      if (orgId) {
        await supabase
          .from('payments')
          .update({ 
            status: 'paid',
            payment_date: new Date().toISOString(),
          })
          .eq('stripe_id', invoice.id);

        // Update linked job if exists
        if (invoice.metadata.job_id) {
          await supabase
            .from('bookings')
            .update({ status: 'completed' })
            .eq('id', invoice.metadata.job_id);
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      await supabase
        .from('payments')
        .update({ status: 'open' })
        .eq('stripe_id', invoice.id);
    }

    if (event.type === 'invoice.voided') {
      const invoice = event.data.object as Stripe.Invoice;
      await supabase
        .from('payments')
        .update({ status: 'void' })
        .eq('stripe_id', invoice.id);
    }

    // Handle payment intent succeeded (payment completed)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Confirm booking when payment succeeds
      if (paymentIntent.metadata.booking_id) {
        await supabase
          .from('bookings')
          .update({ status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', paymentIntent.metadata.booking_id);
        console.log('Booking confirmed:', paymentIntent.metadata.booking_id);
      }
      const { org_id, homeowner_id, job_id } = paymentIntent.metadata;

      if (org_id) {
        // Update payment record
        const { data: existing } = await supabase
          .from('payments')
          .select('*')
          .eq('stripe_id', paymentIntent.id)
          .single();

        if (existing) {
          await supabase
            .from('payments')
            .update({ 
              status: 'paid',
              captured: true,
              payment_date: new Date().toISOString(),
            })
            .eq('id', existing.id);

          // Insert ledger entries for destination charge
          const feeAmount = existing.application_fee_cents || 0;
          const transferAmount = existing.amount - feeAmount;

          // Platform fee
          await insertLedgerEntry({
            occurred_at: new Date().toISOString(),
            type: 'fee',
            direction: 'credit',
            amount_cents: feeAmount,
            currency: existing.currency,
            stripe_ref: paymentIntent.id,
            party: 'platform',
            job_id: job_id || null,
            provider_id: org_id || null,
            homeowner_id: homeowner_id || null,
            metadata: { fee_pct: existing.fee_pct_at_time },
          });

          // Provider transfer
          await insertLedgerEntry({
            occurred_at: new Date().toISOString(),
            type: 'transfer',
            direction: 'credit',
            amount_cents: transferAmount,
            currency: existing.currency,
            stripe_ref: paymentIntent.id,
            party: 'provider',
            job_id: job_id || null,
            provider_id: org_id || null,
            homeowner_id: homeowner_id || null,
            metadata: { transfer_group: existing.transfer_group },
          });

          // Update job status if completed
          if (job_id) {
            await supabase
              .from('bookings')
              .update({
                deposit_paid: true,
                payment_captured: true,
                status: 'confirmed',
              })
              .eq('id', job_id);
          }
        } else {
          // Create new payment record (legacy payment intents)
          await supabase
            .from('payments')
            .insert({
              org_id: org_id,
              homeowner_profile_id: homeowner_id || null,
              job_id: job_id || null,
              type: paymentIntent.metadata.type || 'payment_link',
              status: 'paid',
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              stripe_id: paymentIntent.id,
              payment_date: new Date().toISOString(),
              captured: true,
              meta: paymentIntent.metadata,
            });
        }
      }
    }

    // Handle transfers created
    if (event.type === 'transfer.created') {
      const transfer = event.data.object as Stripe.Transfer;
      
      await insertLedgerEntry({
        occurred_at: new Date().toISOString(),
        type: 'transfer',
        direction: 'credit',
        amount_cents: transfer.amount,
        currency: transfer.currency,
        stripe_ref: transfer.id,
        party: 'provider',
        metadata: {
          destination: transfer.destination,
          transfer_group: transfer.transfer_group,
        },
      });
    }

    // Handle refunds
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      
      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('stripe_id', charge.payment_intent);
    }

    // Handle payouts
    if (event.type === 'payout.paid') {
      const payout = event.data.object as Stripe.Payout;
      const stripeAccount = event.account;

      // Find org by stripe account
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('stripe_account_id', stripeAccount)
        .single();

      if (org) {
        await supabase
          .from('payouts')
          .upsert({
            org_id: org.id,
            stripe_payout_id: payout.id,
            amount: payout.amount / 100,
            currency: payout.currency,
            arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
            status: payout.status,
          }, {
            onConflict: 'stripe_payout_id'
          });
      }
    }

    // Handle trial subscription start (checkout.session.completed)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.mode === 'subscription' && session.subscription) {
        const { org_id, user_id, plan } = session.metadata;
        
        if (org_id && user_id) {
          // Fetch subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          // Update profiles with trial info
          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              plan: plan || 'beta',
              trial_ends_at: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
            })
            .eq('user_id', user_id);
          
          // Update organization with dynamic fee
          const config = getPlanConfig(plan || 'beta');
          await supabase
            .from('organizations')
            .update({
              plan: plan || 'beta',
              transaction_fee_pct: config.feePercent,
            })
            .eq('id', org_id);

          // Update provider_subscriptions
          await supabase
            .from('provider_subscriptions')
            .upsert({
              provider_id: org_id,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              plan: plan || 'beta',
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            });

          console.log(`Trial started for org ${org_id}: ${plan} plan`);
        }
      }
    }

    // Handle subscription updates (downgrades/upgrades/trial ending)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const prevAttributes = event.data.previous_attributes as any;
      
      // Check if trial just ended
      if (prevAttributes?.status === 'trialing' && subscription.status === 'active') {
        console.log(`Trial ended and converted to paid for subscription ${subscription.id}`);
      }
      
      const { data: providerSub } = await supabase
        .from('provider_subscriptions')
        .select('*, organizations(plan)')
        .eq('stripe_subscription_id', subscription.id)
        .single();
      
      if (providerSub) {
        // Update profiles
        await supabase
          .from('profiles')
          .update({
            plan: subscription.status === 'active' || subscription.status === 'trialing' 
              ? (subscription.metadata.plan || providerSub.plan || 'beta') 
              : 'free',
            trial_ends_at: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString() 
              : null,
          })
          .eq('stripe_subscription_id', subscription.id);

        // Update provider_subscriptions
        await supabase
          .from('provider_subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        
        if (providerSub.organizations) {
          const oldPlan = (providerSub.organizations as any).plan;
          const newPlan = providerSub.plan;
          
          // Check if plan changed (downgrade or upgrade)
          const planOrder = ['free', 'beta', 'growth', 'pro', 'scale'];
          const oldIndex = planOrder.indexOf(oldPlan);
          const newIndex = planOrder.indexOf(newPlan);
          
          if (oldIndex !== newIndex) {
            console.log(`Provider ${providerSub.provider_id} plan change: ${oldPlan} -> ${newPlan}`);
            
            // Get new limits with dynamic fees
            const newLimits = getPlanConfig(newPlan);
            
            // Update org with new plan and limits
            await supabase
              .from('organizations')
              .update({
                plan: newPlan,
                team_limit: newLimits.teamLimit,
                transaction_fee_pct: newLimits.feePercent,
              })
              .eq('id', providerSub.provider_id);
            
            // If downgrading, check if over team limit
            if (newIndex < oldIndex) {
              const { count } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', providerSub.provider_id)
                .in('status', ['invited', 'active']);
              
              if (count && count > newLimits.teamLimit) {
                console.warn(`⚠️  Provider ${providerSub.provider_id} has ${count} team members but limit is now ${newLimits.teamLimit}`);
              }
            }
          }
        }
      }
    }

    // Handle subscription deleted/canceled
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Revert to free plan
      await supabase
        .from('profiles')
        .update({
          plan: 'free',
          trial_ends_at: null,
          stripe_subscription_id: null,
        })
        .eq('stripe_subscription_id', subscription.id);

      await supabase
        .from('provider_subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);

      // Update organization to free plan with dynamic fees
      const config = getPlanConfig('free');
      const { data: providerSub } = await supabase
        .from('provider_subscriptions')
        .select('provider_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (providerSub) {
        await supabase
          .from('organizations')
          .update({
            plan: 'free',
            team_limit: config.teamLimit,
            transaction_fee_pct: config.feePercent,
          })
          .eq('id', providerSub.provider_id);

        console.log(`Subscription canceled, reverted org ${providerSub.provider_id} to free plan`);
      }
    }

    // Handle disputes
    if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object as Stripe.Dispute;
      
      await supabase
        .from('disputes')
        .insert({
          stripe_dispute_id: dispute.id,
          charge_id: dispute.charge as string,
          amount: dispute.amount,
          currency: dispute.currency,
          reason: dispute.reason,
          status: dispute.status,
          evidence_due_by: dispute.evidence_details?.due_by 
            ? new Date(dispute.evidence_details.due_by * 1000).toISOString() 
            : null,
          created_at: new Date(dispute.created * 1000).toISOString(),
        });

      // Update payment status
      await supabase
        .from('payments')
        .update({ status: 'disputed' })
        .eq('stripe_id', dispute.charge);

      console.log(`Dispute created: ${dispute.id} for charge ${dispute.charge}`);
    }

    if (event.type === 'charge.dispute.updated') {
      const dispute = event.data.object as Stripe.Dispute;
      
      await supabase
        .from('disputes')
        .update({
          status: dispute.status,
          evidence_due_by: dispute.evidence_details?.due_by 
            ? new Date(dispute.evidence_details.due_by * 1000).toISOString() 
            : null,
        })
        .eq('stripe_dispute_id', dispute.id);

      console.log(`Dispute updated: ${dispute.id} status=${dispute.status}`);
    }

    if (event.type === 'charge.dispute.closed') {
      const dispute = event.data.object as Stripe.Dispute;
      
      await supabase
        .from('disputes')
        .update({
          status: dispute.status,
          resolved_at: new Date().toISOString(),
        })
        .eq('stripe_dispute_id', dispute.id);

      // Update payment status based on outcome
      const newStatus = dispute.status === 'won' ? 'paid' : 'disputed';
      await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('stripe_id', dispute.charge);

      console.log(`Dispute closed: ${dispute.id} outcome=${dispute.status}`);
    }

    // Mark event as processed
    await supabase
      .from('stripe_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);

    console.log(`✅ Successfully processed ${event.type} (${event.id})`);

    return new Response(JSON.stringify({ 
      ok: true, 
      received: true,
      source,
      event_type: event.type,
      event_id: event.id 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    
    // Return structured error
    return new Response(
      JSON.stringify({ 
        ok: false,
        code: error.code || 'WEBHOOK_ERROR',
        message: error.message || 'Unknown webhook processing error',
        type: error.type,
      }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
