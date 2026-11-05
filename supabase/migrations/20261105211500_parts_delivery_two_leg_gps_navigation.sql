-- Store precise delivery and pickup coordinates for the two-leg rider trip.
-- Old text-only orders and shops continue working without coordinates.
alter table public.parts_shops
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
alter table public.parts_orders
  add column if not exists delivery_latitude double precision,
  add column if not exists delivery_longitude double precision,
  add column if not exists delivery_started_at timestamptz,
  add column if not exists rider_latitude double precision,
  add column if not exists rider_longitude double precision,
  add column if not exists rider_location_updated_at timestamptz;
alter table public.parts_shops
  drop constraint if exists parts_shop_pickup_coordinates_valid;
alter table public.parts_shops
  add constraint parts_shop_pickup_coordinates_valid check(
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180));
alter table public.parts_orders
  drop constraint if exists parts_order_delivery_coordinates_valid;
alter table public.parts_orders
  add constraint parts_order_delivery_coordinates_valid check(
    (delivery_latitude is null and delivery_longitude is null) or
    (delivery_latitude between -90 and 90 and delivery_longitude between -180 and 180));
alter table public.parts_orders
  drop constraint if exists parts_order_rider_coordinates_valid;
alter table public.parts_orders
  add constraint parts_order_rider_coordinates_valid check(
    (rider_latitude is null and rider_longitude is null) or
    (rider_latitude between -90 and 90 and rider_longitude between -180 and 180));

-- Keep all existing order payment, inventory and authorization checks.
-- The parent RPC enforces motorist identity, shop status and stock.
create or replace function public.place_parts_order_with_coordinates(
  p_part_id uuid,p_quantity integer,p_delivery_location text,p_delivery_phone text,
  p_repair_request_id uuid,p_note text,p_delivery_latitude double precision,
  p_delivery_longitude double precision
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_id uuid;
begin
  if (p_delivery_latitude is null) <> (p_delivery_longitude is null) or
    (p_delivery_latitude is not null and
      (not isfinite(p_delivery_latitude) or not isfinite(p_delivery_longitude) or
       p_delivery_latitude < -90 or p_delivery_latitude > 90 or
       p_delivery_longitude < -180 or p_delivery_longitude > 180)) then
    raise exception 'Valid delivery coordinates are required';
  end if;
  new_id := public.place_parts_order(p_part_id,p_quantity,p_delivery_location,
    p_delivery_phone,p_repair_request_id,p_note);
  update public.parts_orders set
    delivery_latitude=p_delivery_latitude,
    delivery_longitude=p_delivery_longitude
  where id=new_id and motorist_id=auth.uid();
  if not found then raise exception 'Unable to save delivery coordinates'; end if;
  return new_id;
end $$;
revoke all on function public.place_parts_order_with_coordinates(uuid,integer,text,text,uuid,text,double precision,double precision) from public,anon;
grant execute on function public.place_parts_order_with_coordinates(uuid,integer,text,text,uuid,text,double precision,double precision) to authenticated,service_role;

-- Pickup confirmation is the first leg. The second leg begins only after
-- an explicit rider action, independent of Motorist receipt confirmation.
create or replace function public.start_parts_delivery_trip(p_order_id uuid)
returns text language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in as the assigned rider'; end if;
  update public.parts_orders
    set delivery_started_at=coalesce(delivery_started_at,now()),updated_at=now()
  where id=p_order_id and rider_id=auth.uid() and status='picked_up';
  if not found then raise exception 'Confirm pickup before starting the customer trip'; end if;
  return 'en_route_to_motorist';
end $$;
revoke all on function public.start_parts_delivery_trip(uuid) from public,anon;
grant execute on function public.start_parts_delivery_trip(uuid) to authenticated,service_role;

-- Foreground-only location sharing, limited to a started, active rider trip.
-- Existing parts_orders RLS allows the assigned rider and Motorist to read.
create or replace function public.publish_parts_rider_position(
  p_order_id uuid, p_latitude double precision, p_longitude double precision)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in as the assigned rider'; end if;
  if p_latitude is null or p_longitude is null or
    not isfinite(p_latitude) or not isfinite(p_longitude) or
    p_latitude < -90 or p_latitude > 90 or
    p_longitude < -180 or p_longitude > 180 then
      raise exception 'Invalid GPS coordinates';
  end if;
  update public.parts_orders
    set rider_latitude=p_latitude,rider_longitude=p_longitude,
        rider_location_updated_at=now()
  where id=p_order_id and rider_id=auth.uid() and status='picked_up'
    and delivery_started_at is not null;
  if not found then raise exception 'No active delivery trip assigned to you'; end if;
end $$;
revoke all on function public.publish_parts_rider_position(uuid,double precision,double precision) from public,anon;
grant execute on function public.publish_parts_rider_position(uuid,double precision,double precision) to authenticated,service_role;
