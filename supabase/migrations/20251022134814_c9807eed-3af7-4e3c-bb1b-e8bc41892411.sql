-- Bug #5: Add bedrooms/bathrooms to homes table
ALTER TABLE public.homes 
ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(3,1);

-- Bug #4: Service assessment tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_completed_service_assessment BOOLEAN DEFAULT FALSE;

-- Bug #6: Maintenance plans storage
CREATE TABLE IF NOT EXISTS public.homeowner_maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.homeowner_maintenance_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own maintenance plans"
  ON public.homeowner_maintenance_plans FOR SELECT
  USING (homeowner_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own maintenance plans"
  ON public.homeowner_maintenance_plans FOR INSERT
  WITH CHECK (homeowner_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));