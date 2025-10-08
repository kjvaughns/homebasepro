-- Fix function search path security warning
DROP FUNCTION IF EXISTS get_user_id_by_email(text);

CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;
  
  RETURN user_uuid;
END;
$$;