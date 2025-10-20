-- Add memory fields to homes table
ALTER TABLE public.homes
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lot_acres NUMERIC,
ADD COLUMN IF NOT EXISTS hvac_system_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS water_heater_type TEXT,
ADD COLUMN IF NOT EXISTS gate_code TEXT,
ADD COLUMN IF NOT EXISTS pets TEXT,
ADD COLUMN IF NOT EXISTS access_notes TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'app',
ADD COLUMN IF NOT EXISTS maintenance_score INTEGER DEFAULT 50 CHECK (maintenance_score >= 0 AND maintenance_score <= 100);

-- Add default_property_id to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_property_id UUID REFERENCES public.homes(id) ON DELETE SET NULL;

-- Create client_profiles table (provider view of homeowners)
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  homeowner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_preferences JSONB DEFAULT '{"call": true, "text": true, "email": true}'::jsonb,
  service_history_summary TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(home_id, provider_org_id)
);

-- Create property_systems table (track major equipment)
CREATE TABLE IF NOT EXISTS public.property_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  system_type TEXT NOT NULL CHECK (system_type IN ('hvac', 'water_heater', 'roof', 'appliance', 'other')),
  manufacturer TEXT,
  model TEXT,
  install_date DATE,
  warranty_expires DATE,
  last_service_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_systems ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_profiles
CREATE POLICY "Providers can view client profiles for their jobs"
ON public.client_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = client_profiles.provider_org_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Providers can manage their client profiles"
ON public.client_profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = client_profiles.provider_org_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Homeowners can view their client profiles"
ON public.client_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = client_profiles.homeowner_profile_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all client profiles"
ON public.client_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for property_systems
CREATE POLICY "Users can manage systems for their homes"
ON public.property_systems FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.homes
    JOIN public.profiles ON profiles.id = homes.owner_id
    WHERE homes.id = property_systems.home_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can view systems for homes with bookings"
ON public.property_systems FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    JOIN public.organizations ON organizations.id = bookings.provider_org_id
    WHERE bookings.home_id = property_systems.home_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all property systems"
ON public.property_systems FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_homes_is_default ON public.homes(owner_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_profiles_default_property ON public.profiles(default_property_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_home ON public.client_profiles(home_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_provider ON public.client_profiles(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_property_systems_home ON public.property_systems(home_id);

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_systems_updated_at
  BEFORE UPDATE ON public.property_systems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();