create or replace function public.get_autoassist_admin_role(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.admin_role
  from private.admin_users a
  where a.user_id = p_user_id and a.active = true
  limit 1;
$$;

revoke all on function public.get_autoassist_admin_role(uuid) from public, anon, authenticated;
grant execute on function public.get_autoassist_admin_role(uuid) to service_role;

create or replace function public.is_verification_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.admin_users a
    where a.user_id = p_user_id
      and a.active = true
      and a.admin_role in ('super_admin','verification_admin')
  );
$$;

revoke all on function public.is_verification_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_verification_admin(uuid) to service_role;

create or replace function public.get_verification_identity_number(p_reviewer_user_id uuid, p_subject_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result text;
begin
  if not exists (
    select 1 from private.admin_users a
    where a.user_id = p_reviewer_user_id
      and a.active = true
      and a.admin_role in ('super_admin','verification_admin')
  ) then
    raise exception 'Not authorized';
  end if;

  select p.identity_number into result
  from private.mechanic_identity_private p
  where p.user_id = p_subject_user_id;

  return result;
end;
$$;

revoke all on function public.get_verification_identity_number(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_verification_identity_number(uuid, uuid) to service_role;

create or replace function public.review_mechanic_verification(
  p_reviewer_user_id uuid,
  p_subject_user_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider text;
  current_status text;
  next_status text;
  audit_action text;
  readable_id text;
begin
  if not exists (
    select 1 from private.admin_users a
    where a.user_id = p_reviewer_user_id
      and a.active = true
      and a.admin_role in ('super_admin','verification_admin')
  ) then
    raise exception 'Not authorized';
  end if;

  select p.provider_type into provider
  from public.profiles p
  where p.id = p_subject_user_id and p.role = 'mechanic';

  if provider is null then
    raise exception 'Mechanic account not found';
  end if;

  select s.status into current_status
  from public.mechanic_verification_submissions s
  where s.user_id = p_subject_user_id
  for update;

  if current_status is null then
    raise exception 'Verification submission not found';
  end if;

  if p_decision = 'approve' then
    if current_status <> 'pending' then
      raise exception 'Only pending submissions can be approved';
    end if;

    if provider = 'individual' then
      select p.identity_number into readable_id
      from private.mechanic_identity_private p
      where p.user_id = p_subject_user_id;

      if readable_id is null then
        raise exception 'Readable ID number is missing. Request resubmission before approval';
      end if;

      update public.mechanic_verification_submissions
      set document_valid_review = true,
          id_number_match_review = true,
          status = 'approved',
          reviewed_at = now(),
          review_note = nullif(btrim(coalesce(p_note, '')), ''),
          updated_at = now()
      where user_id = p_subject_user_id;
    else
      update public.mechanic_verification_submissions
      set document_valid_review = true,
          business_permit_match_review = true,
          status = 'approved',
          reviewed_at = now(),
          review_note = nullif(btrim(coalesce(p_note, '')), ''),
          updated_at = now()
      where user_id = p_subject_user_id;
    end if;

    next_status := 'approved';
    audit_action := 'approved';
  elsif p_decision in ('reject', 'resubmit') then
    if nullif(btrim(coalesce(p_note, '')), '') is null then
      raise exception 'A review note is required';
    end if;

    if p_decision = 'resubmit' and provider = 'individual' then
      update public.mechanic_verification_submissions
      set status = 'rejected',
          identity_claimed = false,
          document_valid_review = false,
          id_number_match_review = false,
          reviewed_at = now(),
          review_note = 'Resubmission requested: ' || btrim(p_note),
          updated_at = now()
      where user_id = p_subject_user_id;
    elsif p_decision = 'resubmit' and provider = 'garage' then
      update public.mechanic_verification_submissions
      set status = 'rejected',
          document_valid_review = false,
          business_permit_match_review = false,
          reviewed_at = now(),
          review_note = 'Resubmission requested: ' || btrim(p_note),
          updated_at = now()
      where user_id = p_subject_user_id;
    else
      update public.mechanic_verification_submissions
      set status = 'rejected',
          reviewed_at = now(),
          review_note = btrim(p_note),
          updated_at = now()
      where user_id = p_subject_user_id;
    end if;

    next_status := 'rejected';
    audit_action := case when p_decision = 'resubmit' then 'resubmission_requested' else 'rejected' end;
  else
    raise exception 'Invalid review decision';
  end if;

  insert into private.verification_review_audit (
    subject_user_id, reviewer_user_id, action, note
  ) values (
    p_subject_user_id,
    p_reviewer_user_id,
    audit_action,
    nullif(btrim(coalesce(p_note, '')), '')
  );

  return jsonb_build_object('status', next_status, 'decision', p_decision);
end;
$$;

revoke all on function public.review_mechanic_verification(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_mechanic_verification(uuid, uuid, text, text) to service_role;
