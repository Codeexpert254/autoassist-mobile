-- Sandbox-only payment simulation, invoked by a JWT-protected super-admin
-- Edge Function. No end-user app or authenticated browser role can execute
-- this database function. All changes are atomic.
--
-- Simulated payments use a distinct provider so they can never be counted
-- as actual M-PESA receipts.

ALTER TABLE public.connection_payments
  DROP CONSTRAINT IF EXISTS connection_payments_provider_check;

ALTER TABLE public.connection_payments
  ADD CONSTRAINT connection_payments_provider_check
  CHECK (provider IN ('mpesa', 'sandbox_simulator'));

CREATE OR REPLACE FUNCTION public.apply_autoassist_sandbox_payment(
  p_request_id uuid,
  p_outcome text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_request public.repair_requests%ROWTYPE;
  v_payment public.connection_payments%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_paid boolean := (p_outcome = 'success');
  v_payment_status text;
  v_count integer;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Sandbox simulation requires privileged server authorization'
      USING ERRCODE = '42501';
  END IF;
  IF p_outcome IS NULL OR p_outcome NOT IN ('success', 'failure') THEN
    RAISE EXCEPTION 'Unsupported sandbox outcome' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_request
  FROM public.repair_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair request not found' USING ERRCODE = '22023';
  END IF;
  IF v_request.status <> 'accepted' OR v_request.mechanic_id IS NULL THEN
    RAISE EXCEPTION 'A mechanic must accept this repair before a test payment'
      USING ERRCODE = '22023';
  END IF;
  IF v_request.connection_fee_amount IS DISTINCT FROM 500 THEN
    RAISE EXCEPTION 'This test only supports the KES 500 connection fee'
      USING ERRCODE = '22023';
  END IF;
  IF v_request.contact_unlocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Contact is already unlocked' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment
  FROM public.connection_payments
  WHERE request_id = p_request_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_payment.status IN ('paid', 'refunded') THEN
      RAISE EXCEPTION 'Existing paid/refunded transactions cannot be simulated'
        USING ERRCODE = '22023';
    END IF;
    IF v_payment.status = 'pending' AND v_payment.checkout_request_id IS NOT NULL THEN
      RAISE EXCEPTION 'An active Daraja checkout must be resolved before simulation'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  v_payment_status := CASE WHEN v_paid THEN 'paid' ELSE 'failed' END;

  IF v_payment.id IS NOT NULL THEN
    UPDATE public.connection_payments
    SET provider = 'sandbox_simulator',
        status = v_payment_status,
        amount = 500,
        currency = 'KES',
        phone = NULL,
        merchant_request_id = NULL,
        checkout_request_id = NULL,
        mpesa_receipt_number = NULL,
        provider_result_code = CASE WHEN v_paid THEN 'SIMULATED_SUCCESS' ELSE 'SIMULATED_FAILURE' END,
        provider_result_message = 'SANDBOX TEST ONLY: No M-PESA payment was collected.',
        initiated_at = v_now,
        paid_at = CASE WHEN v_paid THEN v_now ELSE NULL END,
        failed_at = CASE WHEN v_paid THEN NULL ELSE v_now END
    WHERE id = v_payment.id;
  ELSE
    INSERT INTO public.connection_payments (
      request_id, motorist_id, mechanic_id, amount, currency, provider, status,
      phone, merchant_request_id, checkout_request_id, mpesa_receipt_number,
      provider_result_code, provider_result_message,
      initiated_at, paid_at, failed_at
    ) VALUES (
      v_request.id, v_request.motorist_id, v_request.mechanic_id, 500, 'KES',
      'sandbox_simulator', v_payment_status,
      NULL, NULL, NULL, NULL,
      CASE WHEN v_paid THEN 'SIMULATED_SUCCESS' ELSE 'SIMULATED_FAILURE' END,
      'SANDBOX TEST ONLY: No M-PESA payment was collected.',
      v_now, CASE WHEN v_paid THEN v_now ELSE NULL END,
      CASE WHEN v_paid THEN NULL ELSE v_now END
    );
  END IF;

  IF v_paid THEN
    UPDATE public.repair_requests
    SET status = 'connected', contact_unlocked_at = v_now
    WHERE id = p_request_id AND status = 'accepted';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'Sandbox contact unlock failed' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'requestId', p_request_id,
    'state', v_payment_status,
    'provider', 'sandbox_simulator',
    'simulated', true,
    'contactUnlocked', v_paid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_autoassist_sandbox_payment(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_autoassist_sandbox_payment(uuid, text)
  TO service_role;

COMMENT ON FUNCTION public.apply_autoassist_sandbox_payment(uuid, text)
  IS 'Atomic TEST-ONLY payment transition, service-role exclusively. Call only from the super-admin JWT-protected simulator with MPESA_ENV=sandbox and AUTOASSIST_PAYMENT_SIMULATOR_ENABLED=true.';
