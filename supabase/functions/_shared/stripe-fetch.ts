import { getStripeSecret } from './env.ts';

/**
 * Pure fetch-based Stripe API client (no Node.js dependencies)
 * Works natively in Deno Edge runtime
 */

export interface StripeError {
  type?: string;
  code?: string;
  message?: string;
  param?: string;
  decline_code?: string;
}

/**
 * Flatten nested objects into Stripe's bracket notation format
 * Example: { line_items: [{ price: 'x' }] } -> line_items[0][price]=x
 */
function flattenParams(obj: any, prefix = ''): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  
  for (const [key, value] of Object.entries(obj)) {
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

/**
 * POST to Stripe API with form-encoded body
 */
export async function stripePost(
  path: string,
  params: Record<string, any> = {},
  stripeAccount?: string
): Promise<any> {
  const body = new URLSearchParams();
  const flattened = flattenParams(params);
  
  for (const [key, value] of flattened) {
    body.append(key, value);
  }
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${getStripeSecret()}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  
  if (stripeAccount) {
    headers['Stripe-Account'] = stripeAccount;
  }
  
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers,
    body,
  });
  
  const json = await res.json();
  
  if (!res.ok) {
    const error = new Error(json.error?.message || `Stripe API error: ${path}`);
    (error as any).stripeError = json.error;
    throw error;
  }
  
  return json;
}

/**
 * GET from Stripe API
 */
export async function stripeGet(
  path: string,
  stripeAccount?: string
): Promise<any> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${getStripeSecret()}`,
  };
  
  if (stripeAccount) {
    headers['Stripe-Account'] = stripeAccount;
  }
  
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'GET',
    headers,
  });
  
  const json = await res.json();
  
  if (!res.ok) {
    const error = new Error(json.error?.message || `Stripe API error: ${path}`);
    (error as any).stripeError = json.error;
    throw error;
  }
  
  return json;
}

/**
 * Format Stripe error for logging
 */
export function formatStripeError(error: any): StripeError {
  return {
    type: error?.stripeError?.type || error?.type,
    code: error?.stripeError?.code || error?.code,
    decline_code: error?.stripeError?.decline_code || error?.decline_code,
    message: error?.stripeError?.message || error?.message,
    param: error?.stripeError?.param || error?.param,
  };
}
