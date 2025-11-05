-- Phase 2: Add micro-rewards system fields
ALTER TABLE rewards_ledger 
ADD COLUMN IF NOT EXISTS reward_tier TEXT,
ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

-- Create reward tier enum values
COMMENT ON COLUMN rewards_ledger.reward_tier IS 'signup, milestone_3, milestone_5, milestone_10, milestone_25';

-- Phase 6: Create referral achievements table
CREATE TABLE IF NOT EXISTS referral_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for achievements
ALTER TABLE referral_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements"
  ON referral_achievements FOR SELECT
  USING (user_id = auth.uid());

-- Service role can manage achievements
CREATE POLICY "Service role can manage achievements"
  ON referral_achievements FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON referral_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_ledger_profile_status ON rewards_ledger(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_rewards_ledger_tier ON rewards_ledger(reward_tier);

-- Add comments for documentation
COMMENT ON TABLE referral_achievements IS 'Tracks gamification achievements for users';
COMMENT ON COLUMN referral_achievements.achievement_type IS 'first_steps, building_community, growth_champion, homebase_ambassador';