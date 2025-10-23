-- Add billing and onboarding columns to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_beta BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- Create properties table for homeowner onboarding
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Homeowner CRUD on own properties
CREATE POLICY "Homeowners manage properties"
  ON properties FOR ALL
  USING (homeowner_id = auth.uid())
  WITH CHECK (homeowner_id = auth.uid());

-- Populate app_settings
INSERT INTO app_settings (key, value) VALUES
  ('registration_open', 'true'::jsonb),
  ('beta_price_monthly', '15'::jsonb),
  ('beta_trial_days', '14'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;