create schema if not exists private;

create table if not exists private.mechanic_identity_private (
  user_id uuid primary key references public.mechanic_profiles(user_id) on delete cascade,
  identity_number text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mechanic_identity_private_format_check check (identity_number ~ '^[A-Z0-9]{6,20}$')
);

create table if not exists private.verification_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

create table if not exists private.verification_review_audit (
  id bigint generated always as identity primary key,
  subject_user_id uuid not null references public.mechanic_profiles(user_id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('approved', 'rejected', 'resubmission_requested')),
  note text null,
  created_at timestamptz not null default now()
);

revoke all on table private.mechanic_identity_private from public, anon, authenticated;
revoke all on table private.verification_admins from public, anon, authenticated;
revoke all on table private.verification_review_audit from public, anon, authenticated;

create or replace function public.register_mechanic_identity_private(
  p_user_id uuid,
  p_identity_hmac text,
  p_identity_number text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_identity_hmac is null or length(p_identity_hmac) < 32 then
    raise exception 'Invalid identity fingerprint';
  end if;

  if p_identity_number is null or p_identity_number !~ '^[A-Z0-9]{6,20}$' then
    raise exception 'Invalid identity number';
  end if;

  if exists (
    select 1 from private.mechanic_identity_fingerprints f
    where f.identity_hmac = p_identity_hmac and f.user_id <> p_user_id
  ) then
    return false;
  end if;

  if exists (
    select 1 from private.mechanic_identity_private p
    where p.identity_number = p_identity_number and p.user_id <> p_user_id
  ) then
    return false;
  end if;

  insert into private.mechanic_identity_fingerprints (user_id, identity_hmac, created_at, updated_at)
  values (p_user_id, p_identity_hmac, now(), now())
  on conflict (user_id) do update
  set identity_hmac = excluded.identity_hmac,
      updated_at = now();

  insert into private.mechanic_identity_private (user_id, identity_number, created_at, updated_at)
  values (p_user_id, p_identity_number, now(), now())
  on conflict (user_id) do update
  set identity_number = excluded.identity_number,
      updated_at = now();

  return true;
end;
$$;

revoke all on function public.register_mechanic_identity_private(uuid, text, text) from public, anon, authenticated;
grant execute on function public.register_mechanic_identity_private(uuid, text, text) to service_role;

create or replace function public.is_verification_admin(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from private.verification_admins a where a.user_id = p_user_id);
$$;

revoke all on function public.is_verification_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_verification_admin(uuid) to service_role;

create or replace function public.get_verification_identity_number(
  p_reviewer_user_id uuid,
  p_subject_user_id uuid
)
returns text
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  result text;
begin
  if not exists (select 1 from private.verification_admins a where a.user_id = p_reviewer_user_id) then
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
  if not exists (select 1 from private.verification_admins a where a.user_id = p_reviewer_user_id) then
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

  insert into private.verification_review_audit (subject_user_id, reviewer_user_id, action, note)
  values (p_subject_user_id, p_reviewer_user_id, audit_action, nullif(btrim(coalesce(p_note, '')), ''));

  return jsonb_build_object('status', next_status, 'decision', p_decision);
end;
$$;

revoke all on function public.review_mechanic_verification(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_mechanic_verification(uuid, uuid, text, text) to service_role;
