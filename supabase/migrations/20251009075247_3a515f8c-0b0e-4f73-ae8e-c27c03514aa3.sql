-- Grant INSERT permission to anonymous users for waitlist signups
GRANT INSERT ON public.waitlist TO anon;

-- Grant SELECT to authenticated users (for admin dashboard)
GRANT SELECT ON public.waitlist TO authenticated;

-- Grant full permissions to authenticated role (admins will be filtered by RLS)
GRANT UPDATE, DELETE ON public.waitlist TO authenticated;

-- Ensure referral tables also have proper grants for edge functions
GRANT SELECT, INSERT, UPDATE ON public.referral_profiles TO anon;
GRANT SELECT, INSERT ON public.referral_events TO anon;
GRANT SELECT ON public.referral_stats TO anon;
GRANT SELECT ON public.rewards_ledger TO anon;