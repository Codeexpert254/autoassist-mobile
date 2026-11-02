create or replace function public.sync_mechanic_verification_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.mechanic_profiles
  set verified = (new.status = 'approved'),
      updated_at = now()
  where user_id = new.user_id;
  return new;
end;
$$;

revoke all on function public.sync_mechanic_verification_approval() from public, anon, authenticated;

drop trigger if exists mechanic_verification_sync_approval on public.mechanic_verification_submissions;
create trigger mechanic_verification_sync_approval
after insert or update of status on public.mechanic_verification_submissions
for each row execute function public.sync_mechanic_verification_approval();
