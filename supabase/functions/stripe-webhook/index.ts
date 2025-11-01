import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';
import { getStripeSecret, resolveWebhookSecrets, has, getPlatformFeePercent } from '../_shared/env.ts';
import { stripeGet } from '../_shared/stripe-fetch.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

console.log('stripe-webhook starting');
console.log('✅ Webhook configured:', {
  hasStripeSecret: has('STRIPE_SECRET_KEY_LIVE') || has('STRIPE_SECRET'),
  hasPlatformSecret: has('STRIPE_WEBHOOK_SECRET_PLATFORM') || has('STRIPE_WEBHOOK_SECRET'),
  hasConnectSecret: has('STRIPE_WEBHOOK_SECRET_CONNECT'),
  platformFeePercent: getPlatformFeePercent() * 100 + '%'
});

// Manual webhook signature verification (Deno-safe, no Node SDK)
async function verifyWebhookSignature(payload: string, signatureHeader: string, secret: string): Promise<boolean> {
  try {
    const elements = signatureHeader.split(',').reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const timestamp = elements.t;
    const expectedSig = elements.v1;
    
    if (!timestamp || !expectedSig) return false;
    
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const computedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computedSig = Array.from(new Uint8Array(computedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return computedSig === expectedSig;
  } catch (e) {
    console.error('Signature verification error:', e);
    return false;
  }
}

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
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    });
  }

  // CORS Preflight - MUST have null body for 204
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Only accept POST for webhooks
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ 
      ok: false, 
      code: "METHOD_NOT_ALLOWED",
      message: "Only POST requests accepted for webhooks" 
    }), { status: 405, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  try {
    // Get signature header
    const sig = req.headers.get("Stripe-Signature");
    if (!sig) {
      return new Response(JSON.stringify({ 
        ok: false, 
        code: "MISSING_SIGNATURE",
        message: "Stripe-Signature header missing" 
      }), { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }

    // Get webhook secrets
    const { platform, connect } = resolveWebhookSecrets();
    
    if (!platform && !connect) {
      console.error("❌ No webhook secrets configured!");
      return new Response(JSON.stringify({ 
        ok: false, 
        code: "NO_WEBHOOK_SECRETS",
        message: "Webhook secrets not configured. Set STRIPE_WEBHOOK_SECRET_PLATFORM and/or STRIPE_WEBHOOK_SECRET_CONNECT in Edge Secrets."
      }), { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }

    // Read raw body for signature verification
    const rawBody = await req.text();
    
    // Try to verify with available secrets
    let event: any = null;
    let source: "platform" | "connect" | "unknown" = "unknown";

    // Try platform secret first
    if (platform && await verifyWebhookSignature(rawBody, sig, platform)) {
      event = JSON.parse(rawBody);
      source = "platform";
      console.log(`✅ Webhook validated with platform secret`);
    }

    // If platform failed, try connect secret
    if (!event && connect && await verifyWebhookSignature(rawBody, sig, connect)) {
      event = JSON.parse(rawBody);
      source = "connect";
      console.log(`✅ Webhook validated with connect secret`);
    }

    if (!event) {
      return new Response(JSON.stringify({ 
        ok: false, 
        code: "BAD_SIGNATURE",
        message: "Webhook signature validation failed" 
      }), { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
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
      }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
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
      const { data: org } = await supabase
        .from('organizations')
        .select('transaction_fee_pct')
        .eq('id', providerId)
        .single();
      
      if (org?.transaction_fee_pct !== null && org?.transaction_fee_pct !== undefined) {
        return org.transaction_fee_pct;
      }
      
      const { data: subscription } = await supabase
        .from('provider_subscriptions')
        .select('plan')
        .eq('organization_id', providerId)
        .eq('status', 'active')
        .maybeSingle();
      
      const planFees: Record<string, number> = {
        'free': 0.08,
        'beta': 0.03,
        'growth': 0.025,
        'pro': 0.02,
        'scale': 0.015,
      };
      
      return subscription?.plan 
        ? (planFees[subscription.plan] || getPlatformFeePercent())
        : getPlatformFeePercent();
    };

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

    const insertLedgerEntry = async (entry: any) => {
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
      const account = event.data.object;
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
      const paymentIntent = event.data.object;
      const { org_id, homeowner_id, job_id } = paymentIntent.metadata;

      if (org_id) {
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

    // Handle provider subscription invoices AND custom invoices
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const orgId = invoice.metadata.org_id;
      const invoiceId = invoice.metadata.invoice_id;

      // Handle subscription invoices
      if (invoice.subscription) {
        const { data: subscription } = await supabase
          .from('provider_subscriptions')
          .select('*')
          .eq('stripe_subscription_id', invoice.subscription)
          .single();

        if (subscription) {
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

      // Handle custom invoices from providers to clients
      if (invoiceId) {
        console.log(`Updating invoice ${invoiceId} to paid status`);
        
        const { data: invoiceRecord } = await supabase
          .from('invoices')
          .update({ 
            status: 'paid',
            paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          })
          .eq('stripe_invoice_id', invoice.id)
          .select('job_id, organization_id, client_id, amount')
          .single();
        
        if (invoiceRecord) {
          // Update linked booking if exists
          if (invoiceRecord.job_id) {
            await supabase
              .from('bookings')
              .update({ 
                status: 'paid',
                payment_captured: true
              })
              .eq('id', invoiceRecord.job_id);
            
            console.log(`Updated booking ${invoiceRecord.job_id} to paid`);

            // Update workflow to payment_received
            try {
              await supabase.functions.invoke('workflow-orchestrator', {
                body: {
                  action: 'payment_received',
                  invoiceId: invoiceId,
                  bookingId: invoiceRecord.job_id,
                  homeownerId: null, // Will be fetched from booking
                  providerOrgId: invoiceRecord.organization_id,
                  metadata: {
                    amount: invoiceRecord.amount,
                    payment_method: 'stripe'
                  }
                }
              });
            } catch (workflowError) {
              console.error('Failed to update workflow:', workflowError);
            }
          }

          // Create payment record
          await supabase.from('payments').insert({
            org_id: invoiceRecord.organization_id,
            invoice_id: invoiceId,
            stripe_id: invoice.id,
            amount: invoiceRecord.amount,
            status: 'paid',
            payment_date: new Date().toISOString(),
            currency: invoice.currency
          });

          // After invoice paid notification
          const { data: orgData } = await supabase
            .from('organizations')
            .select('owner_id, profiles!organizations_owner_id_fkey(user_id, id)')
            .eq('id', invoiceRecord.organization_id)
            .single();

          if (orgData?.profiles) {
            // Create notification for provider
            await supabase.from('notifications').insert({
              user_id: orgData.profiles.user_id,
              profile_id: orgData.profiles.id,
              type: 'payment',
              title: '💰 Payment Received',
              body: `You received a payment of $${(invoiceRecord.amount / 100).toFixed(2)}`,
              action_url: '/provider/payments',
              metadata: { invoice_id: invoiceId, amount: invoiceRecord.amount }
            });

            // Send push notification
            try {
              await supabase.functions.invoke('send-push-notification', {
                headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
                body: {
                  userIds: [orgData.profiles.user_id],
                  title: '💰 Payment Received',
                  body: `You received a payment of $${(invoiceRecord.amount / 100).toFixed(2)}`,
                  url: '/provider/payments'
                }
              });
            } catch (err) {
              console.error('Failed to send push notification:', err);
            }
          }

          console.log(`Created payment record for invoice ${invoiceId}`);
        }
      }

      // Legacy payment handling
      if (orgId && !invoiceId) {
        await supabase
          .from('payments')
          .update({ 
            status: 'paid',
            payment_date: new Date().toISOString(),
          })
          .eq('stripe_id', invoice.id);

        if (invoice.metadata.job_id) {
          await supabase
            .from('bookings')
            .update({ status: 'completed' })
            .eq('id', invoice.metadata.job_id);
        }
      }
    }

    // Handle checkout session completed (for payment links)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoice_id;
      const orgId = session.metadata?.org_id;
      
      if (invoiceId && session.payment_status === 'paid') {
        console.log(`💳 Payment link completed for invoice ${invoiceId}`);
        
        // Update invoice status
        const { data: invoiceRecord } = await supabase
          .from('invoices')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_invoice_id: session.invoice || session.id
          })
          .eq('id', invoiceId)
          .select('job_id, organization_id, amount, client_id')
          .single();
        
        if (invoiceRecord) {
          // Create payment record
          await supabase.from('payments').insert({
            org_id: invoiceRecord.organization_id,
            invoice_id: invoiceId,
            stripe_id: session.id,
            amount: invoiceRecord.amount,
            status: 'paid',
            payment_date: new Date().toISOString(),
            currency: session.currency || 'usd'
          });
          
          // Update linked booking if exists
          if (invoiceRecord.job_id) {
            await supabase
              .from('bookings')
              .update({ 
                status: 'paid',
                payment_captured: true
              })
              .eq('id', invoiceRecord.job_id);
            
            console.log(`✅ Updated booking ${invoiceRecord.job_id} to paid`);

            // Update workflow
            try {
              await supabase.functions.invoke('workflow-orchestrator', {
                body: {
                  action: 'payment_received',
                  invoiceId: invoiceId,
                  bookingId: invoiceRecord.job_id,
                  providerOrgId: invoiceRecord.organization_id,
                  metadata: { amount: invoiceRecord.amount }
                }
              });
            } catch (workflowError) {
              console.error('Workflow update failed:', workflowError);
            }
          }
          
          // Send notification to provider
          const { data: orgData } = await supabase
            .from('organizations')
            .select('owner_id, profiles!organizations_owner_id_fkey(user_id, id)')
            .eq('id', invoiceRecord.organization_id)
            .single();

          if (orgData?.profiles) {
            await supabase.from('notifications').insert({
              user_id: orgData.profiles.user_id,
              profile_id: orgData.profiles.id,
              type: 'payment',
              title: '💰 Payment Received',
              body: `You received a payment of $${(invoiceRecord.amount / 100).toFixed(2)}`,
              action_url: '/provider/payments',
              metadata: { invoice_id: invoiceId, amount: invoiceRecord.amount }
            });

            // Send push notification
            try {
              await supabase.functions.invoke('send-push-notification', {
                headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
                body: {
                  userIds: [orgData.profiles.user_id],
                  title: '💰 Payment Received',
                  body: `You received a payment of $${(invoiceRecord.amount / 100).toFixed(2)}`,
                  url: '/provider/payments'
                }
              });
            } catch (err) {
              console.error('Failed to send push notification:', err);
            }
          }
          
          console.log(`✅ Payment link processed for invoice ${invoiceId}`);
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      await supabase
        .from('payments')
        .update({ status: 'open' })
        .eq('stripe_id', invoice.id);
    }

    if (event.type === 'invoice.voided') {
      const invoice = event.data.object;
      await supabase
        .from('payments')
        .update({ status: 'void' })
        .eq('stripe_id', invoice.id);
    }

    // Handle payment intent succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      if (paymentIntent.metadata.booking_id) {
        await supabase
          .from('bookings')
          .update({ status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', paymentIntent.metadata.booking_id);
        console.log('Booking confirmed:', paymentIntent.metadata.booking_id);
      }

      const { org_id, homeowner_id, job_id } = paymentIntent.metadata;

      if (org_id) {
        // Check if payment already exists using stripe_id or stripe_payment_intent_id
        const { data: existing } = await supabase
          .from('payments')
          .select('*')
          .or(`stripe_id.eq.${paymentIntent.id},stripe_payment_intent_id.eq.${paymentIntent.id}`)
          .maybeSingle();

        if (existing) {
          // Update existing payment
          await supabase
            .from('payments')
            .update({ 
              status: 'paid',
              captured: true,
              payment_date: new Date().toISOString(),
            })
            .eq('id', existing.id);

          // Create ledger entries
          const feeAmount = existing.application_fee_cents || 0;
          const transferAmount = existing.amount - feeAmount;

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

          // Update booking if job_id exists
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
          // Create new payment record from payment intent
          const charges = paymentIntent.charges?.data || [];
          const charge = charges[0];
          const applicationFeeAmount = charge?.application_fee_amount || 0;
          const stripeFeeAmount = charge?.balance_transaction ? 
            (await stripeGet(`balance_transactions/${charge.balance_transaction}`))?.fee || 0 : 0;

          await supabase
            .from('payments')
            .insert({
              org_id,
              stripe_payment_intent_id: paymentIntent.id,
              stripe_id: charge?.id || paymentIntent.id,
              amount: paymentIntent.amount,
              fee_amount: stripeFeeAmount,
              application_fee_cents: applicationFeeAmount,
              net_amount: paymentIntent.amount - stripeFeeAmount - applicationFeeAmount,
              currency: paymentIntent.currency,
              status: 'paid',
              payment_date: new Date().toISOString(),
              job_id: job_id || null,
              homeowner_profile_id: homeowner_id || null,
            });
        }
      }
    }

    // Handle transfers
    if (event.type === 'transfer.created') {
      const transfer = event.data.object;
      
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
      const charge = event.data.object;
      
      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('stripe_id', charge.payment_intent);
    }

    // Handle payouts
    if (event.type === 'payout.paid') {
      const payout = event.data.object;
      const stripeAccount = event.account;

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

    // Handle checkout session completed (subscriptions and payment links)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Handle subscription checkout
      if (session.mode === 'subscription' && session.subscription) {
        const { org_id, user_id, plan } = session.metadata;
        
        if (org_id && user_id) {
          // Fetch subscription details using REST API
          const subscription = await stripeGet(`subscriptions/${session.subscription}`);
          
          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: session.customer,
              stripe_subscription_id: subscription.id,
              plan: plan || 'beta',
              trial_ends_at: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
            })
            .eq('user_id', user_id);
          
          const config = getPlanConfig(plan || 'beta');
          await supabase
            .from('organizations')
            .update({
              plan: plan || 'beta',
              transaction_fee_pct: config.feePercent,
            })
            .eq('id', org_id);

          await supabase
            .from('provider_subscriptions')
            .upsert({
              provider_id: org_id,
              stripe_customer_id: session.customer,
              stripe_subscription_id: subscription.id,
              plan: plan || 'beta',
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            });

          console.log(`Trial started for org ${org_id}: ${plan} plan`);
        }
      }
      
      // Handle payment link checkout (invoices) - FIXED to work with Checkout Sessions
      if (session.mode === 'payment') {
        const { invoice_id, organization_id, org_id } = session.metadata || {};
        const actualOrgId = org_id || organization_id;
        
        if (invoice_id && actualOrgId) {
          console.log(`Processing payment link completion for invoice ${invoice_id}`);
          
          // Update invoice status
          const { data: invoiceRecord } = await supabase
            .from('invoices')
            .update({ 
              status: 'paid',
              paid_at: new Date().toISOString(),
              stripe_session_id: session.id
            })
            .eq('id', invoice_id)
            .select('job_id, organization_id, client_id, amount')
            .single();
          
          if (invoiceRecord) {
            // Update linked booking if exists
            if (invoiceRecord.job_id) {
              await supabase
                .from('bookings')
                .update({ 
                  status: 'confirmed',
                  payment_captured: true
                })
                .eq('id', invoiceRecord.job_id);
              
              console.log(`Updated booking ${invoiceRecord.job_id} to confirmed`);
            }

            // Calculate platform fee
            const platformFeePercent = await getDynamicPlatformFee(actualOrgId);
            const totalAmount = session.amount_total || 0;
            const applicationFeeAmount = Math.round(totalAmount * platformFeePercent);
            const netAmount = totalAmount - applicationFeeAmount;

            // Create payment record
            await supabase.from('payments').insert({
              org_id: invoiceRecord.organization_id,
              invoice_id: invoice_id,
              stripe_id: session.payment_intent || session.id,
              stripe_payment_intent_id: session.payment_intent,
              amount: totalAmount,
              application_fee_cents: applicationFeeAmount,
              fee_amount: 0,
              net_amount: netAmount,
              status: 'paid',
              captured: true,
              payment_date: new Date().toISOString(),
              currency: session.currency || 'usd',
              type: 'invoice'
            });

            // Create ledger entries for platform fee and provider transfer
            await insertLedgerEntry({
              occurred_at: new Date().toISOString(),
              type: 'fee',
              direction: 'credit',
              amount_cents: applicationFeeAmount,
              currency: session.currency || 'usd',
              stripe_ref: session.payment_intent || session.id,
              party: 'platform',
              provider_id: actualOrgId,
              metadata: { 
                invoice_id,
                fee_pct: platformFeePercent,
                source: 'payment_link'
              },
            });

            await insertLedgerEntry({
              occurred_at: new Date().toISOString(),
              type: 'transfer',
              direction: 'credit',
              amount_cents: netAmount,
              currency: session.currency || 'usd',
              stripe_ref: session.payment_intent || session.id,
              party: 'provider',
              provider_id: actualOrgId,
              metadata: { 
                invoice_id,
                source: 'payment_link'
              },
            });

            // Send notification to provider
            const { data: orgData } = await supabase
              .from('organizations')
              .select('owner_id, profiles!organizations_owner_id_fkey(user_id, id)')
              .eq('id', invoiceRecord.organization_id)
              .single();

            if (orgData?.profiles) {
              await supabase.from('notifications').insert({
                user_id: orgData.profiles.user_id,
                profile_id: orgData.profiles.id,
                type: 'payment',
                title: '💰 Payment Received',
                body: `You received a payment of $${(totalAmount / 100).toFixed(2)} from an invoice`,
                action_url: '/provider/payments',
                metadata: { invoice_id, amount: totalAmount }
              });

              try {
                await supabase.functions.invoke('send-push-notification', {
                  headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
                  body: {
                    userIds: [orgData.profiles.user_id],
                    title: '💰 Payment Received',
                    body: `You received a payment of $${(totalAmount / 100).toFixed(2)}`,
                    url: '/provider/payments'
                  }
                });
              } catch (err) {
                console.error('Failed to send push notification:', err);
              }
            }

            console.log(`✅ Created payment record for invoice ${invoice_id}: $${(totalAmount / 100).toFixed(2)}`);
          }
        }
      }
    }

    // Handle subscription updates
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const prevAttributes = event.data.previous_attributes;
      
      if (prevAttributes?.status === 'trialing' && subscription.status === 'active') {
        console.log(`Trial ended and converted to paid for subscription ${subscription.id}`);
      }
      
      const { data: providerSub } = await supabase
        .from('provider_subscriptions')
        .select('*, organizations(plan)')
        .eq('stripe_subscription_id', subscription.id)
        .single();
      
      if (providerSub) {
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
          
          const planOrder = ['free', 'beta', 'growth', 'pro', 'scale'];
          const oldIndex = planOrder.indexOf(oldPlan);
          const newIndex = planOrder.indexOf(newPlan);
          
          if (oldIndex !== newIndex) {
            console.log(`Provider ${providerSub.provider_id} plan change: ${oldPlan} -> ${newPlan}`);
            
            const newLimits = getPlanConfig(newPlan);
            
            await supabase
              .from('organizations')
              .update({
                plan: newPlan,
                team_limit: newLimits.teamLimit,
                transaction_fee_pct: newLimits.feePercent,
              })
              .eq('id', providerSub.provider_id);
          }
        }
      }
    }

    // Handle subscription deleted/canceled
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      
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
      const dispute = event.data.object;
      
      await supabase
        .from('disputes')
        .insert({
          stripe_dispute_id: dispute.id,
          charge_id: dispute.charge,
          amount: dispute.amount,
          currency: dispute.currency,
          reason: dispute.reason,
          status: dispute.status,
          evidence_due_by: dispute.evidence_details?.due_by 
            ? new Date(dispute.evidence_details.due_by * 1000).toISOString() 
            : null,
          created_at: new Date(dispute.created * 1000).toISOString(),
        });

      await supabase
        .from('payments')
        .update({ status: 'disputed' })
        .eq('stripe_id', dispute.charge);

      console.log(`Dispute created: ${dispute.id} for charge ${dispute.charge}`);
    }

    if (event.type === 'charge.dispute.updated') {
      const dispute = event.data.object;
      
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
      const dispute = event.data.object;
      
      await supabase
        .from('disputes')
        .update({
          status: dispute.status,
          resolved_at: new Date().toISOString(),
        })
        .eq('stripe_dispute_id', dispute.id);

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
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false,
        code: error.code || 'WEBHOOK_ERROR',
        message: error.message || 'Unknown webhook processing error',
        type: error.type,
      }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } 
      }
    );
  }
});
