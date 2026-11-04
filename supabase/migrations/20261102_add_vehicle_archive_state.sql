alter table public.vehicles
  add column if not exists archived_at timestamptz;

create index if not exists idx_vehicles_owner_active_updated
  on public.vehicles (owner_id, updated_at desc)
  where archived_at is null;
