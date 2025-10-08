-- Secure function to check pending admin invite by email (pre-auth)
create or replace function public.check_admin_invite(invite_email text)
returns table (
  full_name text,
  phone text,
  role app_role,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select i.full_name, i.phone, i.role, i.status
  from public.admin_invites i
  where lower(i.email) = lower(invite_email)
    and i.status = 'pending'
  limit 1;
$$;

-- Ensure the function is callable by both anonymous and authenticated clients
grant execute on function public.check_admin_invite(text) to anon, authenticated;