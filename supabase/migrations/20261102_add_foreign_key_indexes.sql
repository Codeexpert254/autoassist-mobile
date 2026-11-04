create index if not exists inspections_mechanic_id_idx on public.inspections(mechanic_id);
create index if not exists ratings_motorist_id_idx on public.ratings(motorist_id);
create index if not exists repair_events_actor_id_idx on public.repair_events(actor_id);
create index if not exists repair_quotes_mechanic_id_idx on public.repair_quotes(mechanic_id);
create index if not exists repair_requests_vehicle_id_idx on public.repair_requests(vehicle_id);
