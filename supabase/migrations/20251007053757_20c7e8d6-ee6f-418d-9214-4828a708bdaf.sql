-- Phase 3: Enhance service_plans table
ALTER TABLE public.service_plans 
ADD COLUMN is_recurring boolean NOT NULL DEFAULT true,
ADD COLUMN includes_features jsonb DEFAULT '[]'::jsonb;