-- Fix: expired offers must not permanently block an available rider.
-- Each retry still respects active offers, declines and assignments.
-- A private service-role-only function atomically matches one eligible rider.
CREATE OR REPLACE FUNCTION public.create_parts_delivery_offer(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.parts_orders%rowtype;
  v_rider uuid;
  v_offer uuid;
  v_score numeric;
  v_existing public.parts_delivery_offers%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Not authorized';
  end if;
  select * into v_order from public.parts_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status <> 'ready_for_pickup' or v_order.rider_id is not null then
    return jsonb_build_object('state','not_ready');
  end if;
  update public.parts_delivery_offers
    set status='expired',responded_at=now()
    where order_id=p_order_id and status='offered' and expires_at<=now();
  select * into v_existing from public.parts_delivery_offers
    where order_id=p_order_id and status='offered' and expires_at>now()
    limit 1;
  if found then
    return jsonb_build_object('state','existing_offer','offerId',v_existing.id,'riderId',v_existing.rider_id);
  end if;
  select rp.user_id,
    round((((coalesce(rp.rating,0) * coalesce(rp.reviews_count,0)
      + 4.2*8)/(coalesce(rp.reviews_count,0)+8)) * 20
      + least(coalesce(rp.completed_deliveries,0),100)*0.1)::numeric,2)
  into v_rider,v_score
  from public.parts_rider_profiles rp
  join public.profiles account on account.id=rp.user_id and account.role='rider'
  where rp.verified and rp.is_available
    and not exists (
      select 1 from public.parts_orders active_order
      where active_order.rider_id=rp.user_id
        and active_order.status in ('rider_assigned','picked_up')
    )
    and not exists (
      select 1 from public.parts_delivery_offers offered
      where offered.rider_id=rp.user_id and offered.order_id=p_order_id
        -- Re-offer after a timeout when the dealer explicitly retries.
        -- Riders who declined or accepted must not be offered this order again.
        and offered.status in ('declined','accepted','cancelled')
    )
    and not exists (
      select 1 from public.parts_delivery_offers concurrent_offer
      where concurrent_offer.rider_id=rp.user_id and concurrent_offer.status='offered'
        and concurrent_offer.expires_at>now()
    )
  order by ((coalesce(rp.rating,0)*coalesce(rp.reviews_count,0)+4.2*8)
      /(coalesce(rp.reviews_count,0)+8)) desc,
    coalesce(rp.completed_deliveries,0) desc, rp.created_at
  limit 1;
  if v_rider is null then
    return jsonb_build_object('state','no_available_rider');
  end if;
  insert into public.parts_delivery_offers
    (order_id,rider_id,score,status,expires_at)
  values (p_order_id,v_rider,v_score,'offered',now()+interval '2 minutes')
  returning id into v_offer;
  return jsonb_build_object('state','offered','offerId',v_offer,'riderId',v_rider);
end;
$function$
;

revoke execute on function public.create_parts_delivery_offer(uuid) from public,anon,authenticated;
grant execute on function public.create_parts_delivery_offer(uuid) to service_role;
