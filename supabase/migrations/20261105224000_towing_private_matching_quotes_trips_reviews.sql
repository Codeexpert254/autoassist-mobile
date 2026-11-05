-- Towing pilot: verified agents, private offers, explicit quotes and two-leg service states.
-- All prices shown to motorists are estimates pending an agent quote.
create table if not exists public.towing_presence (
  agent_id uuid primary key references public.towing_agent_profiles(user_id) on delete cascade,
  is_online boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.towing_requests (
  id uuid primary key default gen_random_uuid(),
  motorist_id uuid not null references auth.users(id),
  agent_id uuid references auth.users(id),
  pickup_text text not null,
  pickup_latitude double precision not null check(pickup_latitude between -90 and 90),
  pickup_longitude double precision not null check(pickup_longitude between -180 and 180),
  destination_text text not null,
  destination_latitude double precision check(destination_latitude between -90 and 90),
  destination_longitude double precision check(destination_longitude between -180 and 180),
  vehicle_class text not null check(vehicle_class in ('saloon','suv','light_truck')),
  vehicle_registration text not null,
  estimated_distance_band text not null check(estimated_distance_band in ('0_10','10_20','20_30','30_40','40_50','above_50')),
  estimate_low_kes integer,
  estimate_high_kes integer,
  description text not null default '',
  motorist_phone text not null,
  status text not null default 'searching' check(status in (
    'searching','quote_pending','assigned','arrived','secured','en_route',
    'completed_by_agent','completed','cancelled')),
  quote_kes integer check(quote_kes between 1000 and 250000),
  quoted_at timestamptz,
  quote_approved_at timestamptz,
  accepted_at timestamptz,
  arrived_at timestamptz,
  secured_at timestamptz,
  trip_started_at timestamptz,
  agent_completed_at timestamptz,
  confirmed_at timestamptz,
  agent_latitude double precision check(agent_latitude between -90 and 90),
  agent_longitude double precision check(agent_longitude between -180 and 180),
  agent_position_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((destination_latitude is null)=(destination_longitude is null)),
  check ((agent_latitude is null)=(agent_longitude is null)),
  check ((estimate_low_kes is null)=(estimate_high_kes is null)),
  check (estimate_low_kes is null or estimate_low_kes <= estimate_high_kes)
);
create index if not exists tow_requests_motorist_recent
  on public.towing_requests(motorist_id,created_at desc);
create index if not exists tow_requests_agent_recent
  on public.towing_requests(agent_id,created_at desc);
create table if not exists public.towing_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.towing_requests(id) on delete cascade,
  agent_id uuid not null references auth.users(id),
  status text not null default 'offered'
    check(status in ('offered','accepted','declined','expired','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '120 seconds'),
  responded_at timestamptz,
  push_sent_at timestamptz
);
create index if not exists towing_offers_agent_recent on public.towing_offers(agent_id,created_at desc);
create unique index if not exists towing_one_active_offer_per_request
  on public.towing_offers(request_id) where status='offered';
create table if not exists public.towing_reviews (
  request_id uuid primary key references public.towing_requests(id) on delete cascade,
  motorist_id uuid not null references auth.users(id),
  agent_id uuid not null references auth.users(id),
  stars integer not null check(stars between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);
alter table public.towing_presence enable row level security;
alter table public.towing_requests enable row level security;
alter table public.towing_offers enable row level security;
alter table public.towing_reviews enable row level security;
revoke all on public.towing_presence, public.towing_requests,
  public.towing_offers, public.towing_reviews from anon;
grant select on public.towing_presence,public.towing_requests,
  public.towing_offers,public.towing_reviews to authenticated;
grant all on public.towing_presence,public.towing_requests,
  public.towing_offers,public.towing_reviews to service_role;
drop policy if exists towing_presence_own on public.towing_presence;
create policy towing_presence_own on public.towing_presence for select
  to authenticated using(agent_id=auth.uid());
drop policy if exists towing_requests_participants on public.towing_requests;
create policy towing_requests_participants on public.towing_requests for select
  to authenticated using(motorist_id=auth.uid() or agent_id=auth.uid());
drop policy if exists towing_offers_agent_only on public.towing_offers;
create policy towing_offers_agent_only on public.towing_offers for select
  to authenticated using(agent_id=auth.uid());
drop policy if exists towing_reviews_participants on public.towing_reviews;
create policy towing_reviews_participants on public.towing_reviews for select
  to authenticated using(motorist_id=auth.uid() or agent_id=auth.uid());

-- Agents may toggle online only while approved and not assigned to an active job.
create or replace function public.towing_set_online(p_online boolean) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles u join public.towing_agent_profiles a on a.user_id=u.id
    where u.id=auth.uid() and u.role='towing' and a.verification_status='approved'
  ) then raise exception 'Approved towing account required'; end if;
  if coalesce(p_online,false) and exists (
    select 1 from public.towing_requests r
    where r.agent_id=auth.uid() and r.status in
      ('quote_pending','assigned','arrived','secured','en_route','completed_by_agent')
  ) then raise exception 'Complete your current towing job first'; end if;
  insert into public.towing_presence(agent_id,is_online,updated_at)
    values(auth.uid(),coalesce(p_online,false),now())
  on conflict(agent_id) do update
    set is_online=excluded.is_online,updated_at=now();
  return coalesce(p_online,false);
end $$;

-- Only an authenticated Motorist can request service. Estimates are server-defined,
-- based on published Nairobi urban ranges, not binding provider prices.
create or replace function public.create_towing_request(
 p_pickup_text text,p_lat double precision,p_lon double precision,
 p_destination_text text,p_dest_lat double precision,p_dest_lon double precision,
 p_vehicle_class text,p_plate text,p_band text,p_description text,p_phone text
) returns uuid language plpgsql security definer set search_path='' as $$
declare lower_price integer;upper_price integer;new_id uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles
    where id=auth.uid() and role='motorist') then raise exception 'Motorist account required'; end if;
  if p_pickup_text is null or length(trim(p_pickup_text))<5 or
     p_destination_text is null or length(trim(p_destination_text))<5 or
     length(trim(coalesce(p_phone,'')))<9 then
    raise exception 'Add pickup, destination and contact phone'; end if;
  if p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180
     or (p_dest_lat is null)<>(p_dest_lon is null) or
     (p_dest_lat is not null and
       (p_dest_lat not between -90 and 90 or p_dest_lon not between -180 and 180)) then
    raise exception 'Choose a valid pickup GPS location'; end if;
  if p_vehicle_class not in ('saloon','suv','light_truck') or
     p_band not in ('0_10','10_20','20_30','30_40','40_50','above_50') then
    raise exception 'Choose your vehicle and approximate distance'; end if;
  if length(trim(coalesce(p_plate,'')))<3 then raise exception 'Enter your vehicle registration'; end if;
  if exists(select 1 from public.towing_requests r
    where r.motorist_id=auth.uid() and r.status in
     ('searching','quote_pending','assigned','arrived','secured','en_route','completed_by_agent')) then
    raise exception 'Finish or cancel your current towing request before placing another'; end if;
  lower_price:=case p_band
    when '0_10' then 5000 when '10_20' then 6000 when '20_30' then 8000
    when '30_40' then 10000 when '40_50' then 12000 else null end;
  upper_price:=case p_band
    when '0_10' then 6000 when '10_20' then 9000 when '20_30' then 12000
    when '30_40' then 15000 when '40_50' then 17000 else null end;
  if p_vehicle_class='suv' then
    lower_price:=lower_price+500;upper_price:=upper_price+500;
  elsif p_vehicle_class='light_truck' then
    lower_price:=lower_price+1500;upper_price:=upper_price+2000;
  end if;
  insert into public.towing_requests(motorist_id,pickup_text,pickup_latitude,pickup_longitude,
    destination_text,destination_latitude,destination_longitude,vehicle_class,vehicle_registration,
    estimated_distance_band,estimate_low_kes,estimate_high_kes,description,motorist_phone)
  values(auth.uid(),left(trim(p_pickup_text),400),p_lat,p_lon,left(trim(p_destination_text),400),
    p_dest_lat,p_dest_lon,p_vehicle_class,left(trim(p_plate),30),p_band,lower_price,upper_price,
    left(trim(coalesce(p_description,'')),500),left(trim(p_phone),30))
  returning id into new_id;
  return new_id;
end $$;

-- Called by the authenticated Edge Function with service_role, never by a device.
create or replace function public.match_towing_agent(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare request_record public.towing_requests%rowtype;
        already public.towing_offers%rowtype; agent uuid; offer_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'Service account required';end if;
  select * into request_record from public.towing_requests
    where id=p_request_id for update;
  if not found then raise exception 'Towing request not found';end if;
  if request_record.status<>'searching' then
    return jsonb_build_object('state','not_searching');end if;
  update public.towing_offers set status='expired',responded_at=now()
    where request_id=p_request_id and status='offered' and expires_at<=now();
  select * into already from public.towing_offers
    where request_id=p_request_id and status='offered' limit 1;
  if found then return jsonb_build_object('state','existing_offer',
    'offerId',already.id,'agentId',already.agent_id);end if;
  select a.user_id into agent
  from public.towing_agent_profiles a
  join public.profiles u on u.id=a.user_id and u.role='towing'
  join public.towing_presence presence on presence.agent_id=a.user_id and presence.is_online
  where a.verification_status='approved'
    and not exists(select 1 from public.towing_requests busy
       where busy.agent_id=a.user_id and busy.status in
         ('quote_pending','assigned','arrived','secured','en_route','completed_by_agent'))
    and not exists(select 1 from public.towing_offers previous
       where previous.agent_id=a.user_id and previous.request_id=p_request_id
         and previous.status in ('declined','accepted','cancelled'))
    and not exists(select 1 from public.towing_offers offered
       where offered.agent_id=a.user_id and offered.status='offered' and offered.expires_at>now())
  order by presence.updated_at asc,a.user_id
  limit 1;
  if agent is null then return jsonb_build_object('state','no_available_agent');end if;
  insert into public.towing_offers(request_id,agent_id) values(p_request_id,agent)
  returning id into offer_id;
  return jsonb_build_object('state','offered','offerId',offer_id,'agentId',agent);
end $$;

-- Query offers without leaking customer contact or exact GPS before acceptance.
create or replace function public.my_towing_offers()
returns table(offer_id uuid,request_id uuid,vehicle_class text,vehicle_registration text,
  pickup_area text,expires_at timestamptz,estimate_low_kes integer,estimate_high_kes integer)
language sql stable security definer set search_path='' as $$
 select offer.id,r.id,r.vehicle_class,r.vehicle_registration,r.pickup_text,
   offer.expires_at,r.estimate_low_kes,r.estimate_high_kes
 from public.towing_offers offer join public.towing_requests r on r.id=offer.request_id
 join public.towing_agent_profiles agent on agent.user_id=offer.agent_id
 join public.towing_presence p on p.agent_id=offer.agent_id
 where offer.agent_id=auth.uid() and agent.verification_status='approved' and p.is_online
   and offer.status='offered' and offer.expires_at>now() and r.status='searching'
 order by offer.created_at desc limit 15
$$;

-- Agent accepts with an explicit final price; Motorist must approve it
-- before travel starts. No payment is collected at this stage.
create or replace function public.respond_towing_offer(p_offer_id uuid,p_accept boolean,p_quote_kes integer default null)
returns text language plpgsql security definer set search_path='' as $$
declare o public.towing_offers%rowtype; request_record public.towing_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in';end if;
  select * into o from public.towing_offers where id=p_offer_id for update;
  if not found or o.agent_id<>auth.uid() then raise exception 'Not your offer';end if;
  if o.status<>'offered' then raise exception 'Offer is no longer active';end if;
  select * into request_record from public.towing_requests where id=o.request_id for update;
  if o.expires_at<=now() then
    update public.towing_offers set status='expired',responded_at=now() where id=o.id;
    return 'expired';
  end if;
  if request_record.status<>'searching' then raise exception 'Request already matched';end if;
  if not coalesce(p_accept,false) then
    update public.towing_offers set status='declined',responded_at=now() where id=o.id;
    return 'declined';
  end if;
  if p_quote_kes is null or p_quote_kes<1000 or p_quote_kes>250000 then
    raise exception 'Enter a final towing quote between KES 1,000 and 250,000';end if;
  if not exists(select 1 from public.towing_agent_profiles a
    join public.towing_presence p on p.agent_id=a.user_id
    where a.user_id=auth.uid() and a.verification_status='approved' and p.is_online) then
    raise exception 'Approved, online towing agent required';end if;
  update public.towing_requests set agent_id=auth.uid(),status='quote_pending',
    quote_kes=p_quote_kes,quoted_at=now(),accepted_at=now(),updated_at=now()
    where id=o.request_id;
  update public.towing_offers set status='accepted',responded_at=now() where id=o.id;
  update public.towing_presence set is_online=false,updated_at=now() where agent_id=auth.uid();
  return 'quote_pending';
end $$;

create or replace function public.approve_towing_quote(p_request_id uuid,p_approve boolean)
returns text language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in';end if;
  if coalesce(p_approve,false) then
    update public.towing_requests set status='assigned',quote_approved_at=now(),updated_at=now()
      where id=p_request_id and motorist_id=auth.uid() and status='quote_pending';
  else
    update public.towing_requests set status='searching',agent_id=null,
      quote_kes=null,quoted_at=null,accepted_at=null,updated_at=now()
      where id=p_request_id and motorist_id=auth.uid() and status='quote_pending';
  end if;
  if not found then raise exception 'No quote available for your approval';end if;
  return case when p_approve then 'assigned' else 'searching' end;
end $$;

create or replace function public.update_towing_job(p_request_id uuid,p_next_status text)
returns text language plpgsql security definer set search_path='' as $$
declare current_status text;reached boolean;
begin
  if auth.uid() is null then raise exception 'Sign in';end if;
  select status into current_status from public.towing_requests
    where id=p_request_id and agent_id=auth.uid() for update;
  if not found then raise exception 'Not your assigned towing request';end if;
  if not (
     (current_status='assigned' and p_next_status='arrived') or
     (current_status='arrived' and p_next_status='secured') or
     (current_status='secured' and p_next_status='en_route') or
     (current_status='en_route' and p_next_status='completed_by_agent')
  ) then raise exception 'Invalid towing status transition';end if;
  update public.towing_requests set status=p_next_status,updated_at=now(),
    arrived_at=case when p_next_status='arrived' then now() else arrived_at end,
    secured_at=case when p_next_status='secured' then now() else secured_at end,
    trip_started_at=case when p_next_status='en_route' then now() else trip_started_at end,
    agent_completed_at=case when p_next_status='completed_by_agent' then now() else agent_completed_at end
  where id=p_request_id;
  return p_next_status;
end $$;

create or replace function public.complete_towing_request(p_request_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
  actor:=auth.uid();
  if actor is null then raise exception 'Sign in';end if;
  update public.towing_requests set status='completed',confirmed_at=now(),updated_at=now(),
    agent_latitude=null,agent_longitude=null,agent_position_updated_at=null
  where id=p_request_id and motorist_id=actor and status='completed_by_agent';
  if not found then raise exception 'The towing agent must mark the tow complete first';end if;
  return 'completed';
end $$;

create or replace function public.cancel_towing_request(p_request_id uuid)
returns text language plpgsql security definer set search_path='' as $$
begin
  update public.towing_requests set status='cancelled',updated_at=now()
  where id=p_request_id and motorist_id=auth.uid() and status in ('searching','quote_pending');
  if not found then raise exception 'Only unmatched towing requests can be cancelled';end if;
  update public.towing_offers set status='cancelled',responded_at=now()
    where request_id=p_request_id and status='offered';
  return 'cancelled';
end $$;

create or replace function public.publish_towing_position(
  p_request_id uuid,p_lat double precision,p_lon double precision)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_lat is null or p_lon is null or
     p_lat not between -90 and 90 or p_lon not between -180 and 180 then
     raise exception 'Invalid authenticated GPS position';end if;
  update public.towing_requests set agent_latitude=p_lat,agent_longitude=p_lon,
     agent_position_updated_at=now()
  where id=p_request_id and agent_id=auth.uid()
    and status in ('assigned','arrived','secured','en_route');
  if not found then raise exception 'No active towing trip assigned';end if;
end $$;

create or replace function public.rate_towing_request(p_request_id uuid,p_stars integer,p_comment text default '')
returns void language plpgsql security definer set search_path='' as $$
declare r public.towing_requests%rowtype;
begin
  if auth.uid() is null or p_stars not between 1 and 5 then
    raise exception 'Sign in and select 1-5 stars';end if;
  select * into r from public.towing_requests where id=p_request_id and motorist_id=auth.uid()
    and status='completed';
  if not found then raise exception 'Only the motorist may rate a completed tow';end if;
  insert into public.towing_reviews(request_id,motorist_id,agent_id,stars,comment)
   values(r.id,auth.uid(),r.agent_id,p_stars,left(trim(coalesce(p_comment,'')),500));
end $$;

-- Scope execution to only the roles used by the app.
revoke execute on function public.towing_set_online(boolean) from public,anon;
revoke execute on function public.create_towing_request(text,double precision,double precision,text,double precision,double precision,text,text,text,text,text) from public,anon;
revoke execute on function public.match_towing_agent(uuid) from public,anon,authenticated;
revoke execute on function public.my_towing_offers() from public,anon;
revoke execute on function public.respond_towing_offer(uuid,boolean,integer) from public,anon;
revoke execute on function public.approve_towing_quote(uuid,boolean) from public,anon;
revoke execute on function public.update_towing_job(uuid,text) from public,anon;
revoke execute on function public.complete_towing_request(uuid) from public,anon;
revoke execute on function public.cancel_towing_request(uuid) from public,anon;
revoke execute on function public.publish_towing_position(uuid,double precision,double precision) from public,anon;
revoke execute on function public.rate_towing_request(uuid,integer,text) from public,anon;
grant execute on function public.match_towing_agent(uuid) to service_role;
grant execute on function public.towing_set_online(boolean),
  public.create_towing_request(text,double precision,double precision,text,double precision,double precision,text,text,text,text,text),
  public.my_towing_offers(), public.respond_towing_offer(uuid,boolean,integer),
  public.approve_towing_quote(uuid,boolean),public.update_towing_job(uuid,text),
  public.complete_towing_request(uuid),public.cancel_towing_request(uuid),
  public.publish_towing_position(uuid,double precision,double precision),
  public.rate_towing_request(uuid,integer,text) to authenticated;
