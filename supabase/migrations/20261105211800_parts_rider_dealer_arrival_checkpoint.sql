-- Explicit dealer-arrival checkpoint for the two-leg Rider workflow.
alter table public.parts_orders
 add column if not exists arrived_at_dealer_at timestamptz;

create or replace function public.mark_parts_rider_arrived_dealer(p_order_id uuid)
returns text language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in as the assigned rider';end if;
  update public.parts_orders
  set arrived_at_dealer_at=coalesce(arrived_at_dealer_at,now()),updated_at=now()
  where id=p_order_id and rider_id=auth.uid() and status='rider_assigned';
  if not found then raise exception 'This delivery is not assigned to you or no longer awaiting pickup';end if;
  return 'arrived_at_dealer';
end $$;
revoke all on function public.mark_parts_rider_arrived_dealer(uuid) from public,anon;
grant execute on function public.mark_parts_rider_arrived_dealer(uuid) to authenticated,service_role;
