create or replace function public.protect_mechanic_verification_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
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
    if not new.document_valid_review
      or not new.account_name_match_review
      or not new.selfie_match_review
      or not new.certificates_valid_review
      or (provider = 'garage' and not new.business_permit_match_review)
    then
      raise exception 'Complete the verification review checklist before approval';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_mechanic_verification_review_fields on public.mechanic_verification_submissions;
create trigger protect_mechanic_verification_review_fields
before insert or update on public.mechanic_verification_submissions
for each row execute function public.protect_mechanic_verification_review_fields();
