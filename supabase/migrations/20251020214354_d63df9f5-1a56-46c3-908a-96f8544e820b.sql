-- Phase 1: Enhance organizations table with marketplace data
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS avg_response_time_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS completion_rate numeric DEFAULT 0.95,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_city ON public.organizations(city);
CREATE INDEX IF NOT EXISTS idx_organizations_verified ON public.organizations(verified);

-- Update provider_metrics for richer data
ALTER TABLE public.provider_metrics
ADD COLUMN IF NOT EXISTS jobs_completed_last_month integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating numeric DEFAULT 5.0;

-- Create provider_promotions table for deals
CREATE TABLE IF NOT EXISTS public.provider_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  discount_percent integer,
  discount_amount integer,
  promo_code text,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_promotions ENABLE ROW LEVEL SECURITY;

-- RLS policies for provider_promotions
CREATE POLICY "Anyone can view active promotions"
ON public.provider_promotions FOR SELECT
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

CREATE POLICY "Providers can manage their promotions"
ON public.provider_promotions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = provider_promotions.provider_org_id
    AND organizations.owner_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_provider_promotions_updated_at
BEFORE UPDATE ON public.provider_promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();