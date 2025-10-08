-- 1) Create staff and staff_invites tables
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  role app_role NOT NULL DEFAULT 'moderator',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

-- 2) Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- 3) Helper function: invited user can accept
CREATE OR REPLACE FUNCTION public.can_accept_invite(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_invites i
    JOIN auth.users u ON true
    WHERE u.id = _user_id
      AND lower(i.email) = lower(u.email)
      AND i.status = 'pending'
  );
$$;

-- 4) Policies for staff
CREATE POLICY "Admins can view staff"
ON public.staff FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert staff"
ON public.staff FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update staff"
ON public.staff FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete staff"
ON public.staff FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view own record"
ON public.staff FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Staff can update own record"
ON public.staff FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Invited users can insert self staff"
ON public.staff FOR INSERT TO authenticated
WITH CHECK (
  public.can_accept_invite(auth.uid())
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 5) Policies for staff_invites
CREATE POLICY "Admins can view invites"
ON public.staff_invites FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert invites"
ON public.staff_invites FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invites"
ON public.staff_invites FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invites"
ON public.staff_invites FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Invited user can view own invite"
ON public.staff_invites FOR SELECT TO authenticated
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) IS NOT NULL
  AND lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- 6) Allow invited users to insert their role into user_roles once authenticated
CREATE POLICY "Invited user can claim role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.can_accept_invite(auth.uid()));

-- 7) Trigger to update updated_at on staff
DROP TRIGGER IF EXISTS trg_staff_updated_at ON public.staff;
CREATE TRIGGER trg_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();