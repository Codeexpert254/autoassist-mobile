-- Let rejected marketplace providers correct their details and request review again.
create or replace function public.resubmit_parts_shop_application(p_shop_id uuid)
returns text language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 update public.parts_shops
 set verification_status='pending',verification_note=null,is_open=false,updated_at=now()
 where id=p_shop_id and owner_id=auth.uid() and verification_status='rejected';
 if not found then raise exception 'Rejected shop application not found'; end if;
 return 'pending';
end $$;
revoke all on function public.resubmit_parts_shop_application(uuid) from public,anon;
grant execute on function public.resubmit_parts_shop_application(uuid) to authenticated;

create or replace function public.resubmit_parts_rider_application(
 p_phone text,p_vehicle_type text,p_registration_number text)
returns text language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if length(trim(coalesce(p_phone,'')))<9 or
    p_vehicle_type not in ('motorbike','bicycle','car') or
    (p_vehicle_type<>'bicycle' and length(trim(coalesce(p_registration_number,'')))<4)
    then raise exception 'Complete valid phone and vehicle information'; end if;
 update public.parts_rider_profiles set
   phone=trim(p_phone),vehicle_type=p_vehicle_type,
   registration_number=trim(coalesce(p_registration_number,'')),
   verified=false,is_available=false,verification_status='pending',
   verification_note=null,reviewed_by=null,reviewed_at=null
 where user_id=auth.uid() and verification_status='rejected';
 if not found then raise exception 'Rejected rider application not found'; end if;
 return 'pending';
end $$;
revoke all on function public.resubmit_parts_rider_application(text,text,text) from public,anon;
grant execute on function public.resubmit_parts_rider_application(text,text,text) to authenticated;

-- Only verification administrators can approve/reject parts shops.
create or replace function public.review_parts_shop_application(
 p_shop_id uuid,p_approve boolean,p_note text default '')
returns text language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
 select public.get_autoassist_admin_role(auth.uid()) into v_role;
 if coalesce(v_role,'') not in ('super_admin','verification_admin') then
   raise exception 'Verification administrator access required'; end if;
 update public.parts_shops
 set verification_status=case when p_approve then 'approved' else 'rejected' end,
 verification_note=case when p_approve then null else left(coalesce(p_note,''),500) end,
 updated_at=now()
 where id=p_shop_id and verification_status='pending';
 if not found then raise exception 'Pending shop application not found';end if;
 return case when p_approve then 'approved' else 'rejected' end;
end $$;
