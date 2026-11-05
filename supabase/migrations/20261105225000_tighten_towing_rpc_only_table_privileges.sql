-- Supabase default table privileges may include DML for authenticated.
-- These tables are RPC-controlled and require only RLS-filtered SELECT.
revoke insert, update, delete, truncate, references, trigger
on public.towing_presence,public.towing_requests,public.towing_offers,public.towing_reviews
from authenticated;
grant select on public.towing_presence,public.towing_requests,
  public.towing_offers,public.towing_reviews to authenticated;