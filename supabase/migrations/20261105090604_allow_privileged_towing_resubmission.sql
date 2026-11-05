-- Permit carefully validated server-side towing resubmission without allowing
-- applicants to edit verification decisions through normal Data API updates.
CREATE OR REPLACE FUNCTION public.guard_autoassist_provider_verification()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  -- Trusted SECURITY DEFINER resubmission RPC executes as postgres,
  -- while the applicant's ordinary Data API updates run as authenticated.
  if auth.uid() is null or current_user='postgres' or
     public.is_autoassist_admin(auth.uid()) then return new; end if;
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
end $function$
