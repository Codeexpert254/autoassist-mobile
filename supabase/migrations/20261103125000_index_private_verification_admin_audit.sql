create index if not exists verification_admins_created_by_idx
  on private.verification_admins(created_by)
  where created_by is not null;

create index if not exists verification_review_audit_reviewer_idx
  on private.verification_review_audit(reviewer_user_id, created_at desc);

create index if not exists verification_review_audit_subject_idx
  on private.verification_review_audit(subject_user_id, created_at desc);
