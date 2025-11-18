/**
 * Centralized platform fee configuration
 * Single source of truth for all fee calculations
 */

export type ProviderPlan = "free" | "starter" | "pro";

/**
 * Platform fee percentages by plan tier
 */
export const PLAN_FEE_PERCENT: Record<ProviderPlan, number> = {
  free: 0.08,        // 8%
  starter: 0.04,     // 4%
  pro: 0.02,         // 2%
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
  monthlyPrice: number;
  jobLimit?: number;
}> = {
  free: { 
    feePercent: 0.08, 
    teamLimit: 0, 
    priceId: null, 
    displayName: "Free",
    monthlyPrice: 0,
    jobLimit: 5 // 5 completed jobs per month
  },
  starter: { 
    feePercent: 0.04, 
    teamLimit: 3, 
    priceId: "STRIPE_PRICE_STARTER", 
    displayName: "Starter",
    trialDays: 7,
    monthlyPrice: 30
  },
  pro: { 
    feePercent: 0.02, 
    teamLimit: 10, 
    priceId: "STRIPE_PRICE_PRO", 
    displayName: "Pro",
    trialDays: 7,
    monthlyPrice: 129
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
