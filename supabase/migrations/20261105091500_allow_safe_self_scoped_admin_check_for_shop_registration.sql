-- Mobile Parts Dealer registration was blocked by 42501:
-- "permission denied for function is_autoassist_admin".
-- Both parts_shops INSERT security trigger and its SELECT RLS policy use
-- this helper, which previously granted EXECUTE only to service_role.
-- Expose only the signed-in caller's own admin status to authenticated clients.
create or replace function public.is_autoassist_admin(
  p_user_id uuid,
  p_required_role text default null
)
returns boolean language sql stable security definer
set search_path = ''
as $function$
  select (
    auth.uid() is null
    or auth.uid() = p_user_id
  ) and exists(
    select 1 from private.admin_users a
    where a.user_id=p_user_id
      and a.active=true
      and (a.admin_role='super_admin'
        or p_required_role is null
        or a.admin_role=p_required_role)
  );
$function$;
revoke execute on function public.is_autoassist_admin(uuid,text) from public,anon;
grant execute on function public.is_autoassist_admin(uuid,text) to authenticated,service_role;
