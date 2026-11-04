alter table public.mechanic_verification_submissions
  add column if not exists national_id_path text,
  add column if not exists business_permit_path text,
  add column if not exists certificate_paths text[] not null default '{}'::text[],
  add column if not exists profile_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mechanic-verification',
  'mechanic-verification',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Mechanics upload own verification files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mechanic-verification'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Mechanics read own verification files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mechanic-verification'
  and owner_id = (select auth.uid()::text)
);

create policy "Mechanics delete own verification files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mechanic-verification'
  and owner_id = (select auth.uid()::text)
);
