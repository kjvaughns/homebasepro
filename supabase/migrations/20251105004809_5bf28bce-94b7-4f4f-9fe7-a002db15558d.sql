-- Fix ensure_notification_preferences function to work with profiles trigger
-- The function was moved from auth.users trigger to profiles trigger
-- but still references NEW.id instead of NEW.user_id

CREATE OR REPLACE FUNCTION public.ensure_notification_preferences()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Since this trigger runs on profiles table, we can get the role directly
  user_role := NEW.user_type;
  
  -- Default to homeowner if not found
  user_role := COALESCE(user_role, 'homeowner');
  
  -- Create default preferences using NEW.user_id (not NEW.id)
  INSERT INTO notification_preferences (user_id, role)
  VALUES (NEW.user_id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;