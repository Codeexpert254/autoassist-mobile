-- Restore shop owner updates. The existing SELECT/UPDATE RLS policies
-- enforce owner_id=auth.uid(); shop guard triggers prevent self-approval,
-- changes to ownership, ratings or review state, and opening unverified shops.
grant update on table public.parts_shops to authenticated;
