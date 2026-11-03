alter table public.mechanic_profiles
  add column if not exists is_available boolean not null default false,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_updated_at timestamptz,
  add column if not exists availability_updated_at timestamptz,
  add column if not exists last_active_at timestamptz,
  add column if not exists completed_jobs integer not null default 0,
  add column if not exists accepted_offers integer not null default 0,
  add column if not exists declined_offers integer not null default 0,
  add column if not exists expired_offers integer not null default 0;

alter table public.mechanic_profiles
  drop constraint if exists mechanic_profiles_latitude_check,
  drop constraint if exists mechanic_profiles_longitude_check,
  drop constraint if exists mechanic_profiles_available_location_check,
  add constraint mechanic_profiles_latitude_check check (latitude is null or latitude between -90 and 90),
  add constraint mechanic_profiles_longitude_check check (longitude is null or longitude between -180 and 180),
  add constraint mechanic_profiles_available_location_check check (not is_available or (latitude is not null and longitude is not null));

alter table public.repair_requests
  alter column mechanic_id drop not null,
  alter column vehicle_id drop not null,
  add column if not exists dispatch_attempts integer not null default 0,
  add column if not exists connection_fee_amount numeric(12,2) not null default 500,
  add column if not exists contact_unlocked_at timestamptz;

alter table public.repair_requests drop constraint if exists repair_requests_status_check;
alter table public.repair_requests
  add constraint repair_requests_status_check check (
    status in (
      'matching', 'offered', 'requested', 'accepted', 'connected', 'en-route', 'arrived', 'inspected',
      'quoted', 'approved', 'repairing', 'repair-complete', 'paid', 'completed', 'cancelled'
    )
  );

create table if not exists public.mechanic_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.repair_requests(id) on delete cascade,
  mechanic_id uuid not null references public.mechanic_profiles(user_id) on delete cascade,
  rank integer not null default 1 check (rank > 0),
  distance_km numeric(10,2),
  match_score numeric(6,2) not null default 0 check (match_score between 0 and 100),
  status text not null default 'offered' check (status in ('offered', 'accepted', 'declined', 'expired', 'cancelled')),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id, mechanic_id)
);

create unique index if not exists mechanic_offers_one_active_per_request_idx
  on public.mechanic_offers(request_id) where status = 'offered';
create index if not exists mechanic_offers_mechanic_status_idx
  on public.mechanic_offers(mechanic_id, status, expires_at);
create index if not exists mechanic_offers_request_idx on public.mechanic_offers(request_id);

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  device_name text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists device_push_tokens_user_idx on public.device_push_tokens(user_id, enabled);

create table if not exists public.connection_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.repair_requests(id) on delete cascade,
  motorist_id uuid not null references public.profiles(id) on delete cascade,
  mechanic_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null default 500 check (amount > 0),
  currency text not null default 'KES' check (currency = 'KES'),
  provider text not null default 'mpesa' check (provider = 'mpesa'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  phone text,
  merchant_request_id text,
  checkout_request_id text unique,
  mpesa_receipt_number text,
  provider_result_code text,
  provider_result_message text,
  initiated_at timestamptz not null default now(),
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists connection_payments_motorist_idx on public.connection_payments(motorist_id, status);
create index if not exists connection_payments_mechanic_idx on public.connection_payments(mechanic_id, status);

create or replace function public.protect_mechanic_system_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role') then
    if tg_op = 'INSERT' then
      new.verified := false;
      new.rating := 0;
      new.reviews_count := 0;
      new.completed_jobs := 0;
      new.accepted_offers := 0;
      new.declined_offers := 0;
      new.expired_offers := 0;
      new.is_available := false;
      new.availability_updated_at := null;
      new.location_updated_at := case when new.latitude is not null and new.longitude is not null then now() else null end;
      new.last_active_at := now();
    else
      if new.verified is distinct from old.verified
         or new.rating is distinct from old.rating
         or new.reviews_count is distinct from old.reviews_count
         or new.completed_jobs is distinct from old.completed_jobs
         or new.accepted_offers is distinct from old.accepted_offers
         or new.declined_offers is distinct from old.declined_offers
         or new.expired_offers is distinct from old.expired_offers then
        raise exception 'mechanic verification, rating and dispatch metrics are server-managed';
      end if;

      if new.is_available and not old.verified then
        raise exception 'mechanic must be verified before going available';
      end if;

      if new.is_available and (new.latitude is null or new.longitude is null) then
        raise exception 'location is required before going available';
      end if;

      if new.is_available is distinct from old.is_available then
        new.availability_updated_at := now();
      else
        new.availability_updated_at := old.availability_updated_at;
      end if;

      if new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude then
        new.location_updated_at := now();
      else
        new.location_updated_at := old.location_updated_at;
      end if;

      new.last_active_at := now();
    end if;
  end if;
  return new;
end;
$$;

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

  if new.status = 'inspected' and not exists (select 1 from public.inspections i where i.request_id = new.id) then
    raise exception 'inspection must exist before marking the request inspected';
  end if;
  if new.status = 'quoted' and not exists (select 1 from public.repair_quotes q where q.request_id = new.id) then
    raise exception 'quote must exist before marking the request quoted';
  end if;
  return new;
end;
$$;

create or replace function public.update_mechanic_dispatch_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'accepted' then
      update public.mechanic_profiles set accepted_offers = accepted_offers + 1 where user_id = new.mechanic_id;
    elsif new.status = 'declined' then
      update public.mechanic_profiles set declined_offers = declined_offers + 1 where user_id = new.mechanic_id;
    elsif new.status = 'expired' then
      update public.mechanic_profiles set expired_offers = expired_offers + 1 where user_id = new.mechanic_id;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.update_mechanic_completed_jobs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'completed' and new.mechanic_id is not null then
    update public.mechanic_profiles
    set completed_jobs = completed_jobs + 1,
        is_available = false,
        availability_updated_at = now()
    where user_id = new.mechanic_id;
  end if;
  return new;
end;
$$;

revoke all on function public.update_mechanic_dispatch_metrics() from public, anon, authenticated;
revoke all on function public.update_mechanic_completed_jobs() from public, anon, authenticated;

drop trigger if exists mechanic_offers_set_updated_at on public.mechanic_offers;
create trigger mechanic_offers_set_updated_at before update on public.mechanic_offers
for each row execute function public.set_updated_at();

drop trigger if exists device_push_tokens_set_updated_at on public.device_push_tokens;
create trigger device_push_tokens_set_updated_at before update on public.device_push_tokens
for each row execute function public.set_updated_at();

drop trigger if exists connection_payments_set_updated_at on public.connection_payments;
create trigger connection_payments_set_updated_at before update on public.connection_payments
for each row execute function public.set_updated_at();

drop trigger if exists mechanic_offers_update_metrics on public.mechanic_offers;
create trigger mechanic_offers_update_metrics after update of status on public.mechanic_offers
for each row execute function public.update_mechanic_dispatch_metrics();

drop trigger if exists repair_requests_update_completed_jobs on public.repair_requests;
create trigger repair_requests_update_completed_jobs after update of status on public.repair_requests
for each row execute function public.update_mechanic_completed_jobs();

alter table public.mechanic_offers enable row level security;
alter table public.device_push_tokens enable row level security;
alter table public.connection_payments enable row level security;

revoke all on table public.mechanic_offers from anon;
revoke all on table public.device_push_tokens from anon;
revoke all on table public.connection_payments from anon;

grant select on table public.mechanic_offers to authenticated;
grant select, insert, update, delete on table public.device_push_tokens to authenticated;
grant select on table public.connection_payments to authenticated;

drop policy if exists "repair_requests_participants_read" on public.repair_requests;
create policy "repair_requests_participants_read"
on public.repair_requests for select to authenticated
using (
  (select auth.uid()) = motorist_id
  or (select auth.uid()) = mechanic_id
  or exists (
    select 1 from public.mechanic_offers mo
    where mo.request_id = repair_requests.id
      and mo.mechanic_id = (select auth.uid())
      and mo.status in ('offered', 'accepted')
  )
);

drop policy if exists "repair_requests_motorist_insert" on public.repair_requests;
create policy "repair_requests_motorist_insert"
on public.repair_requests for insert to authenticated
with check (
  (select auth.uid()) = motorist_id
  and mechanic_id is null
  and status = 'matching'
  and (
    vehicle_id is null
    or exists (
      select 1 from public.vehicles v
      where v.id = repair_requests.vehicle_id and v.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "mechanic_offers_select_own" on public.mechanic_offers;
create policy "mechanic_offers_select_own"
on public.mechanic_offers for select to authenticated
using ((select auth.uid()) = mechanic_id);

drop policy if exists "device_push_tokens_select_own" on public.device_push_tokens;
create policy "device_push_tokens_select_own" on public.device_push_tokens for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "device_push_tokens_insert_own" on public.device_push_tokens;
create policy "device_push_tokens_insert_own" on public.device_push_tokens for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "device_push_tokens_update_own" on public.device_push_tokens;
create policy "device_push_tokens_update_own" on public.device_push_tokens for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "device_push_tokens_delete_own" on public.device_push_tokens;
create policy "device_push_tokens_delete_own" on public.device_push_tokens for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "connection_payments_participants_read" on public.connection_payments;
create policy "connection_payments_participants_read"
on public.connection_payments for select to authenticated
using ((select auth.uid()) = motorist_id or (select auth.uid()) = mechanic_id);
