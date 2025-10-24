import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { stripePost, stripeGet } from "../_shared/stripe-fetch.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
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
      orgId,
      stripeAccountId,
      invoiceId
    } = await req.json();

    console.log('Creating Stripe invoice:', { invoiceId, orgId, clientEmail });

    // Validate Stripe Connect account
    try {
      const account = await stripeGet('account', stripeAccountId);
      console.log('Connect account status:', {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      });
      
      if (!account.charges_enabled) {
        throw new Error('Stripe Connect account is not enabled for charges. Please complete onboarding.');
      }
    } catch (error) {
      console.error('Connect account validation failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid Stripe Connect account: ${errorMsg}`);
    }

    // 1. Create or retrieve Stripe customer
    let customer;
    
    // Check if customer already exists
    const { data: existingInvoice } = await supabaseClient
      .from('invoices')
      .select('stripe_customer_id')
      .eq('client_email', clientEmail)
      .eq('org_id', orgId)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .single();

    if (existingInvoice?.stripe_customer_id) {
      // Retrieve existing customer - use GET not POST
      customer = await stripeGet(
        `customers/${existingInvoice.stripe_customer_id}`,
        stripeAccountId
      );
      console.log('Using existing customer:', customer.id);
    } else {
      // Create new customer
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
      console.log('Created new customer:', customer.id);
    }

    // 2. Create invoice items for each line item
    for (const item of lineItems) {
      await stripePost(
        'invoiceitems',
        {
          customer: customer.id,
          unit_amount: Math.round(item.rate * 100), // Convert to cents
          quantity: item.quantity || 1,
          currency: 'usd',
          description: item.description
        },
        stripeAccountId
      );
    }

    console.log('Created invoice items');

    // 3. Calculate days until due
    const daysUntilDue = dueDate 
      ? Math.max(1, Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 30;

    // 4. Create the invoice
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

    console.log('Created Stripe invoice:', invoice.id);

    // 5. Finalize the invoice to generate payment URL
    const finalizedInvoice = await stripePost(
      `invoices/${invoice.id}/finalize`,
      {},
      stripeAccountId
    );

    console.log('Finalized invoice:', {
      id: finalizedInvoice.id,
      hosted_url: finalizedInvoice.hosted_invoice_url,
      pdf: finalizedInvoice.invoice_pdf
    });

    // 6. Update our database with Stripe invoice data
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
    console.error('Full error details:', {
      message: err?.message,
      stack: err?.stack,
      stripeError: err?.stripeError,
      type: err?.type,
      code: err?.code,
      param: err?.param
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: {
          type: err?.type,
          code: err?.code,
          param: err?.param
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
