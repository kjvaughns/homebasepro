import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { stripePost, stripeGet, formatStripeError } from "../_shared/stripe-fetch.ts";
import { logPaymentError } from "../_shared/error-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabaseClient;
  let orgId: string | null = null;

  try {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      clientEmail,
      clientName,
      clientPhone,
      lineItems,
      dueDate,
      orgId: requestOrgId,
      stripeAccountId,
      invoiceId
    } = await req.json();

    orgId = requestOrgId;

    console.log('🧾 Creating Stripe Invoice:', { 
      orgId, 
      stripeAccountId, 
      clientEmail, 
      itemCount: lineItems?.length 
    });

    // Validate inputs
    if (!lineItems || lineItems.length === 0) {
      throw new Error('Invoice must have at least one line item');
    }

    const total = lineItems.reduce((sum: number, item: any) => 
      sum + ((item.quantity || 1) * (item.rate || 0)), 0
    );

    // Stripe minimum amount check (50 cents USD)
    if (total < 0.50) {
      throw new Error(`Invoice total ($${total.toFixed(2)}) is below Stripe's minimum of $0.50 USD`);
    }

    for (const item of lineItems) {
      if (!item.quantity || item.quantity < 1) {
        throw new Error(`Line item "${item.description}" must have quantity >= 1`);
      }
      if (!item.rate || item.rate <= 0) {
        throw new Error(`Line item "${item.description}" must have rate > 0`);
      }
    }

    // Validate Stripe Connect account with canonical endpoint
    console.log('🔍 Validating Stripe account:', stripeAccountId);
    let account;
    try {
      account = await stripeGet(`accounts/${stripeAccountId}`);
    } catch (err: any) {
      console.error('❌ Account validation failed:', err.message);
      throw new Error(`Stripe account validation failed: ${err.message}`);
    }
    
    if (!account.charges_enabled) {
      throw new Error('This Stripe Connect account cannot process charges yet. Please complete onboarding in Settings > Payments.');
    }

    console.log('✅ Account validated:', {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled
    });

    // Create or get customer
    console.log('👤 Finding or creating customer:', clientEmail);
    let customer;
    
    // Check if customer already exists in our DB
    const { data: existingInvoice } = await supabaseClient
      .from('invoices')
      .select('stripe_customer_id')
      .eq('client_email', clientEmail)
      .eq('org_id', orgId)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .single();

    if (existingInvoice?.stripe_customer_id) {
      try {
        customer = await stripeGet(
          `customers/${existingInvoice.stripe_customer_id}`,
          stripeAccountId
        );
        console.log('✅ Found existing customer:', customer.id);
      } catch (err) {
        console.log('⚠️ Existing customer not found in Stripe, creating new one');
        customer = null;
      }
    }

    if (!customer) {
      customer = await stripePost(
        'customers',
        {
          email: clientEmail,
          name: clientName,
          phone: clientPhone,
          metadata: {
            org_id: orgId,
            source: 'homebase_invoice'
          }
        },
        stripeAccountId
      );
      console.log('✅ Created new customer:', customer.id);
    }

    console.log('📝 Creating payment link with', lineItems.length, 'items');

    // Create prices for each line item
    const priceIds = [];
    for (const item of lineItems) {
      const price = await stripePost(
        'prices',
        {
          unit_amount: Math.round(item.rate * 100), // Convert to cents
          currency: 'usd',
          product_data: {
            name: item.description
          }
        },
        stripeAccountId
      );
      priceIds.push({ price: price.id, quantity: item.quantity || 1 });
      console.log('✅ Created price:', price.id, 'for', item.description);
    }

    // Get platform fee based on provider's plan
    const { data: org } = await supabaseClient
      .from('organizations')
      .select('plan, transaction_fee_pct')
      .eq('id', orgId)
      .single();

    const platformFeePercent = org?.transaction_fee_pct || 0.05; // Default 5%
    const platformFeeAmount = Math.round(total * 100 * platformFeePercent); // Convert to cents

    console.log('💰 Platform fee calculation:', {
      total,
      platformFeePercent: (platformFeePercent * 100).toFixed(1) + '%',
      platformFeeAmount
    });

    // Create payment link with all line items and application fee
    const paymentLink = await stripePost(
      'payment_links',
      {
        line_items: priceIds,
        after_completion: {
          type: 'hosted_confirmation'
        },
        invoice_creation: {
          enabled: true
        },
        application_fee_amount: platformFeeAmount,
        metadata: {
          invoice_id: invoiceId,
          org_id: orgId,
          source: 'homebase',
          platform_fee: platformFeeAmount
        }
      },
      stripeAccountId
    );

    console.log('✅ Payment link created:', paymentLink.id);
    console.log('🔗 Payment URL:', paymentLink.url);

    // Update database with Stripe payment link data
    await supabaseClient
      .from('invoices')
      .update({
        stripe_payment_link_id: paymentLink.id,
        stripe_hosted_url: paymentLink.url,
        stripe_customer_id: customer.id,
        email_status: 'pending'
      })
      .eq('id', invoiceId);

    return new Response(
      JSON.stringify({
        success: true,
        stripe_payment_link_id: paymentLink.id,
        hosted_invoice_url: paymentLink.url,
        payment_link_url: paymentLink.url,
        customer_id: customer.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const err = error as any;
    console.error('❌ Error creating Stripe invoice:', {
      message: err?.message,
      stack: err?.stack,
      stripeError: err?.stripeError,
      type: err?.type,
      code: err?.code,
      param: err?.param
    });
    
    const stripeError = formatStripeError(err);
    const errorMessage = stripeError.message || err?.message || 'Failed to create invoice';
    
    // Log error to database if we have supabase client
    if (supabaseClient && orgId) {
      try {
        await logPaymentError(
          supabaseClient,
          orgId,
          'create-stripe-invoice',
          { invoiceId: err?.invoiceId, orgId },
          errorMessage,
          stripeError
        );
      } catch (logErr) {
        console.error('Failed to log error:', logErr);
      }
    }
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: {
          type: stripeError.type,
          code: stripeError.code,
          param: stripeError.param,
          decline_code: stripeError.decline_code
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
