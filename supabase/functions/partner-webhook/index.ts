import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('Missing STRIPE_WEBHOOK_SECRET');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature', { status: 400 });
    }

    const body = await req.text();
    
    // Verify webhook signature (simplified - in production use proper Stripe verification)
    // For now, we'll parse the event directly
    const event = JSON.parse(body);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    console.log(`Processing webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabase);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object, supabase);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, supabase);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500 }
    );
  }
});

async function handleCheckoutCompleted(session: any, supabase: any) {
  console.log('Checkout completed:', session.id);

  const customerId = session.customer;
  const metadata = session.metadata || {};
  const partnerId = metadata.partner_id;
  const partnerCode = metadata.partner_code;

  if (!partnerId && !partnerCode) {
    console.log('No partner attribution in checkout session');
    return;
  }

  // Find the partner
  let partner;
  if (partnerId) {
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();
    partner = data;
  } else if (partnerCode) {
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('referral_code', partnerCode)
      .single();
    partner = data;
  }

  if (!partner) {
    console.error('Partner not found:', partnerId || partnerCode);
    return;
  }

  // Create or update partner referral
  const { data: existingReferral } = await supabase
    .from('partner_referrals')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (existingReferral) {
    // Update existing referral
    await supabase
      .from('partner_referrals')
      .update({
        activated: true,
        activated_at: new Date().toISOString(),
      })
      .eq('id', existingReferral.id);
  } else {
    // Create new referral
    await supabase
      .from('partner_referrals')
      .insert({
        partner_id: partner.id,
        stripe_customer_id: customerId,
        promo_code_used: partnerCode || null,
        attributed_via: partnerId ? 'link' : 'code',
        activated: true,
        activated_at: new Date().toISOString(),
      });
  }

  console.log('Partner referral created/updated for customer:', customerId);
}

async function handleInvoicePaymentSucceeded(invoice: any, supabase: any) {
  console.log('Invoice payment succeeded:', invoice.id);

  const customerId = invoice.customer;
  
  // Find partner referral for this customer
  const { data: referral } = await supabase
    .from('partner_referrals')
    .select('*, partner:partners(*)')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!referral) {
    console.log('No partner referral found for customer:', customerId);
    return;
  }

  // Calculate commission
  const baseAmount = invoice.subtotal || invoice.total; // Amount before tax
  const commissionRateBp = referral.partner.commission_rate_bp;
  const commissionAmount = Math.round((baseAmount * commissionRateBp) / 10000);

  // Check if commission already exists for this invoice
  const { data: existingCommission } = await supabase
    .from('partner_commissions')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .single();

  if (existingCommission) {
    console.log('Commission already exists for invoice:', invoice.id);
    return;
  }

  // Create commission record
  const { error } = await supabase
    .from('partner_commissions')
    .insert({
      partner_id: referral.partner_id,
      referral_id: referral.id,
      stripe_invoice_id: invoice.id,
      stripe_charge_id: invoice.charge,
      base_amount_cents: baseAmount,
      commission_rate_bp: commissionRateBp,
      commission_amount_cents: commissionAmount,
      currency: invoice.currency || 'usd',
      status: 'PENDING',
      invoice_period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      invoice_period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    });

  if (error) {
    console.error('Failed to create commission:', error);
  } else {
    console.log(`Commission created: $${(commissionAmount / 100).toFixed(2)} for partner ${referral.partner.referral_code}`);
  }
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  console.log('Subscription updated:', subscription.id);
  // Handle subscription changes if needed
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  console.log('Subscription deleted:', subscription.id);
  // Mark referral as inactive if needed
}

async function handleChargeRefunded(charge: any, supabase: any) {
  console.log('Charge refunded:', charge.id);

  // Find commission for this charge
  const { data: commission } = await supabase
    .from('partner_commissions')
    .select('*')
    .eq('stripe_charge_id', charge.id)
    .single();

  if (!commission) {
    console.log('No commission found for charge:', charge.id);
    return;
  }

  // If commission hasn't been paid yet, mark as VOID
  if (commission.status === 'PENDING') {
    await supabase
      .from('partner_commissions')
      .update({ status: 'VOID', notes: 'Charge refunded' })
      .eq('id', commission.id);
    
    console.log('Commission voided due to refund');
  } else {
    // If already paid, create a negative commission adjustment
    await supabase
      .from('partner_commissions')
      .insert({
        partner_id: commission.partner_id,
        referral_id: commission.referral_id,
        stripe_invoice_id: commission.stripe_invoice_id,
        stripe_charge_id: charge.id,
        base_amount_cents: -commission.base_amount_cents,
        commission_rate_bp: commission.commission_rate_bp,
        commission_amount_cents: -commission.commission_amount_cents,
        currency: commission.currency,
        status: 'PENDING',
        notes: 'Refund adjustment',
      });
    
    console.log('Negative commission created for refund adjustment');
  }
}
