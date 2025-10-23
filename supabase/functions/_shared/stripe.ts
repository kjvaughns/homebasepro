import Stripe from 'https://esm.sh/stripe@14.21.0';
import { getStripeSecret } from './env.ts';

export function createStripeClient() {
  return new Stripe(getStripeSecret(), { apiVersion: '2023-10-16' });
}

export function isLiveMode() {
  try {
    return getStripeSecret().startsWith('sk_live_');
  } catch {
    return false;
  }
}

export function formatStripeError(error: any) {
  return {
    type: error?.type,
    code: error?.code,
    decline_code: error?.decline_code,
    message: error?.message,
    raw: error?.raw,
  };
}
