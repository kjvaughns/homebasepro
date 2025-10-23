const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info'
};

const ok = (b: any, s = 200) => new Response(
  JSON.stringify(b), 
  { status: s, headers: { 'Content-Type': 'application/json', ...CORS }}
);

const err = (code: string, message: string, s = 400) => 
  ok({ ok: false, code, message }, s);

// Resolve environment variables flexibly
function readEnv(...keys: string[]) {
  for (const k of keys) {
    const v = Deno.env.get(k);
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

const STRIPE_KEY = readEnv('STRIPE_SECRET', 'STRIPE_SECRET_KEY_LIVE', 'stripe_secret_key', 'stripe');
const APP_URL = readEnv('APP_URL') || 'https://homebaseproapp.com';
const CURRENCY = readEnv('CURRENCY') || 'usd';
const PRICE_BETA = readEnv('STRIPE_PRICE_BETA_MONTHLY', 'STRIPE_PRICE_BETA');

if (!STRIPE_KEY) {
  console.error('payments-api: Missing Stripe secret in env');
}

console.log('payments-api starting (Deno-only, no Node shims)');

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

async function stripePOST(path: string, params: Record<string, any>, stripeAccount?: string) {
  if (!STRIPE_KEY) throw new Error('Stripe secret key not configured');
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${STRIPE_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  
  if (stripeAccount) {
    headers['Stripe-Account'] = stripeAccount;
  }
  
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers,
    body: form(params)
  });
  
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe ${path} failed`);
  }
  return json;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { status: 204, headers: CORS });
    }
    
    if (req.method !== 'POST') {
      return err('METHOD_NOT_ALLOWED', 'Use POST', 405);
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return err('BAD_JSON', 'Body must be JSON with { action }');
    }
    
    const action = body?.action;
    if (!action) {
      return err('MISSING_ACTION', 'Include body.action');
    }

    // BALANCE and alias GET-BALANCE
    if (action === 'balance' || action === 'get-balance' || action === 'provider-balance') {
      if (!STRIPE_KEY) {
        return err('NO_STRIPE_KEY', 'Stripe secret key not configured', 500);
      }
      
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { 'Authorization': `Bearer ${STRIPE_KEY}` }
      });
      
      const bal = await res.json().catch(() => ({}));
      if (!res.ok || bal?.error) {
        return err('STRIPE_ERROR', bal?.error?.message || 'Failed to get balance', 400);
      }
      
      return ok({ ok: true, balance: bal });
    }

    if (action === 'create-subscription-checkout') {
      if (!PRICE_BETA) {
        return err('NO_PRICE_ID', 'STRIPE_PRICE_BETA or STRIPE_PRICE_BETA_MONTHLY not set');
      }
      
      const session = await stripePOST('checkout/sessions', {
        mode: 'subscription',
        'line_items': [{ price: PRICE_BETA, quantity: 1 }],
        'subscription_data': { trial_period_days: 14 },
        payment_method_collection: 'always',
        success_url: `${APP_URL}/provider/billing/portal?status=plan_active&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/provider/billing/portal?status=cancelled`
      });
      
      return ok({ ok: true, url: session.url });
    }

    if (action === 'create-payment-checkout') {
      const { amount_cents, providerStripeAccountId, description, fee_percent } = body || {};
      
      if (!amount_cents || !providerStripeAccountId) {
        return err('MISSING_FIELDS', 'amount_cents and providerStripeAccountId required');
      }
      
      const pct = Number(fee_percent ?? 8);
      const application_fee_amount = Math.floor(Number(amount_cents) * (pct / 100));
      
      const session = await stripePOST('checkout/sessions', {
        mode: 'payment',
        'line_items': [{
          price_data: {
            currency: CURRENCY,
            unit_amount: amount_cents,
            product_data: { name: description || 'Service Payment' }
          },
          quantity: 1
        }],
        'payment_intent_data': {
          application_fee_amount,
          transfer_data: { destination: providerStripeAccountId }
        },
        success_url: `${APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/payments/cancel`
      });
      
      return ok({ ok: true, url: session.url });
    }

    if (action === 'create-portal-link') {
      const { customer_id, role } = body || {};
      
      if (!customer_id) {
        return err('MISSING_CUSTOMER', 'customer_id required');
      }
      
      const portal = await stripePOST('billing_portal/sessions', {
        customer: customer_id,
        return_url: `${APP_URL}/${role === 'provider' ? 'provider/billing/portal' : 'billing/portal'}?status=done`
      });
      
      return ok({ ok: true, url: portal.url });
    }

    return err('UNKNOWN_ACTION', `Unsupported action: ${action}`);

  } catch (e: any) {
    console.error('payments-api error:', e);
    return err('SERVER_ERROR', e?.message || String(e), 500);
  }
});
