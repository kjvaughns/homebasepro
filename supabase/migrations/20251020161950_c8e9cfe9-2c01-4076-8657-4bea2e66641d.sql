-- Extend service_requests table with AI fields
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS severity_level TEXT CHECK (severity_level IN ('low', 'moderate', 'high')),
ADD COLUMN IF NOT EXISTS likely_cause TEXT,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS estimated_min_cost NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_max_cost NUMERIC,
ADD COLUMN IF NOT EXISTS ai_scope_json JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS matched_providers JSONB DEFAULT '[]'::jsonb;

-- Create service_tags table
CREATE TABLE IF NOT EXISTS public.service_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create provider_capabilities table
CREATE TABLE IF NOT EXISTS public.provider_capabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.service_tags(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(provider_org_id, tag_id)
);

-- Create provider_onboarding_answers table
CREATE TABLE IF NOT EXISTS public.provider_onboarding_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create provider_metrics table
CREATE TABLE IF NOT EXISTS public.provider_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  on_time_rate NUMERIC DEFAULT 1.0 CHECK (on_time_rate >= 0 AND on_time_rate <= 1),
  response_speed_minutes NUMERIC DEFAULT 60,
  satisfaction_score NUMERIC DEFAULT 5.0 CHECK (satisfaction_score >= 0 AND satisfaction_score <= 5),
  repeat_customer_rate NUMERIC DEFAULT 0 CHECK (repeat_customer_rate >= 0 AND repeat_customer_rate <= 1),
  trust_score NUMERIC DEFAULT 5.0 CHECK (trust_score >= 0 AND trust_score <= 5),
  total_jobs_completed INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default service tags
INSERT INTO public.service_tags (name, category, description) VALUES
('HVAC Repair', 'HVAC', 'Air conditioning and heating system repairs'),
('HVAC Maintenance', 'HVAC', 'Regular HVAC tune-ups and maintenance'),
('Plumbing Repair', 'Plumbing', 'Fix leaks, clogs, and plumbing issues'),
('Drain Cleaning', 'Plumbing', 'Clear clogged drains and pipes'),
('Lawn Mowing', 'Lawn Care', 'Regular lawn cutting and maintenance'),
('Lawn Treatment', 'Lawn Care', 'Fertilization and weed control'),
('Gutter Cleaning', 'Exterior', 'Clean gutters and downspouts'),
('Pressure Washing', 'Exterior', 'Wash driveways, siding, and surfaces'),
('Window Cleaning', 'Cleaning', 'Interior and exterior window cleaning'),
('House Cleaning', 'Cleaning', 'General home cleaning services'),
('Electrical Repair', 'Electrical', 'Fix electrical issues and wiring'),
('Handyman', 'General', 'General repairs and maintenance')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.service_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_onboarding_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_tags (public read)
CREATE POLICY "Anyone can view service tags"
  ON public.service_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage service tags"
  ON public.service_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for provider_capabilities
CREATE POLICY "Anyone can view provider capabilities"
  ON public.provider_capabilities FOR SELECT
  USING (true);

CREATE POLICY "Providers can manage their own capabilities"
  ON public.provider_capabilities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = provider_capabilities.provider_org_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- RLS Policies for provider_onboarding_answers
CREATE POLICY "Providers can view their own onboarding answers"
  ON public.provider_onboarding_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = provider_onboarding_answers.provider_org_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert their own onboarding answers"
  ON public.provider_onboarding_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = provider_onboarding_answers.provider_org_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all onboarding answers"
  ON public.provider_onboarding_answers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for provider_metrics
CREATE POLICY "Anyone can view provider metrics"
  ON public.provider_metrics FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all provider metrics"
  ON public.provider_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to initialize provider metrics on organization creation
CREATE OR REPLACE FUNCTION public.initialize_provider_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.provider_metrics (provider_org_id)
  VALUES (NEW.id)
  ON CONFLICT (provider_org_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create metrics for new providers
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_provider_metrics();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_capabilities_provider ON public.provider_capabilities(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_provider_capabilities_tag ON public.provider_capabilities(tag_id);
CREATE INDEX IF NOT EXISTS idx_provider_metrics_trust_score ON public.provider_metrics(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_ai_summary ON public.service_requests USING gin(to_tsvector('english', ai_summary));
CREATE INDEX IF NOT EXISTS idx_service_requests_service_type ON public.service_requests(service_type);