-- Deliver offer INSERT/UPDATE events to the assigned mechanic's app.
-- The existing mechanic_offers_select_own RLS policy restricts row visibility.
-- Polling remains as a fallback when mobile realtime connectivity is unavailable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mechanic_offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mechanic_offers;
  END IF;
END;
$$;
