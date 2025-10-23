export function readSecret(...keys: string[]) {
  for (const k of keys) {
    const v = Deno.env.get(k);
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function getStripeSecret() {
  const key = readSecret("STRIPE_SECRET_KEY_LIVE", "STRIPE_SECRET", "stripe_secret_key", "stripe");
  if (!key) throw new Error("NO_STRIPE_SECRET");
  return key;
}

export function getPublishableKey() {
  return readSecret("STRIPE_PUBLISHABLE_KEY_LIVE", "STRIPE_PUBLISHABLE_KEY", "stripe_publishable_key") || "";
}

export function getAppUrl() {
  return readSecret("APP_URL") || "https://homebaseproapp.com";
}

export function getCurrency() {
  return readSecret("CURRENCY") || "usd";
}

export function getPlatformFeePercent() {
  const raw = readSecret("PLATFORM_FEE_PERCENT");
  const n = raw ? Number(raw) : 5;
  return Number.isFinite(n) ? n / 100 : 0.05; // Return as decimal (5% = 0.05)
}

export function getWebhookSecret() {
  return readSecret("STRIPE_WEBHOOK_SECRET");
}

/**
 * Check if an environment variable exists without revealing its value
 */
export function has(name: string): boolean {
  return !!(Deno.env.get(name)?.trim());
}

/**
 * Get an environment variable value (trimmed)
 */
export function get(name: string): string | undefined {
  return Deno.env.get(name)?.trim();
}

/**
 * Resolve webhook secrets for both platform and Connect webhooks
 * Returns { platform, connect } where each can be null if not configured
 */
export function resolveWebhookSecrets(): { platform: string | null; connect: string | null } {
  // Platform webhooks: for subscriptions, checkout, etc.
  const platform = get('STRIPE_WEBHOOK_SECRET_PLATFORM') || get('STRIPE_WEBHOOK_SECRET') || null;
  
  // Connect webhooks: for account.updated, payout.paid, etc.
  const connect = get('STRIPE_WEBHOOK_SECRET_CONNECT') || null;
  
  return { platform, connect };
}
