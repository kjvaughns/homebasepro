import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info'
};

const ok  = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS }});
const err = (code: string, message: string, s = 400, details?: any) => {
  const errorBody = {
    ok: false,
    code,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
  console.error('❌ Function error:', errorBody);
  return ok(errorBody, s);
};

// Resolve environment variables flexibly
function readEnv(...keys: string[]) {
  for (const k of keys) {
    const v = Deno.env.get(k);
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

const STRIPE_KEY = readEnv('STRIPE_SECRET', 'STRIPE_SECRET_KEY_LIVE', 'STRIPE_SECRET_KEY_TEST', 'stripe_secret_key', 'stripe');
const STRIPE_PUBLISHABLE = readEnv('STRIPE_PUBLISHABLE_KEY', 'STRIPE_PUBLISHABLE_KEY_LIVE', 'STRIPE_PUBLISHABLE_KEY_TEST', 'stripe_publishable_key');
const APP_URL    = readEnv('APP_URL') || 'https://homebaseproapp.com';
const CURRENCY   = readEnv('CURRENCY') || 'usd';
const PRICE_FREE = readEnv('STRIPE_PRICE_FREE');
const PRICE_BETA = readEnv('STRIPE_PRICE_BETA_MONTHLY', 'STRIPE_PRICE_BETA');
const PRICE_GROWTH = readEnv('STRIPE_PRICE_GROWTH');
const PRICE_PRO = readEnv('STRIPE_PRICE_PRO');
const PRICE_SCALE = readEnv('STRIPE_PRICE_SCALE');

console.log('payments-api starting (Deno-only, no Node shims)');
console.log('✅ Stripe configured:', {
  hasSecret: !!STRIPE_KEY,
  hasPublishable: !!STRIPE_PUBLISHABLE,
  hasPriceFree: !!PRICE_FREE,
  hasPriceBeta: !!PRICE_BETA,
  hasPriceGrowth: !!PRICE_GROWTH,
  hasPricePro: !!PRICE_PRO,
  hasPriceScale: !!PRICE_SCALE,
  mode: STRIPE_KEY?.startsWith('sk_live_') ? 'live' : 'test',
  appUrl: APP_URL,
  currency: CURRENCY
});

// Flatten nested object params -> Stripe bracket notation
function flattenParams(obj: Record<string, any>, prefix = ''): [string, string][] {
  const pairs: [string, string][] = [];
  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          pairs.push(...flattenParams(item, `${fullKey}[${index}]`));
        } else {
          pairs.push([`${fullKey}[${index}]`, String(item)]);
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      pairs.push(...flattenParams(value, fullKey));
    } else {
      pairs.push([fullKey, String(value)]);
    }
  }
  return pairs;
}

function form(params: Record<string, any>) {
  const body = new URLSearchParams();
  for (const [k, v] of flattenParams(params || {})) {
    body.append(k, v);
  }
  return body;
}

async function stripePOST(path: string, params: any, stripeAccount?: string) {
  if (!STRIPE_KEY) throw new Error('Stripe secret key not configured');
  const headers: any = {
    'Authorization': `Bearer ${STRIPE_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  if (stripeAccount) headers['Stripe-Account'] = stripeAccount;
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers,
    body: form(params)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json?.error?.message || `Stripe ${path} failed`);
    (error as any).stripeError = json?.error;
    console.error('Stripe API error:', {
      path,
      type: json?.error?.type,
      code: json?.error?.code,
      message: json?.error?.message,
      statusCode: res.status
    });
    throw error;
  }
  return json;
}

async function stripeGET(path: string, stripeAccount?: string) {
  if (!STRIPE_KEY) throw new Error('Stripe secret key not configured');
  const headers: any = {
    'Authorization': `Bearer ${STRIPE_KEY}`
  };
  if (stripeAccount) headers['Stripe-Account'] = stripeAccount;
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'GET',
    headers
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json?.error?.message || `Stripe ${path} failed`);
    (error as any).stripeError = json?.error;
    console.error('Stripe API error:', {
      path,
      type: json?.error?.type,
      code: json?.error?.code,
      message: json?.error?.message,
      statusCode: res.status
    });
    throw error;
  }
  return json;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return err('METHOD_NOT_ALLOWED', 'Use POST', 405);

    let body: any = null;
    try { body = await req.json(); } catch { return err('BAD_JSON', 'Body must be JSON with { action }'); }
    const action = body?.action;
    if (!action) return err('MISSING_ACTION', 'Include body.action');

    console.log('🎯 Action requested:', action);

    // HEALTH CHECK / CONFIG CHECK
    if (action === 'health' || action === 'check-config') {
      return ok({
        ok: true,
        configured: {
          stripe_secret: !!STRIPE_KEY,
          stripe_publishable: !!STRIPE_PUBLISHABLE,
          price_free: !!PRICE_FREE,
          price_beta: !!PRICE_BETA,
          price_growth: !!PRICE_GROWTH,
          price_pro: !!PRICE_PRO,
          price_scale: !!PRICE_SCALE,
          app_url: !!APP_URL,
          currency: !!CURRENCY
        },
        mode: STRIPE_KEY?.startsWith('sk_live_') ? 'live' : 'test',
        timestamp: new Date().toISOString()
      });
    }

    // ========== PUBLIC ACTIONS (no auth required) ==========
    
    // CHECK CONFIG
    if (action === 'check-config') {
      return ok({ ok: true, hasStripe: !!STRIPE_KEY, hasPrice: !!PRICE_BETA });
    }

    // BALANCE (can be public or authenticated)
    if (action === 'balance' || action === 'get-balance' || action === 'provider-balance') {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { 'Authorization': `Bearer ${STRIPE_KEY}` }
      });
      const bal = await res.json().catch(() => ({}));
      if (!res.ok || bal?.error) return err('STRIPE_ERROR', bal?.error?.message || 'Failed to get balance', 400);
      return ok({ ok: true, balance: bal });
    }

    // ========== AUTHENTICATED ACTIONS ==========
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return err('UNAUTHORIZED', 'Authorization header required', 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) return err('UNAUTHORIZED', 'Invalid or expired token', 401);

    // REGISTER FREE PLAN
    if (action === 'register-free-plan') {
      const { data: org } = await supabase.from('organizations').select('*').eq('owner_id', user.id).single();
      if (!org) return err('NO_ORGANIZATION', 'Organization not found', 404);

      await supabase.from('organizations').update({
        plan: 'free', transaction_fee_pct: 0.08, team_limit: 5
      }).eq('id', org.id);

      await supabase.from('profiles').update({
        plan: 'free', onboarded_at: new Date().toISOString()
      }).eq('user_id', user.id);

      return ok({ ok: true, success: true, plan: 'free', message: 'FREE plan activated' });
    }

    // CREATE SETUP INTENT (card collection)
    if (action === 'create-setup-intent') {
      const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('user_id', user.id).single();
      let customerId = profile?.stripe_customer_id;

      if (!customerId) {
        const { data: orgs } = await supabase.from('organizations').select('email, name').eq('owner_id', user.id).single();
        const customer = await stripePOST('customers', {
          email: orgs?.email || user.email,
          name: orgs?.name,
          metadata: { user_id: user.id }
        });
        customerId = customer.id;
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('user_id', user.id);
      }

      const setupIntent = await stripePOST('setup_intents', {
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: { purpose: 'trial_subscription', user_id: user.id }
      });

      return ok({ ok: true, clientSecret: setupIntent.client_secret, customerId });
    }

    // ACTIVATE TRIAL SUBSCRIPTION
    if (action === 'activate-trial-subscription') {
      const { paymentMethodId, promoCode } = body;
      const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('user_id', user.id).single();
      if (!profile?.stripe_customer_id) return err('NO_CUSTOMER', 'Customer not found', 404);

      const { data: org } = await supabase.from('organizations').select('*').eq('owner_id', user.id).single();
      if (!org) return err('NO_ORGANIZATION', 'Organization not found', 404);
      if (!PRICE_BETA) return err('NO_PRICE_ID', 'Trial price not configured');

      const subscription = await stripePOST('subscriptions', {
        customer: profile.stripe_customer_id,
        items: [{ price: PRICE_BETA }],
        trial_period_days: 14,
        default_payment_method: paymentMethodId,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: { org_id: org.id, user_id: user.id, plan: 'beta' }
      });

      const trialEnd = new Date(subscription.trial_end * 1000).toISOString();
      await supabase.from('profiles').update({
        stripe_subscription_id: subscription.id, plan: 'beta', trial_ends_at: trialEnd, onboarded_at: new Date().toISOString()
      }).eq('user_id', user.id);

      await supabase.from('organizations').update({
        plan: 'beta', transaction_fee_pct: 0.03, team_limit: 3
      }).eq('id', org.id);

      await supabase.from('provider_subscriptions').upsert({
        provider_id: org.id,
        stripe_customer_id: profile.stripe_customer_id,
        stripe_subscription_id: subscription.id,
        plan: 'beta',
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });

      return ok({ ok: true, success: true, subscription, trialEndsAt: trialEnd });
    }

    // GET SUBSCRIPTION
    if (action === 'get-subscription') {
      const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user.id).single();
      if (!org) return err('NO_ORGANIZATION', 'Organization not found', 404);
      const { data: subscription } = await supabase.from('provider_subscriptions').select('*').eq('provider_id', org.id).single();
      return ok({ ok: true, subscription });
    }

    // GET STRIPE SUBSCRIPTION
    if (action === 'get-stripe-subscription') {
      const { subscriptionId } = body;
      if (!subscriptionId) return err('MISSING_SUBSCRIPTION_ID', 'subscriptionId required');
      const stripeSub = await stripeGET(`subscriptions/${subscriptionId}`);
      return ok({
        ok: true,
        subscription: {
          cancel_at_period_end: stripeSub.cancel_at_period_end,
          current_period_end: stripeSub.current_period_end,
          status: stripeSub.status,
        }
      });
    }

    // CREATE/UPGRADE SUBSCRIPTION
    if (action === 'create-subscription' || action === 'upgrade-plan') {
      const { plan, paymentMethodId } = body;
      const planConfig: any = {
        beta: { priceId: PRICE_BETA, feePercent: 0.03, teamLimit: 3, trialDays: 14 },
        growth: { priceId: 'price_growth_monthly', feePercent: 0.025, teamLimit: 3 },
        pro: { priceId: 'price_pro_monthly', feePercent: 0.02, teamLimit: 10 },
        scale: { priceId: 'price_scale_monthly', feePercent: 0.02, teamLimit: 25 },
      };

      if (!plan || !planConfig[plan]) return err('INVALID_PLAN', 'Invalid plan selected');
      const config = planConfig[plan];

      const { data: org } = await supabase.from('organizations').select('*').eq('owner_id', user.id).single();
      if (!org) return err('NO_ORGANIZATION', 'Organization not found', 404);

      let { data: subscription } = await supabase.from('provider_subscriptions').select('*').eq('provider_id', org.id).single();
      let stripeCustomerId = subscription?.stripe_customer_id;

      if (!stripeCustomerId) {
        const customer = await stripePOST('customers', {
          email: org.email, name: org.name, metadata: { org_id: org.id, user_id: user.id }
        });
        stripeCustomerId = customer.id;
      }

      if (paymentMethodId) {
        await stripePOST(`payment_methods/${paymentMethodId}/attach`, { customer: stripeCustomerId });
        await stripePOST(`customers/${stripeCustomerId}`, {
          invoice_settings: { default_payment_method: paymentMethodId }
        });
      }

      let stripeSub;
      if (subscription?.stripe_subscription_id && action === 'upgrade-plan') {
        const existingSub = await stripeGET(`subscriptions/${subscription.stripe_subscription_id}`);
        stripeSub = await stripePOST(`subscriptions/${subscription.stripe_subscription_id}`, {
          items: [{ id: existingSub.items.data[0].id, price: config.priceId }],
          proration_behavior: 'always_invoice',
        });
      } else {
        if (config.trialDays) {
          const checkoutSession = await stripePOST('checkout/sessions', {
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [{ price: config.priceId, quantity: 1 }],
            subscription_data: {
              trial_period_days: config.trialDays,
              trial_settings: { end_behavior: { missing_payment_method: 'cancel' }},
              metadata: { org_id: org.id, user_id: user.id, plan }
            },
            success_url: `${APP_URL}/provider/dashboard?trial_started=true`,
            cancel_url: `${APP_URL}/onboarding/provider?canceled=true`,
            payment_method_collection: 'always',
            metadata: { org_id: org.id, user_id: user.id, plan }
          });
          return ok({ ok: true, checkoutUrl: checkoutSession.url });
        }

        stripeSub = await stripePOST('subscriptions', {
          customer: stripeCustomerId,
          items: [{ price: config.priceId }],
          expand: ['latest_invoice.payment_intent'],
          metadata: { org_id: org.id, user_id: user.id, plan }
        });
      }

      await supabase.from('provider_subscriptions').upsert({
        provider_id: org.id,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSub.id,
        plan,
        status: stripeSub.status,
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
      });

      await supabase.from('organizations').update({
        plan, transaction_fee_pct: config.feePercent, team_limit: config.teamLimit
      }).eq('id', org.id);

      return ok({ ok: true, subscription: stripeSub, clientSecret: stripeSub.latest_invoice?.payment_intent?.client_secret });
    }

    // CANCEL SUBSCRIPTION
    if (action === 'cancel-subscription') {
      const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user.id).single();
      if (!org) return err('NO_ORGANIZATION', 'Organization not found', 404);

      const { data: subscription } = await supabase.from('provider_subscriptions').select('*').eq('provider_id', org.id).single();
      if (!subscription?.stripe_subscription_id) return err('NO_SUBSCRIPTION', 'No active subscription found');

      await stripePOST(`subscriptions/${subscription.stripe_subscription_id}`, { cancel_at_period_end: true });
      await supabase.from('provider_subscriptions').update({ status: 'canceling' }).eq('provider_id', org.id);

      return ok({ ok: true, success: true, message: 'Subscription will cancel at period end' });
    }

    // CREATE SUBSCRIPTION CHECKOUT
    if (action === 'create-subscription-checkout') {
      if (!PRICE_BETA) return err('NO_PRICE_ID', 'STRIPE_PRICE_BETA or STRIPE_PRICE_BETA_MONTHLY not set');
      const session = await stripePOST('checkout/sessions', {
        mode: 'subscription',
        line_items: [{ price: PRICE_BETA, quantity: 1 }],
        subscription_data: { trial_period_days: 14 },
        payment_method_collection: 'always',
        success_url: `${APP_URL}/provider/billing/portal?status=plan_active&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/provider/billing/portal?status=cancelled`
      });
      return ok({ ok: true, url: session.url });
    }

    // CREATE PAYMENT CHECKOUT
    if (action === 'create-payment-checkout') {
      const { amount_cents, providerStripeAccountId, description, fee_percent } = body || {};
      if (!amount_cents || !providerStripeAccountId) return err('MISSING_FIELDS', 'amount_cents and providerStripeAccountId required');
      const pct = Number(fee_percent ?? 8);
      const application_fee_amount = Math.floor(Number(amount_cents) * (pct / 100));
      const session = await stripePOST('checkout/sessions', {
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: CURRENCY,
            unit_amount: amount_cents,
            product_data: { name: description || 'Service Payment' }
          },
          quantity: 1
        }],
        payment_intent_data: {
          application_fee_amount,
          transfer_data: { destination: providerStripeAccountId }
        },
        success_url: `${APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/payments/cancel`
      });
      return ok({ ok: true, url: session.url });
    }

    // CREATE PORTAL LINK
    if (action === 'create-portal-link') {
      const { customer_id, role } = body || {};
      if (!customer_id) return err('MISSING_CUSTOMER', 'customer_id required');
      const portal = await stripePOST('billing_portal/sessions', {
        customer: customer_id,
        return_url: `${APP_URL}/${role === 'provider' ? 'provider/billing/portal' : 'billing/portal'}?status=done`
      });
      return ok({ ok: true, url: portal.url });
    }

    // HOMEOWNER PAYMENT INTENT (for booking payments)
    if (action === 'homeowner-payment-intent') {
      const { jobId, amount, homeownerId } = body;
      if (!jobId || !amount) return err('MISSING_FIELDS', 'jobId and amount required');

      try {
        const { data: job } = await supabase.from('bookings').select('provider_org_id, homeowner_profile_id').eq('id', jobId).single();
        if (!job) return err('JOB_NOT_FOUND', 'Job not found');

        const { data: org } = await supabase.from('organizations').select('stripe_account_id').eq('id', job.provider_org_id).single();
        if (!org?.stripe_account_id) return err('NO_STRIPE_ACCOUNT', 'Provider has not connected Stripe');

        const feePercent = 0.05;
        const applicationFee = Math.round(amount * feePercent);
        const paymentIntent = await stripePOST('payment_intents', {
          amount,
          currency: CURRENCY,
          application_fee_amount: applicationFee,
          transfer_data: { destination: org.stripe_account_id },
          metadata: { job_id: jobId, homeowner_id: homeownerId || job.homeowner_profile_id, org_id: job.provider_org_id }
        });
        return ok({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
      } catch (error: any) {
        return err('PAYMENT_INTENT_FAILED', error.message || 'Failed to create payment intent', 500);
      }
    }

    // CREATE HOMEOWNER CUSTOMER
    if (action === 'create-homeowner-customer') {
      const { email, name, profileId } = body;
      if (!email || !profileId) return err('MISSING_FIELDS', 'email and profileId required');

      const { data: existing } = await supabase.from('profiles').select('stripe_customer_id').eq('id', profileId).single();
      if (existing?.stripe_customer_id) return ok({ customerId: existing.stripe_customer_id });

      const customer = await stripePOST('customers', { email, name: name || email, metadata: { profile_id: profileId } });
      await supabase.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', profileId);
      return ok({ customerId: customer.id });
    }

    // ATTACH PAYMENT METHOD
    if (action === 'attach-payment-method') {
      const { paymentMethodId, customerId } = body;
      if (!paymentMethodId || !customerId) return err('MISSING_FIELDS', 'paymentMethodId and customerId required');

      await stripePOST(`payment_methods/${paymentMethodId}/attach`, { customer: customerId });
      await stripePOST(`customers/${customerId}`, { invoice_settings: { default_payment_method: paymentMethodId } });
      return ok({ success: true });
    }

    // INSTANT PAYOUT
    if (action === 'instant-payout') {
      const { amount } = body;
      if (!amount || amount <= 0) return err('INVALID_AMOUNT', 'Valid amount required');

      const { data: org } = await supabase.from('organizations').select('stripe_account_id').eq('owner_id', user.id).single();
      if (!org?.stripe_account_id) return err('NO_STRIPE_ACCOUNT', 'Connect Stripe account first');

      const payout = await stripePOST('payouts', { amount: Math.round(amount * 100), currency: CURRENCY, method: 'instant' }, org.stripe_account_id);
      return ok({ payoutId: payout.id, status: payout.status });
    }

    // PAYMENT LINK (Create Stripe Checkout for ad-hoc payment)
    if (action === 'payment-link') {
      const { amount, description, clientId, jobId } = body;
      if (!amount || !description) return err('MISSING_FIELDS', 'amount and description required');

      const { data: org } = await supabase.from('organizations').select('stripe_account_id').eq('owner_id', user.id).single();
      if (!org?.stripe_account_id) return err('NO_STRIPE_ACCOUNT', 'Connect Stripe account first');

      const session = await stripePOST('checkout/sessions', {
        mode: 'payment',
        line_items: [{ price_data: { currency: CURRENCY, product_data: { name: description }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
        success_url: `${APP_URL}/provider/payments?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/provider/payments?canceled=1`,
        payment_intent_data: {
          application_fee_amount: Math.round(amount * 100 * 0.05),
          transfer_data: { destination: org.stripe_account_id },
          metadata: { client_id: clientId || '', job_id: jobId || '' }
        }
      });
      return ok({ url: session.url, sessionId: session.id });
    }

    // REFUND
    if (action === 'refund') {
      const { paymentIntentId, amount, reason } = body;
      if (!paymentIntentId) return err('MISSING_FIELDS', 'paymentIntentId required');

      const refundParams: any = { payment_intent: paymentIntentId };
      if (amount) refundParams.amount = Math.round(amount * 100);
      if (reason) refundParams.reason = reason;

      const refund = await stripePOST('refunds', refundParams);
      await supabase.from('payments').update({ status: 'refunded' }).eq('stripe_id', paymentIntentId);
      return ok({ refundId: refund.id, status: refund.status });
    }

    return err('UNKNOWN_ACTION', `Unsupported action: ${action}`);

  } catch (e: any) {
    console.error('payments-api error:', e);
    
    // If this is a Stripe error, format it nicely
    if (e?.stripeError) {
      return err(
        'STRIPE_ERROR',
        e.message || 'Stripe API request failed',
        e.stripeError.statusCode || 400,
        {
          stripe_code: e.stripeError.code,
          stripe_type: e.stripeError.type,
          stripe_param: e.stripeError.param,
          decline_code: e.stripeError.decline_code
        }
      );
    }
    
    return err('SERVER_ERROR', e?.message || String(e), 500);
  }
});
