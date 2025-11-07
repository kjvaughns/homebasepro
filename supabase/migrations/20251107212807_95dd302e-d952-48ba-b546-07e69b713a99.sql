-- Geofencing table
CREATE TABLE IF NOT EXISTS public.service_call_geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id UUID REFERENCES public.service_calls(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update location history with geofence events
ALTER TABLE public.service_call_location_history 
ADD COLUMN IF NOT EXISTS geofence_event TEXT CHECK (geofence_event IN ('enter', 'exit', 'dwell'));

-- Security audit log
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  method TEXT CHECK (method IN ('biometric', 'password', 'token')),
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Deep link analytics
CREATE TABLE IF NOT EXISTS public.deep_link_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_path TEXT NOT NULL,
  source TEXT,
  campaign TEXT,
  user_id UUID REFERENCES auth.users(id),
  converted BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- RevenueCat subscriptions enhancement
ALTER TABLE public.homeowner_subscriptions 
ADD COLUMN IF NOT EXISTS revenuecat_customer_id TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('web', 'app_store', 'play_store', 'stripe')),
ADD COLUMN IF NOT EXISTS entitlements JSONB;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deep_link_path ON public.deep_link_events(link_path);
CREATE INDEX IF NOT EXISTS idx_deep_link_timestamp ON public.deep_link_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_user ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON public.security_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_geofence_service_call ON public.service_call_geofences(service_call_id);

-- Enable RLS
ALTER TABLE public.service_call_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_link_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for geofences
CREATE POLICY "Providers can manage their geofences"
ON public.service_call_geofences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.service_calls sc
    WHERE sc.id = service_call_id
    AND sc.provider_org_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  )
);

-- RLS Policies for security audit
CREATE POLICY "Users can view their own security audit log"
ON public.security_audit_log
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert security audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- RLS Policies for deep links
CREATE POLICY "Users can view their own deep link events"
ON public.deep_link_events
FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anyone can track deep link events"
ON public.deep_link_events
FOR INSERT
WITH CHECK (true);