import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('stripe');
    if (!stripeKey) throw new Error('Stripe key not configured');

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!org || !org.stripe_account_id) {
      throw new Error('Stripe account not connected');
    }

    const { action, ...payload } = await req.json();

    // Create Stripe customer for client
    if (action === 'create-customer') {
      const { clientId } = payload;
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (!client) throw new Error('Client not found');

      const customer = await stripe.customers.create(
        {
          email: client.email,
          name: client.name,
          phone: client.phone,
          metadata: { client_id: clientId },
        },
        { stripeAccount: org.stripe_account_id }
      );

      return new Response(
        JSON.stringify({ customerId: customer.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payment link
    if (action === 'payment-link') {
      const { clientId, jobId, amount, description, type } = payload;

      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (!client) throw new Error('Client not found');

      // Create product and price
      const product = await stripe.products.create(
        {
          name: description || `Payment for ${client.name}`,
        },
        { stripeAccount: org.stripe_account_id }
      );

      const price = await stripe.prices.create(
        {
          product: product.id,
          unit_amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
        },
        { stripeAccount: org.stripe_account_id }
      );

      const paymentLink = await stripe.paymentLinks.create(
        {
          line_items: [{ price: price.id, quantity: 1 }],
          metadata: {
            org_id: org.id,
            client_id: clientId,
            job_id: jobId || '',
            type: type || 'payment_link',
          },
        },
        { stripeAccount: org.stripe_account_id }
      );

      // Save to database
      const { data: payment } = await supabase
        .from('payments')
        .insert({
          org_id: org.id,
          client_id: clientId,
          job_id: jobId,
          type: type || 'payment_link',
          status: 'open',
          amount: Math.round(amount * 100),
          currency: 'usd',
          url: paymentLink.url,
          stripe_id: paymentLink.id,
          meta: {
            client_name: client.name,
            description,
          },
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({ id: payment.id, url: paymentLink.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create invoice
    if (action === 'invoice') {
      const { clientId, jobId, lineItems, dueDate, notes, sendNow } = payload;

      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (!client) throw new Error('Client not found');

      // Get or create customer
      let customerId = client.meta?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create(
          {
            email: client.email,
            name: client.name,
            phone: client.phone,
          },
          { stripeAccount: org.stripe_account_id }
        );
        customerId = customer.id;

        await supabase
          .from('clients')
          .update({ meta: { ...client.meta, stripe_customer_id: customerId } })
          .eq('id', clientId);
      }

      // Create invoice
      const invoice = await stripe.invoices.create(
        {
          customer: customerId,
          auto_advance: sendNow,
          collection_method: 'send_invoice',
          days_until_due: dueDate ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 30,
          metadata: {
            org_id: org.id,
            client_id: clientId,
            job_id: jobId || '',
          },
          footer: notes,
        },
        { stripeAccount: org.stripe_account_id }
      );

      // Add line items
      for (const item of lineItems) {
        await stripe.invoiceItems.create(
          {
            customer: customerId,
            invoice: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_amount: Math.round(item.unitPrice * 100),
          },
          { stripeAccount: org.stripe_account_id }
        );
      }

      // Finalize invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(
        invoice.id,
        { stripeAccount: org.stripe_account_id }
      );

      if (sendNow) {
        await stripe.invoices.sendInvoice(invoice.id, { stripeAccount: org.stripe_account_id });
      }

      // Save to database
      const totalAmount = lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
      const { data: payment } = await supabase
        .from('payments')
        .insert({
          org_id: org.id,
          client_id: clientId,
          job_id: jobId,
          type: 'invoice',
          status: finalizedInvoice.status,
          amount: Math.round(totalAmount * 100),
          currency: 'usd',
          url: finalizedInvoice.hosted_invoice_url,
          stripe_id: invoice.id,
          meta: {
            client_name: client.name,
            line_items: lineItems,
            notes,
          },
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({ id: payment.id, url: finalizedInvoice.hosted_invoice_url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refund
    if (action === 'refund') {
      const { paymentId, amount, reason } = payload;

      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (!payment) throw new Error('Payment not found');

      // Get the charge or payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(
        payment.stripe_id,
        { stripeAccount: org.stripe_account_id }
      );

      const refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntent.id,
          amount: amount ? Math.round(amount * 100) : undefined,
          reason: reason || 'requested_by_customer',
        },
        { stripeAccount: org.stripe_account_id }
      );

      // Update payment status
      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({ success: true, refundId: refund.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Forecast
    if (action === 'forecast') {
      const { horizonDays = 7 } = payload;

      // Get open invoices
      const { data: openPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('org_id', org.id)
        .in('status', ['open', 'pending']);

      const openTotal = openPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Get subscription renewals in horizon
      const { data: subscriptions } = await supabase
        .from('client_subscriptions')
        .select('*, service_plans!inner(price)')
        .eq('status', 'active')
        .gte('next_billing_date', new Date().toISOString())
        .lte('next_billing_date', new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString());

      const subscriptionTotal = subscriptions?.reduce((sum, s) => sum + (s.service_plans.price || 0), 0) || 0;

      return new Response(
        JSON.stringify({
          expectedRevenue: (openTotal + subscriptionTotal) / 100,
          openInvoices: openTotal / 100,
          subscriptionRenewals: subscriptionTotal / 100,
          horizonDays,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Payments API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});