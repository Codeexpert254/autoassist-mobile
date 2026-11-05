-- Allow rejected towing providers to correct their evidence and submit again.
alter table public.towing_agent_profiles
 add constraint towing_license_image_owner check (split_part(license_image_path,'/',1)=user_id::text),
 add constraint towing_insurance_image_owner check (split_part(insurance_image_path,'/',1)=user_id::text),
 add constraint towing_truck_image_owner check (split_part(truck_image_path,'/',1)=user_id::text);

create or replace function public.resubmit_towing_application(
 p_business_name text,p_phone text,p_operating_area text,p_vehicle_type text,
 p_vehicle_registration text,p_license_number text,p_insurance_policy text,
 p_license_image_path text,p_insurance_image_path text,p_truck_image_path text)
returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and role='towing')
   then raise exception 'Towing account required'; end if;
 if p_license_image_path not like uid::text||'/%'
    or p_insurance_image_path not like uid::text||'/%'
    or p_truck_image_path not like uid::text||'/%' then
   raise exception 'Verification files must belong to this account';
 end if;
 update public.towing_agent_profiles set
   business_name=trim(p_business_name),phone=trim(p_phone),operating_area=trim(p_operating_area),
   vehicle_type=p_vehicle_type,vehicle_registration=trim(p_vehicle_registration),
   license_number=trim(p_license_number),insurance_policy=trim(p_insurance_policy),
   license_image_path=p_license_image_path,insurance_image_path=p_insurance_image_path,
   truck_image_path=p_truck_image_path,verification_status='pending',
   review_note=null,reviewed_by=null,reviewed_at=null,submitted_at=now(),updated_at=now()
 where user_id=uid and verification_status='rejected';
 if not found then raise exception 'Only rejected towing applications can be resubmitted'; end if;
 return 'pending';
end $$;
revoke all on function public.resubmit_towing_application(text,text,text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.resubmit_towing_application(text,text,text,text,text,text,text,text,text,text) to authenticated;
