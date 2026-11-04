create schema if not exists private;

create table if not exists private.mechanic_identity_fingerprints (
  user_id uuid primary key references public.mechanic_profiles(user_id) on delete cascade,
  identity_hmac text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on schema private from anon, authenticated;
revoke all on private.mechanic_identity_fingerprints from anon, authenticated;

alter table public.mechanic_verification_submissions
  add column if not exists national_id_front_path text,
  add column if not exists national_id_back_path text,
  add column if not exists selfie_path text,
  add column if not exists identity_claimed boolean not null default false,
  add column if not exists document_valid_review boolean not null default false,
  add column if not exists account_name_match_review boolean not null default false,
  add column if not exists selfie_match_review boolean not null default false,
  add column if not exists business_permit_match_review boolean not null default false,
  add column if not exists certificates_valid_review boolean not null default false;

update public.mechanic_verification_submissions
set national_id_front_path = coalesce(national_id_front_path, national_id_path)
where national_id_path is not null;

drop policy if exists mechanic_verification_insert_own on public.mechanic_verification_submissions;
drop policy if exists mechanic_verification_update_own on public.mechanic_verification_submissions;

create policy mechanic_verification_insert_own
on public.mechanic_verification_submissions
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status in ('draft','pending')
  and (
    status = 'draft'
    or (
      identity_claimed
      and certificates_confirmed
      and profile_photo_confirmed
      and coalesce(array_length(certificate_paths, 1), 0) > 0
      and profile_photo_path is not null
      and national_id_front_path is not null
      and national_id_back_path is not null
      and selfie_path is not null
      and exists (
        select 1 from public.profiles p
        where p.id = mechanic_verification_submissions.user_id
          and p.role = 'mechanic'
          and (
            p.provider_type = 'individual'
            or (
              p.provider_type = 'garage'
              and mechanic_verification_submissions.business_permit_confirmed
              and mechanic_verification_submissions.business_permit_path is not null
            )
          )
      )
    )
  )
);

create policy mechanic_verification_update_own
on public.mechanic_verification_submissions
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and status in ('draft','pending','rejected')
  and (
    status in ('draft','rejected')
    or (
      identity_claimed
      and certificates_confirmed
      and profile_photo_confirmed
      and coalesce(array_length(certificate_paths, 1), 0) > 0
      and profile_photo_path is not null
      and national_id_front_path is not null
      and national_id_back_path is not null
      and selfie_path is not null
      and exists (
        select 1 from public.profiles p
        where p.id = mechanic_verification_submissions.user_id
          and p.role = 'mechanic'
          and (
            p.provider_type = 'individual'
            or (
              p.provider_type = 'garage'
              and mechanic_verification_submissions.business_permit_confirmed
              and mechanic_verification_submissions.business_permit_path is not null
            )
          )
      )
    )
  )
);

create or replace function public.protect_mechanic_verification_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated','anon') then
    if new.document_valid_review is distinct from old.document_valid_review
      or new.account_name_match_review is distinct from old.account_name_match_review
      or new.selfie_match_review is distinct from old.selfie_match_review
      or new.business_permit_match_review is distinct from old.business_permit_match_review
      or new.certificates_valid_review is distinct from old.certificates_valid_review
      or new.reviewed_at is distinct from old.reviewed_at
      or new.review_note is distinct from old.review_note
      or new.status = 'approved'
    then
      raise exception 'Verification review fields are server-managed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_mechanic_verification_review_fields on public.mechanic_verification_submissions;
create trigger protect_mechanic_verification_review_fields
before update on public.mechanic_verification_submissions
for each row execute function public.protect_mechanic_verification_review_fields();
