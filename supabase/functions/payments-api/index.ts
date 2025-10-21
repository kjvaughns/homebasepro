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

    // Helper function to get fee amount based on provider plan
    const getFeeAmount = (provider: any, jobAmount: number) => {
      const feePercent = provider.transaction_fee_pct || 0.08;
      return Math.round(jobAmount * feePercent);
    };

    // Helper function to insert ledger entry
    const insertLedgerEntry = async (entry: any) => {
      await supabase.from('ledger_entries').insert(entry);
    };

    // CREATE SETUP INTENT (For saving payment method)
    if (action === 'create-setup-intent') {
      const { profileId, email, name } = payload;

      // Check if customer exists
      let { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', profileId)
        .single();

      let customerId = customer?.stripe_customer_id;

      // Create customer if doesn't exist
      if (!customerId) {
        const stripeCustomer = await stripe.customers.create({
          email,
          name,
          metadata: { profile_id: profileId },
        });
        customerId = stripeCustomer.id;

        await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            profile_id: profileId,
            stripe_customer_id: customerId,
          });
      }

      // Create SetupIntent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata: { profile_id: profileId },
      });

      return new Response(
        JSON.stringify({ clientSecret: setupIntent.client_secret }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ATTACH PAYMENT METHOD (After SetupIntent confirmation)
    if (action === 'attach-payment-method') {
      const { profileId, paymentMethodId } = payload;

      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', profileId)
        .single();

      if (!customer) throw new Error('Customer not found');

      // Set as default payment method
      await stripe.customers.update(customer.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Update in database
      await supabase
        .from('customers')
        .update({ default_payment_method: paymentMethodId })
        .eq('profile_id', profileId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // HOMEOWNER PAYMENT INTENT (Destination Charge)
    if (action === 'homeowner-payment-intent') {
      const { jobId, homeownerId, amount, captureNow = true, tip = 0 } = payload;

      // Get homeowner customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', homeownerId)
        .single();

      if (!customer) {
        throw new Error('Customer not found - homeowner needs to add payment method first');
      }

      // CRITICAL: Re-fetch org record to ensure fee is current
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('transaction_fee_pct')
        .eq('id', org.id)
        .single();

      if (!currentOrg) throw new Error('Organization not found');

      // Calculate fee with current rate
      const totalAmount = Math.round((amount + tip) * 100);
      const feeAmount = getFeeAmount(currentOrg, totalAmount);

      // Create destination charge with application fee
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        customer: customer.stripe_customer_id,
        payment_method: customer.default_payment_method,
        confirm: false, // Will be confirmed on frontend with Elements
        application_fee_amount: feeAmount,
        transfer_data: { destination: org.stripe_account_id },
        transfer_group: `job_${jobId}`,
        capture_method: captureNow ? 'automatic' : 'manual',
        metadata: {
          org_id: org.id,
          homeowner_id: homeownerId,
          job_id: jobId,
          tip_amount: tip,
        },
      });

      // Insert payment record
      const { data: payment } = await supabase
        .from('payments')
        .insert({
          org_id: org.id,
          homeowner_profile_id: homeownerId,
          job_id: jobId,
          type: 'job_payment',
          status: captureNow ? 'pending' : 'authorized',
          amount: totalAmount,
          currency: 'usd',
          stripe_id: paymentIntent.id,
          transfer_destination: org.stripe_account_id,
          application_fee_cents: feeAmount,
          fee_pct_at_time: org.transaction_fee_pct,
          captured: false,
          transfer_group: `job_${jobId}`,
          payment_method: customer.default_payment_method,
          meta: { tip_amount: tip },
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          paymentId: payment.id,
          clientSecret: paymentIntent.client_secret,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CAPTURE PAYMENT (After job completion)
    if (action === 'capture-payment') {
      const { paymentId } = payload;

      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('org_id', org.id)
        .single();

      if (!payment) throw new Error('Payment not found');
      if (payment.captured) throw new Error('Payment already captured');

      await stripe.paymentIntents.capture(payment.stripe_id, {
        stripeAccount: org.stripe_account_id,
      });

      await supabase
        .from('payments')
        .update({
          status: 'paid',
          captured: true,
          payment_date: new Date().toISOString(),
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // INSTANT PAYOUT
    if (action === 'instant-payout') {
      const { amount } = payload;

      const payout = await stripe.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency: 'usd',
        },
        { stripeAccount: org.stripe_account_id }
      );

      await insertLedgerEntry({
        occurred_at: new Date().toISOString(),
        type: 'payout',
        direction: 'debit',
        amount_cents: Math.round(amount * 100),
        currency: 'usd',
        stripe_ref: payout.id,
        party: 'provider',
        provider_id: org.id,
        metadata: { type: 'instant' },
      });

      return new Response(
        JSON.stringify({ success: true, payoutId: payout.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PROVIDER BALANCE
    if (action === 'provider-balance') {
      const balance = await stripe.balance.retrieve({
        stripeAccount: org.stripe_account_id,
      });

      return new Response(
        JSON.stringify({
          available: balance.available[0]?.amount || 0,
          pending: balance.pending[0]?.amount || 0,
          currency: balance.available[0]?.currency || 'usd',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE HOMEOWNER CUSTOMER
    if (action === 'create-homeowner-customer') {
      const { profileId, email, name, paymentMethodId } = payload;

      // Create Stripe customer on platform account
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { profile_id: profileId },
      });

      // Attach payment method
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });

        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Save to database
      await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          profile_id: profileId,
          stripe_customer_id: customer.id,
          default_payment_method: paymentMethodId,
        });

      return new Response(
        JSON.stringify({ customerId: customer.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe customer for client (legacy - for provider-side clients)
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