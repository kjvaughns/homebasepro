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

    // Handle invoice events
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const orgId = invoice.metadata.org_id;

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

    // Handle payment intent events
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orgId = paymentIntent.metadata.org_id;

      if (orgId) {
        // Check if payment already exists
        const { data: existing } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_id', paymentIntent.id)
          .single();

        if (existing) {
          await supabase
            .from('payments')
            .update({ 
              status: 'paid',
              payment_date: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          // Create new payment record
          await supabase
            .from('payments')
            .insert({
              org_id: orgId,
              client_id: paymentIntent.metadata.client_id || null,
              job_id: paymentIntent.metadata.job_id || null,
              type: paymentIntent.metadata.type || 'payment_link',
              status: 'paid',
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              stripe_id: paymentIntent.id,
              payment_date: new Date().toISOString(),
              fee_amount: 0,
              fee_percent: 0,
              meta: paymentIntent.metadata,
            });
        }
      }
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