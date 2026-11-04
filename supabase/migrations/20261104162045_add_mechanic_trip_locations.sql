-- Server-applied migration version: 20261104162045.
-- Keep individual GPS positions visible only to the motorist and mechanic of
-- an unlocked connection. Updates stop once the mechanic arrives.
create table if not exists public.mechanic_trip_locations (
  request_id uuid primary key references public.repair_requests(id) on delete cascade,
  mechanic_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m is null or accuracy_m between 0 and 5000),
  heading_deg double precision check (heading_deg is null or heading_deg between 0 and 360),
  speed_mps double precision check (speed_mps is null or speed_mps between 0 and 120),
  updated_at timestamptz not null default now()
);

create index if not exists mechanic_trip_locations_mechanic_idx
  on public.mechanic_trip_locations (mechanic_id);

alter table public.mechanic_trip_locations enable row level security;
revoke all on public.mechanic_trip_locations from public, anon;
grant select, insert, update on public.mechanic_trip_locations to authenticated;

create policy "Trip positions visible only to connection participants"
on public.mechanic_trip_locations for select to authenticated
using (
  exists (
    select 1 from public.repair_requests r
    where r.id = mechanic_trip_locations.request_id
      and r.mechanic_id = mechanic_trip_locations.mechanic_id
      and r.contact_unlocked_at is not null
      and r.status in ('en-route', 'arrived')
      and (r.motorist_id = (select auth.uid()) or r.mechanic_id = (select auth.uid()))
  )
);

create policy "Only assigned en-route mechanic may publish location"
on public.mechanic_trip_locations for insert to authenticated
with check (
  mechanic_id = (select auth.uid())
  and exists (
    select 1 from public.repair_requests r
    where r.id = mechanic_trip_locations.request_id
      and r.mechanic_id = mechanic_trip_locations.mechanic_id
      and r.contact_unlocked_at is not null
      and r.status = 'en-route'
  )
);

create policy "Only assigned en-route mechanic may update own location"
on public.mechanic_trip_locations for update to authenticated
using (
  mechanic_id = (select auth.uid())
  and exists (
    select 1 from public.repair_requests r
    where r.id = mechanic_trip_locations.request_id
      and r.mechanic_id = mechanic_trip_locations.mechanic_id
      and r.contact_unlocked_at is not null
      and r.status = 'en-route'
  )
)
with check (
  mechanic_id = (select auth.uid())
  and exists (
    select 1 from public.repair_requests r
    where r.id = mechanic_trip_locations.request_id
      and r.mechanic_id = mechanic_trip_locations.mechanic_id
      and r.contact_unlocked_at is not null
      and r.status = 'en-route'
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'mechanic_trip_locations'
  ) then
    alter publication supabase_realtime add table public.mechanic_trip_locations;
  end if;
end;
$$;
