create or replace function public.register_mechanic_identity_fingerprint(
  p_user_id uuid,
  p_identity_hmac text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_user uuid;
begin
  select f.user_id
    into existing_user
  from private.mechanic_identity_fingerprints f
  where f.identity_hmac = p_identity_hmac
  limit 1;

  if existing_user is not null and existing_user <> p_user_id then
    return false;
  end if;

  insert into private.mechanic_identity_fingerprints (user_id, identity_hmac, updated_at)
  values (p_user_id, p_identity_hmac, now())
  on conflict (user_id) do update
    set identity_hmac = excluded.identity_hmac,
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.register_mechanic_identity_fingerprint(uuid, text)
from public, anon, authenticated;

grant execute on function public.register_mechanic_identity_fingerprint(uuid, text)
to service_role;
