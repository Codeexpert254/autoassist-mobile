create table if not exists private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  admin_role text not null default 'verification_admin' check (admin_role in ('super_admin','verification_admin','support_admin','finance_admin','ops_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists admin_users_created_by_idx on private.admin_users(created_by);
create index if not exists admin_users_active_role_idx on private.admin_users(active, admin_role);

insert into private.admin_users (user_id, admin_role, active, created_at, created_by)
select user_id, 'super_admin', true, created_at, created_by
from private.verification_admins
on conflict (user_id) do update
set admin_role = 'super_admin', active = true;

revoke all on table private.admin_users from public, anon, authenticated;
grant select, insert, update, delete on table private.admin_users to service_role;

create or replace function public.is_autoassist_admin(
  p_user_id uuid,
  p_required_role text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.admin_users a
    where a.user_id = p_user_id
      and a.active = true
      and (
        a.admin_role = 'super_admin'
        or p_required_role is null
        or a.admin_role = p_required_role
      )
  );
$$;

revoke all on function public.is_autoassist_admin(uuid, text) from public, anon, authenticated;
grant execute on function public.is_autoassist_admin(uuid, text) to service_role;
