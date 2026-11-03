create or replace function public.validate_repair_request_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  mechanic_verified boolean;
begin
  if actor is null then return new; end if;

  if new.motorist_id is distinct from old.motorist_id
     or new.mechanic_id is distinct from old.mechanic_id
     or new.vehicle_id is distinct from old.vehicle_id
     or new.dispatch_attempts is distinct from old.dispatch_attempts
     or new.connection_fee_amount is distinct from old.connection_fee_amount
     or new.contact_unlocked_at is distinct from old.contact_unlocked_at then
    raise exception 'repair assignment and dispatch fields are server-managed';
  end if;

  if new.description is distinct from old.description
     or new.symptom is distinct from old.symptom
     or new.location_text is distinct from old.location_text
     or new.latitude is distinct from old.latitude
     or new.longitude is distinct from old.longitude
     or new.preferred_time is distinct from old.preferred_time then
    raise exception 'submitted repair details cannot be edited';
  end if;

  if new.status is not distinct from old.status then return new; end if;

  if actor = old.motorist_id then
    if not (
      (old.status in ('matching', 'offered', 'requested', 'accepted', 'connected') and new.status = 'cancelled')
      or (old.status = 'quoted' and new.status = 'approved')
      or (old.status = 'repair-complete' and new.status = 'paid')
      or (old.status = 'paid' and new.status = 'completed')
    ) then
      raise exception 'motorist is not allowed to make this repair status transition';
    end if;
  elsif actor = old.mechanic_id then
    select exists (
      select 1 from public.mechanic_profiles mp
      where mp.user_id = actor and mp.verified = true
    ) into mechanic_verified;

    if not mechanic_verified then
      raise exception 'mechanic must be verified before updating repair status';
    end if;

    if not (
      (old.status = 'connected' and new.status = 'en-route')
      or (old.status = 'en-route' and new.status = 'arrived')
      or (old.status = 'arrived' and new.status = 'inspected')
      or (old.status = 'inspected' and new.status = 'quoted')
      or (old.status = 'approved' and new.status = 'repairing')
      or (old.status = 'repairing' and new.status = 'repair-complete')
    ) then
      raise exception 'mechanic is not allowed to make this repair status transition';
    end if;
  else
    raise exception 'only repair participants may update repair status';
  end if;

  if new.status = 'inspected' and not exists (
    select 1 from public.inspections i where i.request_id = new.id
  ) then
    raise exception 'inspection must exist before marking the request inspected';
  end if;

  if new.status = 'quoted' and not exists (
    select 1 from public.repair_quotes q where q.request_id = new.id
  ) then
    raise exception 'quote must exist before marking the request quoted';
  end if;

  return new;
end;
$$;

drop policy if exists "mechanic_offers_select_own" on public.mechanic_offers;
create policy "mechanic_offers_select_own"
on public.mechanic_offers for select
to authenticated
using ((select auth.uid()) = mechanic_id);
