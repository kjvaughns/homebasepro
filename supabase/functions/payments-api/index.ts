import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';
import { logPaymentError } from './error-logger.ts';
import { getPlatformFeePercent, getAppUrl } from '../_shared/env.ts';
import { stripePost, stripeGet, formatStripeError } from '../_shared/stripe-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT (optional - verify_jwt = true validates it)
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser;
    }

    console.log('🔐 Auth header present:', !!authHeader);
    console.log('👤 User authenticated:', !!user, user?.id);

    const requestBody = await req.json();
    const { action, ...payload } = requestBody;
    console.log('🎬 Action:', action);

    // Get organization for provider actions (if user exists)
    let org = null;
    if (user) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      org = orgData;
      console.log('🏢 Organization found:', !!org, org?.id);
    }

    // Helper: Get fee amount based on provider plan
    const getFeeAmount = async (providerId: string, jobAmount: number) => {
      const { data: org } = await supabase
        .from('organizations')
        .select('transaction_fee_pct')
        .eq('id', providerId)
        .single();
      
      if (org?.transaction_fee_pct !== null && org?.transaction_fee_pct !== undefined) {
        return Math.round(jobAmount * org.transaction_fee_pct);
      }
      
      const { data: subscription } = await supabase
        .from('provider_subscriptions')
        .select('plan')
        .eq('organization_id', providerId)
        .eq('status', 'active')
        .maybeSingle();
      
      const planFees: Record<string, number> = {
        'free': 0.08, 'beta': 0.03, 'growth': 0.025, 'pro': 0.02, 'scale': 0.015,
      };
      
      const feePercent = subscription?.plan 
        ? (planFees[subscription.plan] || getPlatformFeePercent())
        : getPlatformFeePercent();
      
      return Math.round(jobAmount * feePercent);
    };

    // ===== HOSTED FLOWS =====
    
    // Create subscription checkout (Provider plan upgrades)
    if (action === 'create-subscription-checkout') {
      const { plan } = payload;
      
      if (!org) {
        return new Response(
          JSON.stringify({ ok: false, code: 'NO_ORGANIZATION', message: 'Provider organization not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get price ID from env
      const priceIdMap: Record<string, string> = {
        'beta': Deno.env.get('STRIPE_PRICE_BETA') || '',
        'growth': Deno.env.get('STRIPE_PRICE_GROWTH') || '',
        'pro': Deno.env.get('STRIPE_PRICE_PRO') || '',
        'scale': Deno.env.get('STRIPE_PRICE_SCALE') || '',
      };

      const priceId = priceIdMap[plan];
      if (!priceId) {
        return new Response(
          JSON.stringify({ ok: false, code: 'INVALID_PLAN', message: `Invalid plan: ${plan}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!user) {
        return new Response(
          JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let customerId = org.stripe_customer_id;
      if (!customerId) {
        const customer = await stripePost('customers', {
          email: user.email,
          name: org.name,
          metadata: { org_id: org.id, profile_id: org.owner_id },
        });
        customerId = customer.id;
        await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', org.id);
      }

      const appUrl = getAppUrl();
      const session = await stripePost('checkout/sessions', {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: plan === 'beta' ? { trial_period_days: 14 } : undefined,
        success_url: `${appUrl}/provider/settings?tab=payments&status=subscribed`,
        cancel_url: `${appUrl}/provider/settings?tab=payments&status=cancelled`,
        metadata: { org_id: org.id, plan },
      });

      return new Response(
        JSON.stringify({ ok: true, url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payment checkout (One-off payments with platform fee)
    if (action === 'create-payment-checkout') {
      const { amount_cents, providerProfileId, description, metadata = {} } = payload;

      // Get provider org and stripe account
      const { data: providerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', providerProfileId)
        .single();

      if (!providerProfile) {
        return new Response(
          JSON.stringify({ ok: false, code: 'PROVIDER_NOT_FOUND', message: 'Provider not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: providerOrg } = await supabase
        .from('organizations')
        .select('id, stripe_account_id, transaction_fee_pct')
        .eq('owner_id', providerProfileId)
        .single();

      if (!providerOrg?.stripe_account_id) {
        return new Response(
          JSON.stringify({ ok: false, code: 'PROVIDER_NOT_SETUP', message: 'Provider payment setup incomplete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const feeAmount = await getFeeAmount(providerOrg.id, amount_cents);
      const appUrl = getAppUrl();

      const session = await stripePost('checkout/sessions', {
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: description || 'Service Payment' },
            unit_amount: amount_cents,
          },
          quantity: 1,
        }],
        payment_intent_data: {
          application_fee_amount: feeAmount,
          transfer_data: { destination: providerOrg.stripe_account_id },
          metadata: { ...metadata, provider_org_id: providerOrg.id },
        },
        success_url: `${appUrl}/homeowner/appointments?status=paid`,
        cancel_url: `${appUrl}/homeowner/appointments?status=cancelled`,
      });

      return new Response(
        JSON.stringify({ ok: true, url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create billing portal link
    if (action === 'create-portal-link') {
      const { profileId, role } = payload;

      if (!user) {
        return new Response(
          JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get stripe customer ID
      let customerId = null;
      if (role === 'provider' && org) {
        customerId = org.stripe_customer_id;
      } else {
        const { data: customer } = await supabase
          .from('customers')
          .select('stripe_customer_id')
          .eq('profile_id', profileId)
          .maybeSingle();
        customerId = customer?.stripe_customer_id;
      }

      if (!customerId) {
        // Create customer if doesn't exist
        const customer = await stripePost('customers', {
          email: user.email,
          metadata: { profile_id: profileId },
        });
        customerId = customer.id;

        if (role === 'provider' && org) {
          await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', org.id);
        } else {
          await supabase.from('customers').insert({
            user_id: user.id,
            profile_id: profileId,
            stripe_customer_id: customerId,
          });
        }
      }

      const appUrl = getAppUrl();
      const returnPath = role === 'provider' ? '/provider/settings?tab=payments' : '/homeowner/settings';
      
      const session = await stripePost('billing_portal/sessions', {
        customer: customerId,
        return_url: `${appUrl}${returnPath}`,
      });

      return new Response(
        JSON.stringify({ ok: true, url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== EXISTING FLOWS (kept for compatibility) =====

    // Require auth for remaining actions
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE SETUP INTENT
    if (action === 'create-setup-intent') {
      const { profileId, email, name } = payload;

      let { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

      let customerId = customer?.stripe_customer_id;

      if (!customerId) {
        const stripeCustomer = await stripePost('customers', {
          email, name,
          metadata: { profile_id: profileId },
        });
        customerId = stripeCustomer.id;

        await supabase.from('customers').insert({
          user_id: user.id,
          profile_id: profileId,
          stripe_customer_id: customerId,
        });
      }

      const setupIntent = await stripePost('setup_intents', {
        customer: customerId,
        payment_method_types: ['card'],
        metadata: { profile_id: profileId },
      });

      return new Response(
        JSON.stringify({ ok: true, clientSecret: setupIntent.client_secret }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ATTACH PAYMENT METHOD
    if (action === 'attach-payment-method') {
      const { profileId, paymentMethodId } = payload;

      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', profileId)
        .single();

      if (!customer) {
        return new Response(
          JSON.stringify({ ok: false, code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await stripePost(`customers/${customer.stripe_customer_id}`, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      await supabase
        .from('customers')
        .update({ default_payment_method: paymentMethodId })
        .eq('profile_id', profileId);

      return new Response(
        JSON.stringify({ ok: true, success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // HOMEOWNER PAYMENT INTENT
    if (action === 'homeowner-payment-intent') {
      const { jobId, homeownerId, amount, captureNow = true, tip = 0 } = payload;

      let { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', homeownerId)
        .maybeSingle();

      if (!customer) {
        const { data: profile } = await supabase.from('profiles').select('full_name, user_id').eq('id', homeownerId).single();
        const { data: authUser } = await supabase.auth.admin.getUserById(profile?.user_id || '');
        const stripeCustomer = await stripePost('customers', {
          email: authUser?.user?.email,
          name: profile?.full_name,
          metadata: { profile_id: homeownerId },
        });
        const { data: newCustomer } = await supabase.from('customers').insert({
          profile_id: homeownerId,
          stripe_customer_id: stripeCustomer.id,
        }).select().single();
        customer = newCustomer;
      }

      const { data: booking } = await supabase
        .from('bookings')
        .select('provider_org_id')
        .eq('id', jobId)
        .single();

      if (!booking) throw new Error('Booking not found');

      const { data: providerOrg } = await supabase
        .from('organizations')
        .select('stripe_account_id')
        .eq('id', booking.provider_org_id)
        .single();

      if (!providerOrg) throw new Error('Provider organization not found');

      const totalAmount = Math.round((amount + tip) * 100);
      const feeAmount = await getFeeAmount(booking.provider_org_id, totalAmount);

      const paymentIntent = await stripePost('payment_intents', {
        amount: totalAmount,
        currency: 'usd',
        customer: customer.stripe_customer_id,
        payment_method: customer.default_payment_method,
        confirm: false,
        application_fee_amount: feeAmount,
        transfer_data: { destination: providerOrg.stripe_account_id },
        transfer_group: `job_${jobId}`,
        capture_method: captureNow ? 'automatic' : 'manual',
        metadata: {
          homeowner_id: homeownerId,
          job_id: jobId,
          booking_id: jobId,
          tip_amount: tip,
        },
      });

      const { data: payment } = await supabase
        .from('payments')
        .insert({
          org_id: booking.provider_org_id,
          homeowner_profile_id: homeownerId,
          job_id: jobId,
          type: 'job_payment',
          status: captureNow ? 'pending' : 'authorized',
          amount: totalAmount,
          currency: 'usd',
          stripe_id: paymentIntent.id,
          transfer_destination: providerOrg.stripe_account_id,
          application_fee_cents: feeAmount,
          captured: false,
          transfer_group: `job_${jobId}`,
          payment_method: customer.default_payment_method,
          meta: { tip_amount: tip },
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({ ok: true, paymentId: payment.id, clientSecret: paymentIntent.client_secret }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remaining actions require org
    if (!org) {
      return new Response(
        JSON.stringify({ ok: false, code: 'ORG_NOT_FOUND', message: 'Provider organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CAPTURE
    if (action === 'capture') {
      const { paymentId } = payload;

      const { data: payment } = await supabase
        .from('payments')
        .select('stripe_id, org_id')
        .eq('id', paymentId)
        .single();

      if (!payment) {
        return new Response(
          JSON.stringify({ ok: false, code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const capturedPaymentIntent = await stripePost(`payment_intents/${payment.stripe_id}/capture`, {});

        await supabase
          .from('payments')
          .update({ status: 'succeeded', captured: true })
          .eq('id', paymentId);

        return new Response(
          JSON.stringify({ ok: true, status: capturedPaymentIntent.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await logPaymentError(supabase, payment.org_id, 'payments-api:capture', payload, error.message, error);
        return new Response(
          JSON.stringify({ ok: false, code: 'CAPTURE_FAILED', message: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // PAYOUT
    if (action === 'payout') {
      const { accountId, amount } = payload;

      try {
        const payout = await stripePost('payouts', {
          amount: Math.round(amount * 100),
          currency: 'usd',
          method: 'standard',
        }, accountId);

        return new Response(
          JSON.stringify({ ok: true, payout }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await logPaymentError(supabase, org.id, 'payments-api:payout', payload, error.message, error);
        return new Response(
          JSON.stringify({ ok: false, code: 'PAYOUT_FAILED', message: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // BALANCE
    if (action === 'balance') {
      try {
        const balance = await stripeGet('balance', org.stripe_account_id);

        return new Response(
          JSON.stringify({ ok: true, balance }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await logPaymentError(supabase, org.id, 'payments-api:balance', payload, error.message, error);
        return new Response(
          JSON.stringify({ ok: false, code: 'BALANCE_FAILED', message: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // INVOICE
    if (action === 'invoice') {
      const { customerId } = payload;

      try {
        const invoice = await stripePost('invoices', {
          customer: customerId,
          collection_method: 'send_invoice',
          days_until_due: 30,
        });

        // Send the invoice
        await stripePost(`invoices/${invoice.id}/send`, {});

        return new Response(
          JSON.stringify({ ok: true, invoice }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await logPaymentError(supabase, org.id, 'payments-api:invoice', payload, error.message, error);
        return new Response(
          JSON.stringify({ ok: false, code: 'INVOICE_FAILED', message: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // REFUND
    if (action === 'refund') {
      const { paymentIntentId, amount } = payload;

      try {
        const refund = await stripePost('refunds', {
          payment_intent: paymentIntentId,
          amount: Math.round(amount * 100),
        });

        return new Response(
          JSON.stringify({ ok: true, refund }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await logPaymentError(supabase, org.id, 'payments-api:refund', payload, error.message, error);
        return new Response(
          JSON.stringify({ ok: false, code: 'REFUND_FAILED', message: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: false, code: 'INVALID_ACTION', message: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payments API error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Payment operation failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
