-- Create debug logging table for signup errors
CREATE TABLE IF NOT EXISTS public.signup_debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  stage TEXT NOT NULL,
  email TEXT,
  error TEXT
);

-- Enable RLS on debug logs (admins only)
ALTER TABLE public.signup_debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view signup debug logs"
  ON public.signup_debug_logs
  FOR SELECT
  USING (public.is_admin());

-- Update handle_new_user function to catch and log client-link errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user with correct schema
  INSERT INTO public.profiles (user_id, full_name, phone, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'homeowner')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-link to existing client records with matching email
  -- This happens when a client pays an invoice before having an account
  -- Wrapped in BEGIN...EXCEPTION to prevent signup blocking if this fails
  BEGIN
    UPDATE clients
    SET 
      user_id = NEW.id,
      homeowner_profile_id = (
        SELECT id FROM profiles WHERE user_id = NEW.id LIMIT 1
      )
    WHERE 
      email = NEW.email 
      AND user_id IS NULL;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't block signup
      INSERT INTO public.signup_debug_logs (stage, email, error)
      VALUES ('link_clients', NEW.email, SQLERRM);
  END;

  RETURN NEW;
END;
$$;