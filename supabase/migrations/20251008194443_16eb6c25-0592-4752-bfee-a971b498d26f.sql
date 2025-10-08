-- Ensure case-insensitive lookup for user emails
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE lower(email) = lower(user_email);
  
  RETURN user_uuid;
END;
$function$;