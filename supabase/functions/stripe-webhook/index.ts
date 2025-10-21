import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('stripe');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeKey || !webhookSecret) {
      throw new Error('Stripe configuration missing');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No signature');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Webhook event:', event.type);

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
      
      await supabase
        .from('organizations')
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          stripe_onboarding_complete: account.charges_enabled && account.payouts_enabled,
        })
        .eq('stripe_account_id', account.id);
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
          // CRITICAL: Update organization with new plan tier and limits
          const planConfig = {
            free: { team_limit: 0, transaction_fee_pct: 0.08 },
            growth: { team_limit: 3, transaction_fee_pct: 0.025 },
            pro: { team_limit: 10, transaction_fee_pct: 0.02 },
            scale: { team_limit: 25, transaction_fee_pct: 0.02 },
          };
          
          const config = planConfig[subscription.plan as keyof typeof planConfig];
          
          if (config) {
            await supabase
              .from('organizations')
              .update({
                plan: subscription.plan,
                team_limit: config.team_limit,
                transaction_fee_pct: config.transaction_fee_pct,
              })
              .eq('id', subscription.provider_id);
            
            console.log(`Synced ${subscription.plan} plan to org ${subscription.provider_id}`);
          }

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
      
      // BUG-002 FIX: Confirm booking when payment succeeds
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

    // Handle subscription updates (downgrades/upgrades)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      
      const { data: providerSub } = await supabase
        .from('provider_subscriptions')
        .select('*, organizations(plan)')
        .eq('stripe_subscription_id', subscription.id)
        .single();
      
      if (providerSub && providerSub.organizations) {
        const oldPlan = (providerSub.organizations as any).plan;
        const newPlan = providerSub.plan;
        
        // Check if plan changed (downgrade or upgrade)
        const planOrder = ['free', 'growth', 'pro', 'scale'];
        const oldIndex = planOrder.indexOf(oldPlan);
        const newIndex = planOrder.indexOf(newPlan);
        
        if (oldIndex !== newIndex) {
          console.log(`Provider ${providerSub.provider_id} plan change: ${oldPlan} -> ${newPlan}`);
          
          // Get new limits
          const planConfig = {
            free: { team_limit: 0, transaction_fee_pct: 0.08 },
            growth: { team_limit: 3, transaction_fee_pct: 0.025 },
            pro: { team_limit: 10, transaction_fee_pct: 0.02 },
            scale: { team_limit: 25, transaction_fee_pct: 0.02 },
          };
          
          const newLimits = planConfig[newPlan as keyof typeof planConfig];
          
          if (newLimits) {
            // Update org with new plan and limits
            await supabase
              .from('organizations')
              .update({
                plan: newPlan,
                team_limit: newLimits.team_limit,
                transaction_fee_pct: newLimits.transaction_fee_pct,
              })
              .eq('id', providerSub.provider_id);
            
            // If downgrading, check if over team limit
            if (newIndex < oldIndex) {
              const { count } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', providerSub.provider_id)
                .in('status', ['invited', 'active']);
              
              if (count && count > newLimits.team_limit) {
                console.warn(`⚠️  Provider ${providerSub.provider_id} has ${count} team members but limit is now ${newLimits.team_limit}`);
                // Future: Send email notification to provider
                // Future: Create admin notification for manual review
              }
            }
          }
        }
      }
    }

    // Handle disputes
    if (event.type.startsWith('charge.dispute.')) {
      const dispute = event.data.object as Stripe.Dispute;
      const stripeAccount = event.account;

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('stripe_account_id', stripeAccount)
        .single();

      if (org) {
        // Find related payment
        const { data: payment } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_id', dispute.payment_intent)
          .single();

        await supabase
          .from('disputes')
          .upsert({
            org_id: org.id,
            payment_id: payment?.id,
            stripe_dispute_id: dispute.id,
            charge_id: dispute.charge,
            amount: dispute.amount / 100,
            currency: dispute.currency,
            status: dispute.status,
            reason: dispute.reason,
            due_by: new Date((dispute as any).evidence_details?.due_by * 1000).toISOString(),
            evidence: dispute.evidence || {},
          }, {
            onConflict: 'stripe_dispute_id'
          });

        // Update payment status
        if (payment) {
          await supabase
            .from('payments')
            .update({ status: 'disputed' })
            .eq('id', payment.id);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});