-- Add per-user granular RBAC permissions JSONB column to public.admin_users.
-- Null means inherit default permissions for the user's role (super_admin, admin, editor).

begin;

alter table public.admin_users
  add column if not exists permissions jsonb;

commit;
