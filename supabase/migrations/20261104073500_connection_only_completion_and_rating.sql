-- AutoAssist is a connection service: connection payment -> travel -> arrival ->
-- provider marks visit finished -> motorist rating -> completed.
-- Preserve old historical status values for existing records, but do not allow
-- new authenticated participants to enter inspection/quote/labour payment states.

CREATE OR REPLACE FUNCTION public.validate_repair_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  actor uuid := auth.uid();
  mechanic_verified boolean;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW; -- privileged backend transitions remain server controlled
  END IF;

  IF NEW.motorist_id IS DISTINCT FROM OLD.motorist_id
     OR NEW.mechanic_id IS DISTINCT FROM OLD.mechanic_id
     OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
     OR NEW.dispatch_attempts IS DISTINCT FROM OLD.dispatch_attempts
     OR NEW.connection_fee_amount IS DISTINCT FROM OLD.connection_fee_amount
     OR NEW.contact_unlocked_at IS DISTINCT FROM OLD.contact_unlocked_at THEN
    RAISE EXCEPTION 'repair assignment and dispatch fields are server-managed';
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description
     OR NEW.symptom IS DISTINCT FROM OLD.symptom
     OR NEW.location_text IS DISTINCT FROM OLD.location_text
     OR NEW.latitude IS DISTINCT FROM OLD.latitude
     OR NEW.longitude IS DISTINCT FROM OLD.longitude
     OR NEW.preferred_time IS DISTINCT FROM OLD.preferred_time THEN
    RAISE EXCEPTION 'submitted repair details cannot be edited';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF actor = OLD.motorist_id THEN
    IF NOT (
      (OLD.status IN ('matching','offered','requested','accepted','connected')
       AND NEW.status = 'cancelled')
      OR (OLD.status = 'repair-complete' AND NEW.status = 'completed'
          AND EXISTS (
            SELECT 1 FROM public.ratings r
            WHERE r.request_id = OLD.id AND r.motorist_id = OLD.motorist_id
              AND r.mechanic_id = OLD.mechanic_id
          ))
    ) THEN
      RAISE EXCEPTION 'motorist may complete this service only by submitting a rating';
    END IF;
  ELSIF actor = OLD.mechanic_id THEN
    SELECT EXISTS (
      SELECT 1 FROM public.mechanic_profiles mp
      WHERE mp.user_id = actor AND mp.verified = true
    ) INTO mechanic_verified;

    IF NOT mechanic_verified THEN
      RAISE EXCEPTION 'mechanic must be verified before updating service status';
    END IF;
    IF NOT (
      (OLD.status = 'connected' AND NEW.status = 'en-route')
      OR (OLD.status = 'en-route' AND NEW.status = 'arrived')
    ) THEN
      RAISE EXCEPTION 'mechanic status transition is not permitted';
    END IF;
    IF OLD.contact_unlocked_at IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.connection_payments cp
      WHERE cp.request_id = OLD.id AND cp.status = 'paid'
    ) THEN
      RAISE EXCEPTION 'connection must be confirmed before travel or arrival';
    END IF;
  ELSE
    RAISE EXCEPTION 'only service participants may update this request';
  END IF;

  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS ratings_motorist_insert ON public.ratings;
CREATE POLICY ratings_motorist_insert
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = motorist_id
  AND EXISTS (
    SELECT 1 FROM public.repair_requests r
    JOIN public.connection_payments cp ON cp.request_id = r.id
    WHERE r.id = ratings.request_id
      AND r.motorist_id = ratings.motorist_id
      AND r.mechanic_id = ratings.mechanic_id
      AND r.status = 'repair-complete'
      AND r.contact_unlocked_at IS NOT NULL
      AND cp.status = 'paid'
  )
);

-- Writing a rating and closing the service is a single transaction.
-- Failed status transition rolls back the rating insert too.
CREATE OR REPLACE FUNCTION public.complete_autoassist_service_after_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.repair_requests r
  SET status = 'completed'
  WHERE r.id = NEW.request_id
    AND r.motorist_id = NEW.motorist_id
    AND r.mechanic_id = NEW.mechanic_id
    AND r.status = 'repair-complete'
    AND r.contact_unlocked_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only an awaited service rating may complete the request';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS ratings_complete_service_after_rating ON public.ratings;
CREATE TRIGGER ratings_complete_service_after_rating
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.complete_autoassist_service_after_rating();

-- Sandbox simulations test the UX, never contribute to actual
-- provider reputation or the real completed-job counter.
CREATE OR REPLACE FUNCTION public.update_mechanic_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.mechanic_profiles mp
  SET rating = COALESCE((
        SELECT ROUND(AVG(r.rating)::numeric, 1)
        FROM public.ratings r
        JOIN public.connection_payments cp ON cp.request_id = r.request_id
        WHERE r.mechanic_id = NEW.mechanic_id
          AND cp.provider = 'mpesa'
          AND cp.status = 'paid'
      ), 0),
      reviews_count = (
        SELECT COUNT(*)::integer
        FROM public.ratings r
        JOIN public.connection_payments cp ON cp.request_id = r.request_id
        WHERE r.mechanic_id = NEW.mechanic_id
          AND cp.provider = 'mpesa'
          AND cp.status = 'paid'
      ),
      updated_at = NOW()
  WHERE mp.user_id = NEW.mechanic_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_mechanic_completed_jobs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed'
     AND NEW.mechanic_id IS NOT NULL THEN
    UPDATE public.mechanic_profiles mp
    SET completed_jobs = completed_jobs +
      CASE WHEN EXISTS (
        SELECT 1 FROM public.connection_payments cp
        WHERE cp.request_id = NEW.id AND cp.provider = 'mpesa'
          AND cp.status = 'paid'
      ) THEN 1 ELSE 0 END,
      is_available = false,
      availability_updated_at = now()
    WHERE mp.user_id = NEW.mechanic_id;
  END IF;
  RETURN NEW;
END;
$function$;
