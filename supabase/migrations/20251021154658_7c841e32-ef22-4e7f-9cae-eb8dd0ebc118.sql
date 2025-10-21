-- Fix Security Issue: Enable RLS on waitlist table
-- This table has policies defined but RLS was not enabled
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Fix Security Issue: Recreate admin views with security_invoker to prevent RLS bypass
-- These views should respect the RLS policies of the querying user, not the view creator

-- Recreate admin_revenue_summary with security_invoker
DROP VIEW IF EXISTS public.admin_revenue_summary;
CREATE VIEW public.admin_revenue_summary 
WITH (security_invoker = true) AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as subscription_count,
  SUM(CASE 
    WHEN status = 'active' THEN billing_amount 
    ELSE 0 
  END) as mrr,
  SUM(CASE 
    WHEN status = 'active' THEN billing_amount * 12 
    ELSE 0 
  END) as arr
FROM public.homeowner_subscriptions
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Recreate admin_user_stats with security_invoker
DROP VIEW IF EXISTS public.admin_user_stats;
CREATE VIEW public.admin_user_stats 
WITH (security_invoker = true) AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  user_type,
  COUNT(*) as count
FROM public.profiles
GROUP BY DATE_TRUNC('day', created_at), user_type
ORDER BY date DESC;

-- Recreate admin_referral_stats with security_invoker
DROP VIEW IF EXISTS public.admin_referral_stats;
CREATE VIEW public.admin_referral_stats 
WITH (security_invoker = true) AS
SELECT 
  COUNT(DISTINCT rp.id) as total_profiles,
  COUNT(DISTINCT re.id) as total_events,
  COALESCE(SUM(rs.total_referred), 0) as total_referrals,
  COALESCE(SUM(rs.eligible_referred), 0) as total_eligible,
  COUNT(DISTINCT CASE WHEN rl.reward_type = 'service_credit' THEN rl.id END) as credits_issued,
  COALESCE(SUM(CASE WHEN rl.reward_type = 'service_credit' THEN rl.amount ELSE 0 END), 0) as total_credit_value,
  COUNT(DISTINCT CASE WHEN rl.reward_type = 'provider_discount' THEN rl.id END) as discounts_issued
FROM referral_profiles rp
LEFT JOIN referral_events re ON re.referred_profile_id = rp.id
LEFT JOIN referral_stats rs ON rs.referrer_code = rp.referral_code
LEFT JOIN rewards_ledger rl ON rl.profile_id = rp.id;

-- Recreate admin_credit_expenses with security_invoker
DROP VIEW IF EXISTS public.admin_credit_expenses;
CREATE VIEW public.admin_credit_expenses 
WITH (security_invoker = true) AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as credits_issued,
  SUM(amount) as total_expense,
  COUNT(CASE WHEN status = 'applied' THEN 1 END) as credits_redeemed,
  SUM(CASE WHEN status = 'applied' THEN amount ELSE 0 END) as expense_realized,
  SUM(CASE WHEN status = 'issued' THEN amount ELSE 0 END) as outstanding_liability
FROM rewards_ledger
WHERE reward_type = 'service_credit'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;