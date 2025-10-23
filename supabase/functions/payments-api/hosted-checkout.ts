import Stripe from 'https://esm.sh/stripe@14.21.0';
import { getAppUrl, getPlatformFeePercent, getCurrency, readSecret } from '../_shared/env.ts';

export async function createSubscriptionCheckout(
  stripe: Stripe,
  supabase: any,
  userId: string
) {
  const priceId = readSecret('STRIPE_PRICE_BETA_MONTHLY');
  if (!priceId) {
    throw new Error('STRIPE_PRICE_BETA_MONTHLY not configured');
  }

  // Get or create customer with billing address
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email, address_line1, address_line2, address_city, address_state, address_postal_code, address_country')
    .eq('user_id', userId)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email,
      metadata: { user_id: userId },
      address: profile?.address_line1 ? {
        line1: profile.address_line1,
        line2: profile.address_line2 || undefined,
        city: profile.address_city || undefined,
        state: profile.address_state || undefined,
        postal_code: profile.address_postal_code || undefined,
        country: profile.address_country || 'US',
      } : undefined,
    });
    customerId = customer.id;

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', userId);
  }

  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    subscription_data: {
      trial_period_days: 14
    },
    payment_method_collection: 'always',
    billing_address_collection: 'required',
    customer_update: { address: 'auto' },
    automatic_tax: { enabled: true },
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing`,
    metadata: { user_id: userId }
  });

  return { url: session.url };
}

export async function createPaymentCheckout(
  stripe: Stripe,
  payload: any
) {
  const { amount_cents, provider_account_id, description, metadata } = payload;

  if (!amount_cents || !provider_account_id) {
    throw new Error('amount_cents and provider_account_id required');
  }

  const feePct = getPlatformFeePercent() / 100;
  const appFee = Math.floor(amount_cents * feePct);
  const currency = getCurrency();
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency,
        unit_amount: amount_cents,
        product_data: {
          name: description || 'Service Payment'
        }
      },
      quantity: 1
    }],
    payment_intent_data: {
      application_fee_amount: appFee,
      transfer_data: {
        destination: provider_account_id
      },
      metadata: metadata || {}
    },
    billing_address_collection: 'required',
    automatic_tax: { enabled: true },
    success_url: `${appUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/payments/cancel`,
    metadata: metadata || {}
  });

  return { url: session.url };
}
