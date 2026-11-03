alter table public.mechanic_verification_submissions
  add column if not exists id_number_match_review boolean not null default false;

create or replace function public.protect_mechanic_verification_review_fields()
returns trigger
language plpgsql
set search_path = 'public'
as $function$
declare
  provider text;
begin
  select p.provider_type into provider
  from public.profiles p
  where p.id = new.user_id;

  if current_user in ('authenticated','anon') then
    if tg_op = 'INSERT' then
      if new.identity_claimed
        or new.document_valid_review
        or new.id_number_match_review
        or new.account_name_match_review
        or new.selfie_match_review
        or new.business_permit_match_review
        or new.certificates_valid_review
        or new.reviewed_at is not null
        or new.review_note is not null
        or new.status = 'approved'
      then
        raise exception 'Verification identity and review fields are server-managed';
      end if;
    else
      if new.identity_claimed is distinct from old.identity_claimed
        or new.document_valid_review is distinct from old.document_valid_review
        or new.id_number_match_review is distinct from old.id_number_match_review
        or new.account_name_match_review is distinct from old.account_name_match_review
        or new.selfie_match_review is distinct from old.selfie_match_review
        or new.business_permit_match_review is distinct from old.business_permit_match_review
        or new.certificates_valid_review is distinct from old.certificates_valid_review
        or new.reviewed_at is distinct from old.reviewed_at
        or new.review_note is distinct from old.review_note
        or new.status = 'approved'
      then
        raise exception 'Verification identity and review fields are server-managed';
      end if;
    end if;
  end if;

  if new.status = 'approved' then
    if provider = 'individual' then
      if not new.identity_claimed
        or not new.national_id_confirmed
        or new.national_id_path is null
        or not new.profile_photo_confirmed
        or new.profile_photo_path is null
        or not new.document_valid_review
        or not new.id_number_match_review
      then
        raise exception 'Complete the ID number and document review before approval';
      end if;
    elsif provider = 'garage' then
      if not new.business_permit_confirmed
        or new.business_permit_path is null
        or not new.profile_photo_confirmed
        or new.profile_photo_path is null
        or not new.document_valid_review
        or not new.business_permit_match_review
      then
        raise exception 'Complete the business permit review before approval';
      end if;
    else
      raise exception 'Unknown mechanic provider type';
    end if;
  end if;

  return new;
end;
$function$;

drop policy if exists mechanic_verification_insert_own on public.mechanic_verification_submissions;
create policy mechanic_verification_insert_own
on public.mechanic_verification_submissions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status in ('draft','pending')
  and (
    status = 'draft'
    or exists (
      select 1
      from public.profiles p
      where p.id = mechanic_verification_submissions.user_id
        and p.role = 'mechanic'
        and (
          (
            p.provider_type = 'individual'
            and mechanic_verification_submissions.identity_claimed
            and mechanic_verification_submissions.national_id_confirmed
            and mechanic_verification_submissions.national_id_path is not null
            and mechanic_verification_submissions.profile_photo_confirmed
            and mechanic_verification_submissions.profile_photo_path is not null
          )
          or
          (
            p.provider_type = 'garage'
            and mechanic_verification_submissions.business_permit_confirmed
            and mechanic_verification_submissions.business_permit_path is not null
            and mechanic_verification_submissions.profile_photo_confirmed
            and mechanic_verification_submissions.profile_photo_path is not null
          )
        )
    )
  )
);

drop policy if exists mechanic_verification_update_own on public.mechanic_verification_submissions;
create policy mechanic_verification_update_own
on public.mechanic_verification_submissions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and status in ('draft','pending','rejected')
  and (
    status in ('draft','rejected')
    or exists (
      select 1
      from public.profiles p
      where p.id = mechanic_verification_submissions.user_id
        and p.role = 'mechanic'
        and (
          (
            p.provider_type = 'individual'
            and mechanic_verification_submissions.identity_claimed
            and mechanic_verification_submissions.national_id_confirmed
            and mechanic_verification_submissions.national_id_path is not null
            and mechanic_verification_submissions.profile_photo_confirmed
            and mechanic_verification_submissions.profile_photo_path is not null
          )
          or
          (
            p.provider_type = 'garage'
            and mechanic_verification_submissions.business_permit_confirmed
            and mechanic_verification_submissions.business_permit_path is not null
            and mechanic_verification_submissions.profile_photo_confirmed
            and mechanic_verification_submissions.profile_photo_path is not null
          )
        )
    )
  )
);
