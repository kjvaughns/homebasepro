/**
 * Centralized platform fee configuration
 * Single source of truth for all fee calculations
 */

export type ProviderPlan = "free" | "beta" | "growth" | "pro" | "scale";

/**
 * Platform fee percentages by plan tier
 */
export const PLAN_FEE_PERCENT: Record<ProviderPlan, number> = {
  free: 0.08,        // 8%
  beta: 0.03,        // 3% (14-day trial)
  growth: 0.025,     // 2.5%
  pro: 0.02,         // 2%
  scale: 0.015       // 1.5%
};

/**
 * Full plan configuration including team limits and price IDs
 */
export const PLAN_CONFIG: Record<ProviderPlan, { 
  feePercent: number; 
  teamLimit: number; 
  priceId: string | null;
  displayName: string;
  trialDays?: number;
}> = {
  free: { 
    feePercent: 0.08, 
    teamLimit: 0, 
    priceId: null, 
    displayName: "Free" 
  },
  beta: { 
    feePercent: 0.03, 
    teamLimit: 3, 
    priceId: null, 
    displayName: "Pro Trial",
    trialDays: 14
  },
  growth: { 
    feePercent: 0.025, 
    teamLimit: 3, 
    priceId: "STRIPE_PRICE_GROWTH", 
    displayName: "Growth" 
  },
  pro: { 
    feePercent: 0.02, 
    teamLimit: 10, 
    priceId: "STRIPE_PRICE_PRO", 
    displayName: "Pro" 
  },
  scale: { 
    feePercent: 0.015, 
    teamLimit: 25, 
    priceId: "STRIPE_PRICE_SCALE", 
    displayName: "Scale" 
  }
};

/**
 * Get platform fee percentage for a given plan
 * @param plan Provider plan tier
 * @returns Fee as decimal (0.08 = 8%)
 */
export function getPlanFeePercent(plan: ProviderPlan | string | null | undefined): number {
  const normalizedPlan = (plan?.toLowerCase() || 'free') as ProviderPlan;
  return PLAN_FEE_PERCENT[normalizedPlan] ?? PLAN_FEE_PERCENT.free;
}

/**
 * Get full configuration for a plan
 */
export function getPlanConfig(plan: ProviderPlan | string | null | undefined) {
  const normalizedPlan = (plan?.toLowerCase() || 'free') as ProviderPlan;
  return PLAN_CONFIG[normalizedPlan] ?? PLAN_CONFIG.free;
}

/**
 * Calculate platform fee for a given amount
 * @param amountCents Amount in cents
 * @param plan Provider plan
 * @returns Fee amount in cents (rounded)
 */
export function calculatePlatformFee(amountCents: number, plan: ProviderPlan | string | null | undefined): number {
  const feePercent = getPlanFeePercent(plan);
  return Math.round(amountCents * feePercent);
}
