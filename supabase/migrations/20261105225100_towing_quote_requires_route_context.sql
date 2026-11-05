-- Agents need both route endpoints to issue a truthful final price.
-- Still hide the Motorist's phone and exact GPS until the agent accepts.
drop function if exists public.my_towing_offers();
create function public.my_towing_offers()
returns table (
  offer_id uuid,request_id uuid,vehicle_class text,
  vehicle_registration text,pickup_area text,destination_area text,
  issue_notes text,expires_at timestamptz,
  estimate_low_kes integer,estimate_high_kes integer
) language sql stable security definer set search_path='' as $$
 select offer.id,r.id,r.vehicle_class,r.vehicle_registration,r.pickup_text,
   r.destination_text,r.description,offer.expires_at,
   r.estimate_low_kes,r.estimate_high_kes
 from public.towing_offers offer
 join public.towing_requests r on r.id=offer.request_id
 join public.towing_agent_profiles a on a.user_id=offer.agent_id
 join public.towing_presence p on p.agent_id=offer.agent_id
 where offer.agent_id=auth.uid() and a.verification_status='approved'
   and p.is_online and offer.status='offered' and offer.expires_at>now()
   and r.status='searching'
 order by offer.created_at desc limit 15
$$;
revoke all on function public.my_towing_offers() from public,anon;
grant execute on function public.my_towing_offers() to authenticated,service_role;