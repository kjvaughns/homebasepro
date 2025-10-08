-- Drop the dependent policy first
DROP POLICY IF EXISTS "Invited user can claim role" ON public.user_roles;

-- Fix the can_accept_invite function to use admin_invites instead of staff_invites
DROP FUNCTION IF EXISTS public.can_accept_invite(uuid);

CREATE OR REPLACE FUNCTION public.can_accept_invite(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_invites i
    JOIN auth.users u ON true
    WHERE u.id = _user_id
      AND lower(i.email) = lower(u.email)
      AND i.status = 'pending'
  );
$$;

-- Recreate the policy
CREATE POLICY "Invited user can claim role" ON public.user_roles
FOR INSERT
WITH CHECK (can_accept_invite(auth.uid()));

-- Create a secure function to accept admin invites (bypasses RLS)
CREATE OR REPLACE FUNCTION public.accept_admin_invite(invite_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.admin_invites
  SET status = 'accepted', accepted_at = now()
  WHERE lower(email) = lower(invite_email)
    AND status = 'pending';
END;
$$;