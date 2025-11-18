-- Phase 1: Migrate provider_services data to services table and add any missing columns
-- This migration ensures all services from onboarding flow land in the correct table

-- First, check if we need to migrate any existing provider_services data
INSERT INTO public.services (
  organization_id,
  name,
  description,
  category,
  pricing_type,
  default_price,
  price_min,
  price_max,
  estimated_duration_minutes,
  duration_min_minutes,
  duration_max_minutes,
  is_active,
  is_recurring,
  created_at,
  updated_at
)
SELECT 
  ps.organization_id,
  ps.name,
  ps.description,
  -- Get organization's trade_type as category
  COALESCE(
    (SELECT trade_type FROM organizations WHERE id = ps.organization_id),
    'general'
  ) as category,
  'flat' as pricing_type,
  ps.base_price_cents as default_price,
  NULL as price_min,
  NULL as price_max,
  ps.duration_minutes as estimated_duration_minutes,
  NULL as duration_min_minutes,
  NULL as duration_max_minutes,
  true as is_active,
  false as is_recurring,
  ps.created_at,
  ps.updated_at
FROM public.provider_services ps
WHERE NOT EXISTS (
  -- Don't duplicate if already migrated
  SELECT 1 FROM public.services s 
  WHERE s.organization_id = ps.organization_id 
  AND s.name = ps.name
);

-- Add helpful comment
COMMENT ON TABLE public.services IS 'All services offered by providers. Replaces provider_services table.';
COMMENT ON COLUMN public.services.category IS 'Service category, typically matches organization trade_type';