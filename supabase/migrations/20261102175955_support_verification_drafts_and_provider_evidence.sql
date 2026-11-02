alter table public.mechanic_verification_submissions
  drop constraint if exists mechanic_verification_submissions_status_check;

alter table public.mechanic_verification_submissions
  add constraint mechanic_verification_submissions_status_check
  check (status in ('draft','pending','approved','rejected'));

create or replace function public.protect_mechanic_verification_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role') then
    if tg_op = 'INSERT' then
      if new.status is distinct from 'pending' then
        new.status := 'draft';
      end if;
      new.reviewed_at := null;
      new.review_note := null;
    else
      if new.reviewed_at is distinct from old.reviewed_at
         or new.review_note is distinct from old.review_note then
        raise exception 'verification review fields are server-managed';
      end if;

      if new.status is distinct from old.status then
        if not (old.status in ('draft','rejected') and new.status = 'pending') then
          raise exception 'verification status transition is not allowed';
        end if;
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop policy if exists mechanic_verification_insert_own on public.mechanic_verification_submissions;
drop policy if exists mechanic_verification_update_own on public.mechanic_verification_submissions;

create policy mechanic_verification_insert_own
on public.mechanic_verification_submissions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status in ('draft','pending')
  and (
    status = 'draft'
    or (
      certificates_confirmed
      and profile_photo_confirmed
      and coalesce(array_length(certificate_paths, 1), 0) > 0
      and profile_photo_path is not null
      and exists (
        select 1
        from public.profiles p
        where p.id = user_id
          and p.role = 'mechanic'
          and (
            (p.provider_type = 'individual' and national_id_confirmed and national_id_path is not null)
            or
            (p.provider_type = 'garage' and business_permit_confirmed and business_permit_path is not null)
          )
      )
    )
  )
);

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
    or (
      certificates_confirmed
      and profile_photo_confirmed
      and coalesce(array_length(certificate_paths, 1), 0) > 0
      and profile_photo_path is not null
      and exists (
        select 1
        from public.profiles p
        where p.id = user_id
          and p.role = 'mechanic'
          and (
            (p.provider_type = 'individual' and national_id_confirmed and national_id_path is not null)
            or
            (p.provider_type = 'garage' and business_permit_confirmed and business_permit_path is not null)
          )
      )
    )
  )
);
