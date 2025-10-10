-- Create beta_access table to track invited users
CREATE TABLE public.beta_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  user_type TEXT NOT NULL CHECK (user_type IN ('homeowner', 'provider')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_beta_access_email ON public.beta_access(email);
CREATE INDEX idx_beta_access_status ON public.beta_access(status);

-- Enable RLS
ALTER TABLE public.beta_access ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage beta access"
  ON public.beta_access
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own invite
CREATE POLICY "Users can view their own beta invite"
  ON public.beta_access
  FOR SELECT
  USING (lower(email) = lower(get_user_email()) AND status = 'pending');

-- Create app_settings table for global controls
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage settings"
  ON public.app_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('registration_enabled', '{"homeowner": false, "provider": false}'::jsonb),
  ('beta_mode', 'true'::jsonb);

-- Create RPC function to check beta access
CREATE OR REPLACE FUNCTION public.check_beta_access(user_email TEXT, account_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  registration_allowed BOOLEAN;
  has_invite BOOLEAN;
BEGIN
  -- Check if registration is globally enabled for this user type
  SELECT (value->>account_type)::boolean INTO registration_allowed
  FROM app_settings
  WHERE key = 'registration_enabled';
  
  IF registration_allowed THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has a beta invite
  SELECT EXISTS (
    SELECT 1 FROM beta_access
    WHERE lower(email) = lower(user_email)
      AND user_type = account_type
      AND status = 'pending'
  ) INTO has_invite;
  
  RETURN has_invite;
END;
$$;