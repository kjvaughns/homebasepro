-- Function to check if any admin exists
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role
  );
$$;

-- Allow bootstrapping the very first admin without an invite
-- Only when no admins exist yet, and the user inserts a role for themselves
CREATE POLICY "Bootstrap first admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (NOT public.admin_exists()) AND (auth.uid() = user_id)
);
