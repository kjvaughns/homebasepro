-- Fix the handle_new_user() function to match the profiles table schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
  UPDATE clients
  SET 
    user_id = NEW.id,
    homeowner_profile_id = (
      SELECT id FROM profiles WHERE user_id = NEW.id LIMIT 1
    )
  WHERE 
    email = NEW.email 
    AND user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;