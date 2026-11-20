create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = (select auth.uid())
      and is_active = true
      and role = 'super_admin'
  );
$$;

grant execute on function private.is_super_admin() to authenticated;

alter policy "Super admins can manage admin_users" on public.admin_users
  using (private.is_super_admin())
  with check (private.is_super_admin());
