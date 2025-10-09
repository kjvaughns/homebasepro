-- HomeBase Club Referral System Database Schema

-- Table 1: referral_profiles - Enhanced profiles with referral tracking
CREATE TABLE IF NOT EXISTS public.referral_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID REFERENCES public.waitlist(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by_code TEXT,
  ip_created INET,
  device_fingerprint TEXT,
  role TEXT CHECK (role IN ('provider', 'homeowner')) NOT NULL,
  rewards_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for referral_profiles
CREATE INDEX idx_referral_profiles_code ON public.referral_profiles(referral_code);
CREATE INDEX idx_referral_profiles_referred_by ON public.referral_profiles(referred_by_code);
CREATE INDEX idx_referral_profiles_ip ON public.referral_profiles(ip_created);
CREATE INDEX idx_referral_profiles_device ON public.referral_profiles(device_fingerprint);
CREATE INDEX idx_referral_profiles_waitlist ON public.referral_profiles(waitlist_id);

-- Table 2: referral_events - Track each successful referral
CREATE TABLE IF NOT EXISTS public.referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code TEXT NOT NULL,
  referred_profile_id UUID NOT NULL REFERENCES public.referral_profiles(id) ON DELETE CASCADE,
  ip INET,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referrer_code, referred_profile_id)
);

-- Indexes for referral_events
CREATE INDEX idx_referral_events_referrer ON public.referral_events(referrer_code);
CREATE INDEX idx_referral_events_created ON public.referral_events(created_at);

-- Table 3: referral_stats - Aggregated counts for fast UI
CREATE TABLE IF NOT EXISTS public.referral_stats (
  referrer_code TEXT PRIMARY KEY,
  total_referred INT DEFAULT 0,
  eligible_referred INT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- Table 4: rewards_ledger - Transparent reward tracking
CREATE TABLE IF NOT EXISTS public.rewards_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.referral_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  reward_type TEXT CHECK (reward_type IN ('provider_discount', 'homeowner_credit')) NOT NULL,
  amount NUMERIC(10,2) DEFAULT 0,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for rewards_ledger
CREATE INDEX idx_rewards_ledger_profile ON public.rewards_ledger(profile_id);
CREATE INDEX idx_rewards_ledger_created ON public.rewards_ledger(created_at);

-- Table 5: fraud_checks - Audit log for anti-fraud
CREATE TABLE IF NOT EXISTS public.fraud_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  ip INET,
  device_fingerprint TEXT,
  referrer_code TEXT,
  check_result TEXT CHECK (check_result IN ('pass', 'flag', 'block')) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fraud_checks
CREATE INDEX idx_fraud_checks_email ON public.fraud_checks(email);
CREATE INDEX idx_fraud_checks_phone ON public.fraud_checks(phone);
CREATE INDEX idx_fraud_checks_ip ON public.fraud_checks(ip);
CREATE INDEX idx_fraud_checks_device ON public.fraud_checks(device_fingerprint);
CREATE INDEX idx_fraud_checks_created ON public.fraud_checks(created_at);

-- Enable Row Level Security
ALTER TABLE public.referral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_profiles
CREATE POLICY "Users can view their own referral profile"
  ON public.referral_profiles
  FOR SELECT
  USING (
    waitlist_id IN (
      SELECT id FROM public.waitlist WHERE id = waitlist_id
    )
  );

CREATE POLICY "Users can insert their own referral profile"
  ON public.referral_profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own referral profile"
  ON public.referral_profiles
  FOR UPDATE
  USING (
    waitlist_id IN (
      SELECT id FROM public.waitlist WHERE id = waitlist_id
    )
  );

-- RLS Policies for referral_events (read-only for users, insert via edge functions)
CREATE POLICY "Users can view referral events"
  ON public.referral_events
  FOR SELECT
  USING (true);

-- RLS Policies for referral_stats (public read)
CREATE POLICY "Anyone can view referral stats"
  ON public.referral_stats
  FOR SELECT
  USING (true);

-- RLS Policies for rewards_ledger
CREATE POLICY "Users can view their own rewards"
  ON public.rewards_ledger
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.referral_profiles 
      WHERE waitlist_id IN (
        SELECT id FROM public.waitlist
      )
    )
  );

CREATE POLICY "Admins can view all rewards"
  ON public.rewards_ledger
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for fraud_checks (admin only)
CREATE POLICY "Admins can view fraud checks"
  ON public.fraud_checks
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage fraud checks"
  ON public.fraud_checks
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at on referral_profiles
CREATE TRIGGER update_referral_profiles_updated_at
  BEFORE UPDATE ON public.referral_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.referral_profiles WHERE referral_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;