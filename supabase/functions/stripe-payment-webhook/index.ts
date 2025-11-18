import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getStripeSecret, resolveWebhookSecrets } from "../_shared/env.ts";

const stripeSecretKey = getStripeSecret();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'stripe-signature, content-type',
      },
    });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found');
      return new Response(JSON.stringify({ error: 'No signature' }), { status: 400 });
    }

    const body = await req.text();
    const { connect: webhookSecret } = resolveWebhookSecrets();
    
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), { status: 500 });
    }

    // Verify webhook signature
    const event = await verifyWebhookSignature(body, signature, webhookSecret);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);

        // Find the invoice
        const { data: invoice, error: fetchError } = await supabase
          .from('invoices')
          .select('id, organization_id, net_to_provider_cents')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (fetchError || !invoice) {
          console.error('Error finding invoice:', fetchError);
          break;
        }

        // Update invoice status
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', invoice.id);

        if (updateError) {
          console.error('Error updating invoice:', updateError);
          break;
        }

        // Update organization lifetime revenue
        const { data: org } = await supabase
          .from('organizations')
          .select('lifetime_revenue')
          .eq('id', invoice.organization_id)
          .single();

        if (org) {
          const newRevenue = (org.lifetime_revenue || 0) + (invoice.net_to_provider_cents || 0);
          await supabase
            .from('organizations')
            .update({ lifetime_revenue: newRevenue })
            .eq('id', invoice.organization_id);
          
          console.log(`Updated org revenue: ${newRevenue} cents`);
        }
        
        break;
      }

      case 'payment_intent.processing': {
        const paymentIntent = event.data.object;
        console.log('Payment processing:', paymentIntent.id);

        await supabase
          .from('invoices')
          .update({ status: 'processing' })
          .eq('stripe_payment_intent_id', paymentIntent.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        console.log('Charge refunded:', charge.id);

        // Update related invoice
        const { data: payment } = await supabase
          .from('payments')
          .select('id, invoice_id')
          .eq('stripe_charge_id', charge.id)
          .single();

        if (payment?.invoice_id) {
          await supabase
            .from('invoices')
            .update({ 
              status: 'refunded',
              refunded_at: new Date().toISOString(),
            })
            .eq('id', payment.invoice_id);
        }
        break;
      }

      case 'payout.paid':
      case 'payout.failed': {
        const payout = event.data.object;
        console.log('Payout event:', event.type, payout.id);

        await supabase
          .from('stripe_payouts')
          .upsert({
            stripe_payout_id: payout.id,
            organization_id: payout.metadata?.organization_id || null,
            amount_cents: payout.amount,
            currency: payout.currency,
            status: payout.status,
            arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
            created_at: new Date(payout.created * 1000).toISOString(),
          }, {
            onConflict: 'stripe_payout_id',
          });
        break;
      }
    }

    // Log webhook event
    await supabase
      .from('stripe_webhook_events')
      .insert({
        event_type: event.type,
        event_id: event.id,
        data: event.data,
        processed_at: new Date().toISOString(),
      });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook processing failed' }),
      { status: 400 }
    );
  }
});

async function verifyWebhookSignature(payload: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const parts = signature.split(',');
  
  let timestamp = '';
  let signatures: string[] = [];
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(expectedSig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (!signatures.includes(expectedHex)) {
    throw new Error('Invalid signature');
  }

  return JSON.parse(payload);
}
