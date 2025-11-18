-- Add beta discount tracking and migrate existing plans
ALTER TABLE provider_subscriptions 
ADD COLUMN IF NOT EXISTS applied_coupon_id TEXT,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS beta_applied BOOLEAN DEFAULT false;

-- Add job completion tracking for free plan limits
CREATE TABLE IF NOT EXISTS job_completion_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  completed_jobs_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_org_id, month_year)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_tracking_org_month ON job_completion_tracking(provider_org_id, month_year);

-- Add app settings for beta mode
INSERT INTO app_settings (key, value, updated_at)
VALUES ('beta_mode', '{"enabled": true, "discount_percent": 50}'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE SET value = '{"enabled": true, "discount_percent": 50}'::jsonb, updated_at = NOW();

-- Migrate existing plans to new structure
-- Growth -> Starter (was $49, now $30 with beta = $15)
UPDATE organizations 
SET plan = 'starter', team_limit = 3, updated_at = NOW()
WHERE plan = 'growth';

UPDATE provider_subscriptions
SET plan = 'starter', beta_applied = true, discount_percent = 50, updated_at = NOW()
WHERE plan = 'growth';

-- Scale -> Pro (was $199, now $129 with beta = $64.50)
UPDATE organizations 
SET plan = 'pro', team_limit = 10, updated_at = NOW()
WHERE plan = 'scale';

UPDATE provider_subscriptions
SET plan = 'pro', beta_applied = true, discount_percent = 50, updated_at = NOW()
WHERE plan = 'scale';

-- Beta -> Starter (was $15, now $30 with beta = $15)
UPDATE organizations 
SET plan = 'starter', team_limit = 3, updated_at = NOW()
WHERE plan = 'beta';

UPDATE provider_subscriptions
SET plan = 'starter', beta_applied = true, discount_percent = 50, updated_at = NOW()
WHERE plan = 'beta';

-- Update free plan to have 0 team limit
UPDATE organizations 
SET team_limit = 0, updated_at = NOW()
WHERE plan = 'free';

-- Function to increment job completion count
CREATE OR REPLACE FUNCTION increment_job_completion(p_provider_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month_year TEXT;
  v_count INTEGER;
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  INSERT INTO job_completion_tracking (provider_org_id, month_year, completed_jobs_count)
  VALUES (p_provider_org_id, v_month_year, 1)
  ON CONFLICT (provider_org_id, month_year) 
  DO UPDATE SET 
    completed_jobs_count = job_completion_tracking.completed_jobs_count + 1,
    updated_at = NOW()
  RETURNING completed_jobs_count INTO v_count;
  
  RETURN v_count;
END;
$$;

-- Function to check if free plan can complete jobs
CREATE OR REPLACE FUNCTION can_complete_job(p_provider_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan TEXT;
  v_month_year TEXT;
  v_count INTEGER;
BEGIN
  -- Get organization plan
  SELECT plan INTO v_plan FROM organizations WHERE id = p_provider_org_id;
  
  -- If not free plan, always allow
  IF v_plan != 'free' THEN
    RETURN TRUE;
  END IF;
  
  -- Check current month's completed jobs
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  SELECT COALESCE(completed_jobs_count, 0) INTO v_count
  FROM job_completion_tracking
  WHERE provider_org_id = p_provider_org_id AND month_year = v_month_year;
  
  -- Free plan limit is 5 jobs per month
  RETURN COALESCE(v_count, 0) < 5;
END;
$$;

-- Trigger to track job completions
CREATE OR REPLACE FUNCTION track_job_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM increment_job_completion(NEW.provider_org_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_track_job_completion ON bookings;
CREATE TRIGGER trigger_track_job_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION track_job_completion();