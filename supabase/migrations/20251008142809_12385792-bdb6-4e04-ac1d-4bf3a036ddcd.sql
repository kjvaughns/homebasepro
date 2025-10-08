-- Fix admin_invites RLS policy to avoid accessing auth.users directly

-- Drop the existing policy that tries to access auth.users
DROP POLICY IF EXISTS "Invited users can view own invite" ON public.admin_invites;

-- Create a security definer function to get user email
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid();
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Invited users can view own invite"
ON public.admin_invites
FOR SELECT
USING (
  lower(email) = lower(get_user_email())
  AND status = 'pending'
);