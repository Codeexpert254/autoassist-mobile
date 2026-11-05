-- Rider verification decisions need an auditable status, not just a boolean.
alter table public.parts_rider_profiles
 add column if not exists verification_status text not null default 'pending'
   check (verification_status in ('pending','approved','rejected')),
 add column if not exists verification_note text,
 add column if not exists reviewed_by uuid references public.profiles(id),
 add column if not exists reviewed_at timestamptz;
update public.parts_rider_profiles
 set verification_status = case when verified then 'approved' else 'pending' end
 where verified and verification_status='pending';

create or replace function public.guard_autoassist_provider_verification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.is_autoassist_admin(auth.uid()) then return new; end if;
  if tg_op='INSERT' then
    if tg_table_name='parts_shops' then
      new.verification_status:='pending';new.verification_note:=null;new.is_open:=false;
      new.rating:=0;new.reviews_count:=0;new.completed_orders:=0;
    elsif tg_table_name='parts_rider_profiles' then
      new.verified:=false;new.is_available:=false;new.verification_status:='pending';
      new.verification_note:=null;new.reviewed_by:=null;new.reviewed_at:=null;
      new.rating:=0;new.reviews_count:=0;new.completed_deliveries:=0;
    end if;
    return new;
  end if;
  if tg_table_name='parts_shops' then
    if new.owner_id is distinct from old.owner_id or
      new.seller_kind is distinct from old.seller_kind or
      new.verification_status is distinct from old.verification_status or
      new.verification_note is distinct from old.verification_note or
      new.rating is distinct from old.rating or new.reviews_count is distinct from old.reviews_count or
      new.completed_orders is distinct from old.completed_orders
    then raise exception 'Seller review and performance fields can only be updated by AutoAssist administrators'; end if;
    new.updated_at:=now();
  elsif tg_table_name='parts_rider_profiles' then
    if new.user_id is distinct from old.user_id or new.verified is distinct from old.verified or
      new.verification_status is distinct from old.verification_status or
      new.verification_note is distinct from old.verification_note or
      new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at or
      new.rating is distinct from old.rating or new.reviews_count is distinct from old.reviews_count or
      new.completed_deliveries is distinct from old.completed_deliveries
    then raise exception 'Rider approval and performance fields can only be updated by AutoAssist administrators'; end if;
  elsif tg_table_name='towing_agent_profiles' then
    if new.user_id is distinct from old.user_id or
      new.verification_status is distinct from old.verification_status or
      new.review_note is distinct from old.review_note or
      new.reviewed_at is distinct from old.reviewed_at or
      new.reviewed_by is distinct from old.reviewed_by
    then raise exception 'Towing verification decision can only be changed by AutoAssist administrators'; end if;
    new.updated_at:=now();
  end if;
  return new;
end $$;

create or replace function public.review_parts_rider_application(
 p_rider_id uuid,p_approve boolean)
returns text language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
  select public.get_autoassist_admin_role(auth.uid()) into v_role;
  if coalesce(v_role,'') not in ('super_admin','verification_admin') then
    raise exception 'Verification administrator access required';
  end if;
  update public.parts_rider_profiles set
    verified=p_approve,is_available=false,
    verification_status=case when p_approve then 'approved' else 'rejected' end,
    verification_note=case when p_approve then null else 'Application declined' end,
    reviewed_by=auth.uid(),reviewed_at=now()
  where user_id=p_rider_id and verification_status='pending';
  if not found then raise exception 'Pending rider application not found'; end if;
  return case when p_approve then 'approved' else 'rejected' end;
end $$;
create or replace function public.review_parts_rider_application_with_note(
 p_rider_id uuid,p_approve boolean,p_note text)
returns text language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
  select public.get_autoassist_admin_role(auth.uid()) into v_role;
  if coalesce(v_role,'') not in ('super_admin','verification_admin') then
    raise exception 'Verification administrator access required';
  end if;
  if not p_approve and length(trim(coalesce(p_note,'')))<5 then
    raise exception 'Rejection reason is required';
  end if;
  update public.parts_rider_profiles set
    verified=p_approve,is_available=false,
    verification_status=case when p_approve then 'approved' else 'rejected' end,
    verification_note=case when p_approve then null else left(trim(p_note),500) end,
    reviewed_by=auth.uid(),reviewed_at=now()
  where user_id=p_rider_id and verification_status='pending';
  if not found then raise exception 'Pending rider application not found'; end if;
  return case when p_approve then 'approved' else 'rejected' end;
end $$;
revoke all on function public.review_parts_rider_application_with_note(uuid,boolean,text) from public,anon;
grant execute on function public.review_parts_rider_application_with_note(uuid,boolean,text) to authenticated,service_role;
