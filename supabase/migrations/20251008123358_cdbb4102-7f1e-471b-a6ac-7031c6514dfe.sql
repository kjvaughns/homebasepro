-- Seed initial admin invite for owner
INSERT INTO public.staff_invites (email, full_name, role, status, invited_by)
VALUES ('kjvaughns13@gmail.com', 'KJ Vaughns', 'admin', 'pending', NULL)
ON CONFLICT (email)
DO UPDATE SET role = EXCLUDED.role, status = 'pending', invited_at = now();