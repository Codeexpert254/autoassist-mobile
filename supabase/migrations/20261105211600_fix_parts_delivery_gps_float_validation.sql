-- PostgreSQL has no isfinite(float8); coordinate bounds already reject NaN and infinity.
CREATE OR REPLACE FUNCTION public.place_parts_order_with_coordinates(p_part_id uuid, p_quantity integer, p_delivery_location text, p_delivery_phone text, p_repair_request_id uuid, p_note text, p_delivery_latitude double precision, p_delivery_longitude double precision)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  new_id uuid;
begin
  if (p_delivery_latitude is null) <> (p_delivery_longitude is null) or
    (p_delivery_latitude is not null and
      (
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
end $function$;

CREATE OR REPLACE FUNCTION public.publish_parts_rider_position(p_order_id uuid, p_latitude double precision, p_longitude double precision)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'Sign in as the assigned rider'; end if;
  if p_latitude is null or p_longitude is null or
    
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
end $function$;