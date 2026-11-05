-- Live rider location is ephemeral and must not persist on completed deliveries.
CREATE OR REPLACE FUNCTION public.confirm_parts_delivery(p_order_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare shop uuid; rider uuid;
begin
 update public.parts_orders set status='delivered',delivered_at=now(),updated_at=now(),
 payment_status='customer_reported_paid',commission_status='accrued',
 rider_latitude=null,rider_longitude=null,rider_location_updated_at=null
 where id=p_order_id and motorist_id=auth.uid() and status='picked_up'
 returning shop_id,rider_id into shop,rider;
 if not found then raise exception 'Motorist can only confirm delivery after rider pickup'; end if;
 update public.parts_shops set completed_orders=completed_orders+1 where id=shop;
 update public.parts_rider_profiles set completed_deliveries=completed_deliveries+1,is_available=true where user_id=rider;
 return 'delivered';
end $function$;