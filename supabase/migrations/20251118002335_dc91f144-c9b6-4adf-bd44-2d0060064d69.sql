-- Create job_events table for tracking job status changes
CREATE TABLE IF NOT EXISTS public.job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  coords JSONB,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

-- Providers can view events for their jobs
CREATE POLICY "Providers can view their job events"
  ON public.job_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = job_events.booking_id
      AND bookings.provider_org_id IN (
        SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Providers can insert events for their jobs
CREATE POLICY "Providers can insert their job events"
  ON public.job_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = job_events.booking_id
      AND bookings.provider_org_id IN (
        SELECT id FROM public.organizations WHERE owner_id = auth.uid()
      )
    )
  );

-- Service role can manage all events
CREATE POLICY "Service role can manage job events"
  ON public.job_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_events_booking_id ON public.job_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_events_created_at ON public.job_events(created_at DESC);