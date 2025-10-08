-- Add username field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Function to get user_id from email (for admin setup)
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant admin role to kjvaughns13@gmail.com
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID from email
  admin_user_id := get_user_id_by_email('kjvaughns13@gmail.com');
  
  -- Only proceed if user exists
  IF admin_user_id IS NOT NULL THEN
    -- Update profile with username
    UPDATE public.profiles
    SET username = 'KVAUGHNS'
    WHERE user_id = admin_user_id;
    
    -- Insert admin role (with conflict handling in case already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to kjvaughns13@gmail.com';
  ELSE
    RAISE NOTICE 'User with email kjvaughns13@gmail.com not found. Please sign up first, then run this migration again.';
  END IF;
END $$;