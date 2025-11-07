-- Create table for tracking service call location history
CREATE TABLE IF NOT EXISTS public.service_call_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id UUID NOT NULL REFERENCES public.service_calls(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.service_call_location_history ENABLE ROW LEVEL SECURITY;

-- Create policies for service call location history
CREATE POLICY "Providers can view their service call locations"
  ON public.service_call_location_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_calls
      JOIN public.organizations ON organizations.id = service_calls.provider_org_id
      WHERE service_calls.id = service_call_location_history.service_call_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert their service call locations"
  ON public.service_call_location_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_calls
      JOIN public.organizations ON organizations.id = service_calls.provider_org_id
      WHERE service_calls.id = service_call_location_history.service_call_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_service_call_location_history_service_call_id 
  ON public.service_call_location_history(service_call_id);
  
CREATE INDEX IF NOT EXISTS idx_service_call_location_history_timestamp 
  ON public.service_call_location_history(timestamp DESC);