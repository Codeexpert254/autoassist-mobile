-- Unified provider review: towing applications and protected marketplace approvals.
create table if not exists public.towing_agent_profiles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 business_name text not null check (length(trim(business_name)) between 3 and 140),
 phone text not null check (length(trim(phone)) between 9 and 30),
 operating_area text not null check (length(trim(operating_area)) between 3 and 200),
 vehicle_type text not null check (vehicle_type in ('flatbed','wheel_lift','recovery')),
 vehicle_registration text not null check (length(trim(vehicle_registration)) between 4 and 30),
 license_number text not null check (length(trim(license_number)) between 4 and 100),
 insurance_policy text not null check (length(trim(insurance_policy)) between 4 and 100),
 license_image_path text not null,
 insurance_image_path text not null,
 truck_image_path text not null,
 verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
 review_note text,
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 submitted_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.towing_agent_profiles enable row level security;
grant select,insert,update on public.towing_agent_profiles to authenticated;
create policy "towing_profiles_select" on public.towing_agent_profiles for select to authenticated
 using ((select auth.uid())=user_id or public.is_autoassist_admin((select auth.uid())));
create policy "towing_profiles_insert" on public.towing_agent_profiles for insert to authenticated
 with check (user_id=(select auth.uid()) and verification_status='pending'
 and reviewed_by is null and reviewed_at is null and review_note is null
 and exists(select 1 from public.profiles p where p.id=user_id and p.role='towing'));
create policy "towing_profiles_update" on public.towing_agent_profiles for update to authenticated
 using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid()));
create index towing_agent_profiles_status_idx on public.towing_agent_profiles(verification_status,submitted_at desc);

-- Immutable approvals/ratings against self-service UPDATE via Data API.
create or replace function public.guard_autoassist_provider_verification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.is_autoassist_admin(auth.uid()) then return new; end if;
  if tg_op='INSERT' then
    if tg_table_name='parts_shops' then
      new.verification_status:='pending';new.verification_note:=null;new.is_open:=false;
      new.rating:=0;new.reviews_count:=0;new.completed_orders:=0;
    elsif tg_table_name='parts_rider_profiles' then
      new.verified:=false;new.is_available:=false;
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
  elsif tg_table_name='parts_rider_profiles' then
    if new.user_id is distinct from old.user_id or new.verified is distinct from old.verified or
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
  end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists protect_parts_shop_verification on public.parts_shops;
create trigger protect_parts_shop_verification before insert or update on public.parts_shops
 for each row execute function public.guard_autoassist_provider_verification();
drop trigger if exists protect_rider_verification on public.parts_rider_profiles;
create trigger protect_rider_verification before insert or update on public.parts_rider_profiles
 for each row execute function public.guard_autoassist_provider_verification();
drop trigger if exists protect_towing_verification on public.towing_agent_profiles;
create trigger protect_towing_verification before update on public.towing_agent_profiles
 for each row execute function public.guard_autoassist_provider_verification();

-- Only verification-admin or super-admin can make towing decisions.
create or replace function public.review_towing_application(
 p_towing_user_id uuid,p_approve boolean,p_note text default '')
returns text language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
  select public.get_autoassist_admin_role(auth.uid()) into v_role;
  if coalesce(v_role,'') not in ('super_admin','verification_admin') then
    raise exception 'Verification administrator access required';
  end if;
  if not p_approve and length(trim(coalesce(p_note,'')))<5 then
    raise exception 'Enter a reason when rejecting a towing application';
  end if;
  update public.towing_agent_profiles set
    verification_status=case when p_approve then 'approved' else 'rejected' end,
    review_note=case when p_approve then null else left(trim(p_note),500) end,
    reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where user_id=p_towing_user_id and verification_status='pending';
  if not found then raise exception 'Pending towing application not found'; end if;
  return case when p_approve then 'approved' else 'rejected' end;
end $$;
revoke all on function public.review_towing_application(uuid,boolean,text) from public,anon;
grant execute on function public.review_towing_application(uuid,boolean,text) to authenticated,service_role;

-- Private documentary evidence. Every user can upload only to their own folder.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('towing-verification','towing-verification',false,10485760,array['image/jpeg','image/png','image/webp'])
 on conflict (id) do nothing;
create policy "towing_verification_upload" on storage.objects for insert to authenticated
 with check (bucket_id='towing-verification' and
   (storage.foldername(name))[1]=(select auth.uid())::text
   and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='towing'));
create policy "towing_verification_read" on storage.objects for select to authenticated
 using (bucket_id='towing-verification' and
   ((storage.foldername(name))[1]=(select auth.uid())::text or
    public.is_autoassist_admin((select auth.uid()))));
