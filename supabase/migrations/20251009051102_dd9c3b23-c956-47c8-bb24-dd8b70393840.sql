-- Helper function to increment referral counts atomically
CREATE OR REPLACE FUNCTION public.increment_referral_count(ref_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.referral_stats (referrer_code, total_referred, last_updated)
  VALUES (ref_code, 1, now())
  ON CONFLICT (referrer_code)
  DO UPDATE SET 
    total_referred = referral_stats.total_referred + 1,
    last_updated = now();
END;
$$;