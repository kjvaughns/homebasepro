-- Add user_id to referral_profiles for direct auth.users linking
ALTER TABLE referral_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make waitlist_id nullable for new users who don't come from waitlist
ALTER TABLE referral_profiles 
ALTER COLUMN waitlist_id DROP NOT NULL;

-- Create index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_referral_profiles_user_id ON referral_profiles(user_id);

-- Update RLS policies to work with both user_id and legacy waitlist_id
DROP POLICY IF EXISTS "Users can view their own referral profile" ON referral_profiles;
CREATE POLICY "Users can view their own referral profile"
ON referral_profiles FOR SELECT
USING (
  user_id = auth.uid() 
  OR waitlist_id IN (
    SELECT id FROM waitlist WHERE email = get_user_email()
  )
);

DROP POLICY IF EXISTS "Users can update their own referral profile" ON referral_profiles;
CREATE POLICY "Users can update their own referral profile"
ON referral_profiles FOR UPDATE
USING (
  user_id = auth.uid() 
  OR waitlist_id IN (
    SELECT id FROM waitlist WHERE email = get_user_email()
  )
);

-- Allow authenticated users to insert their own referral profile
DROP POLICY IF EXISTS "Users can insert their own referral profile" ON referral_profiles;
CREATE POLICY "Users can insert their own referral profile"
ON referral_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Update referral_events to support user_id-based referrals
ALTER TABLE referral_events
ADD COLUMN IF NOT EXISTS referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_referral_events_referred_user_id ON referral_events(referred_user_id);