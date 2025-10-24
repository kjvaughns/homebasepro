import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { stripePost, stripeGet, formatStripeError } from "../_shared/stripe-fetch.ts";
import { logPaymentError } from "../payments-api/error-logger.ts";

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

    // Calculate days until due (minimum 1 day)
    const daysUntilDue = dueDate 
      ? Math.max(1, Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 30;

    console.log('📝 Creating invoice draft with', lineItems.length, 'items');

    // Create the invoice in draft mode first
    const invoice = await stripePost(
      'invoices',
      {
        customer: customer.id,
        collection_method: 'send_invoice',
        days_until_due: daysUntilDue,
        auto_advance: true,
        metadata: {
          invoice_id: invoiceId,
          org_id: orgId,
          source: 'homebase'
        }
      },
      stripeAccountId
    );

    console.log('✅ Invoice draft created:', invoice.id);

    // Attach line items to the specific invoice
    for (const item of lineItems) {
      await stripePost(
        'invoiceitems',
        {
          customer: customer.id,
          invoice: invoice.id, // Attach to this specific invoice
          unit_amount: Math.round(item.rate * 100), // Convert to cents
          quantity: item.quantity || 1,
          currency: 'usd',
          description: item.description
        },
        stripeAccountId
      );
    }

    console.log('✅ All line items attached');

    // Finalize the invoice to generate payment link
    console.log('🔒 Finalizing invoice...');
    const finalizedInvoice = await stripePost(
      `invoices/${invoice.id}/finalize`,
      {},
      stripeAccountId
    );

    console.log('✅ Invoice finalized:', finalizedInvoice.id);
    console.log('🔗 Payment URL:', finalizedInvoice.hosted_invoice_url);

    // Update database with Stripe invoice data
    await supabaseClient
      .from('invoices')
      .update({
        stripe_invoice_id: finalizedInvoice.id,
        stripe_hosted_url: finalizedInvoice.hosted_invoice_url,
        stripe_customer_id: customer.id,
        pdf_url: finalizedInvoice.invoice_pdf,
        email_status: 'pending'
      })
      .eq('id', invoiceId);

    return new Response(
      JSON.stringify({
        success: true,
        stripe_invoice_id: finalizedInvoice.id,
        hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
        invoice_pdf: finalizedInvoice.invoice_pdf,
        amount_due: finalizedInvoice.amount_due,
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
