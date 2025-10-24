-- Create calendar integrations table
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  calendar_id TEXT,
  calendar_name TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('import_only', 'export_only', 'bidirectional')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, provider)
);

-- Create calendar sync logs table
CREATE TABLE IF NOT EXISTS public.calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.calendar_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('import', 'export', 'full')),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  events_synced INTEGER DEFAULT 0,
  events_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create provider booking links table
CREATE TABLE IF NOT EXISTS public.provider_booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  custom_message TEXT,
  require_precheck BOOLEAN DEFAULT false,
  auto_confirm BOOLEAN DEFAULT false,
  booking_window_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id)
);

-- Add external calendar event ID to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS external_calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS is_calendar_block BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calendar_sync_status TEXT CHECK (calendar_sync_status IN ('synced', 'pending', 'failed', 'not_synced'));

-- Enable RLS
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_booking_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_integrations
CREATE POLICY "Providers can manage their calendar integrations"
  ON public.calendar_integrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = calendar_integrations.organization_id
        AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all calendar integrations"
  ON public.calendar_integrations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for calendar_sync_logs
CREATE POLICY "Providers can view their sync logs"
  ON public.calendar_sync_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_integrations ci
      JOIN public.organizations o ON o.id = ci.organization_id
      WHERE ci.id = calendar_sync_logs.integration_id
        AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all sync logs"
  ON public.calendar_sync_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for provider_booking_links
CREATE POLICY "Providers can manage their booking links"
  ON public.provider_booking_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = provider_booking_links.organization_id
        AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active booking links"
  ON public.provider_booking_links
  FOR SELECT
  USING (is_active = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_org ON public.calendar_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_integration ON public.calendar_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_provider_booking_links_slug ON public.provider_booking_links(slug);
CREATE INDEX IF NOT EXISTS idx_bookings_external_calendar_event ON public.bookings(external_calendar_event_id) WHERE external_calendar_event_id IS NOT NULL;

-- Create updated_at trigger for calendar_integrations
CREATE TRIGGER update_calendar_integrations_updated_at
  BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for provider_booking_links
CREATE TRIGGER update_provider_booking_links_updated_at
  BEFORE UPDATE ON public.provider_booking_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();