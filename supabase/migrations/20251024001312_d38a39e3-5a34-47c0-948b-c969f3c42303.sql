-- Update the handle_new_user() function to auto-link existing client records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, user_id, email, full_name)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
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
$$ LANGUAGE plpgsql SECURITY DEFINER;