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
