create table if not exists public.mechanic_verification_submissions (
  user_id uuid primary key references public.mechanic_profiles(user_id) on delete cascade,
  national_id_confirmed boolean not null default false,
  business_permit_confirmed boolean not null default false,
  certificates_confirmed boolean not null default false,
  profile_photo_confirmed boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text,
  updated_at timestamptz not null default now()
);

create or replace function public.protect_mechanic_verification_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role') then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.reviewed_at := null;
      new.review_note := null;
    else
      if new.status is distinct from old.status
         or new.reviewed_at is distinct from old.reviewed_at
         or new.review_note is distinct from old.review_note then
        raise exception 'verification review fields are server-managed';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mechanic_verification_protect_review on public.mechanic_verification_submissions;
create trigger mechanic_verification_protect_review
before insert or update on public.mechanic_verification_submissions
for each row execute function public.protect_mechanic_verification_review();

revoke all on function public.protect_mechanic_verification_review() from public, anon, authenticated;

alter table public.mechanic_verification_submissions enable row level security;
revoke all on table public.mechanic_verification_submissions from anon;
grant select, insert, update on table public.mechanic_verification_submissions to authenticated;

drop policy if exists "mechanic_verification_select_own" on public.mechanic_verification_submissions;
create policy "mechanic_verification_select_own"
on public.mechanic_verification_submissions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "mechanic_verification_insert_own" on public.mechanic_verification_submissions;
create policy "mechanic_verification_insert_own"
on public.mechanic_verification_submissions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and national_id_confirmed
  and business_permit_confirmed
  and certificates_confirmed
  and profile_photo_confirmed
);

drop policy if exists "mechanic_verification_update_own" on public.mechanic_verification_submissions;
create policy "mechanic_verification_update_own"
on public.mechanic_verification_submissions for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and national_id_confirmed
  and business_permit_confirmed
  and certificates_confirmed
  and profile_photo_confirmed
);

create index if not exists mechanic_verification_status_idx on public.mechanic_verification_submissions(status);
