import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function formatKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  throw new Error("Use a valid Kenyan mobile number such as 0712345678 or +254712345678.");
}

function mpesaTimestamp() {
  const date = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const service = createClient(supabaseUrl, serviceKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const requestId = String(body.requestId ?? "");
  if (!requestId) return json({ error: "requestId is required" }, 400);

  const { data: request, error: requestError } = await service.from("repair_requests").select("*").eq("id", requestId).single();
  if (requestError || !request) return json({ error: "Repair request not found" }, 404);
  if (request.motorist_id !== authData.user.id) return json({ error: "Forbidden" }, 403);
  if (!request.mechanic_id || request.status !== "accepted") {
    return json({ error: "A mechanic must accept this request before the connection fee can be paid." }, 409);
  }

  const { data: existingPayment } = await service.from("connection_payments").select("*").eq("request_id", requestId).maybeSingle();
  if (existingPayment?.status === "paid") return json({ state: "paid", requestId, receipt: existingPayment.mpesa_receipt_number });

  // Avoid replacing the checkout ID while Safaricom may still be processing
  // the previous attempt; otherwise its eventual callback cannot be matched.
  const initiatedAt = Date.parse(String(existingPayment?.initiated_at ?? ""));
  if (existingPayment?.status === "pending" && existingPayment.checkout_request_id &&
      Number.isFinite(initiatedAt) && Date.now() - initiatedAt < 3 * 60 * 1000) {
    return json({
      state: "pending",
      requestId,
      checkoutRequestId: existingPayment.checkout_request_id,
      customerMessage: "An M-PESA request is already being processed. Use Check payment status before retrying.",
    });
  }

  const { data: motoristProfile } = await service.from("profiles").select("phone").eq("id", authData.user.id).single();
  let phone: string;
  try {
    phone = formatKenyanPhone(String(body.phone ?? motoristProfile?.phone ?? ""));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid phone number" }, 400);
  }

  const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY") ?? "";
  const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET") ?? "";
  const shortcode = Deno.env.get("MPESA_SHORTCODE") ?? "";
  const passkey = Deno.env.get("MPESA_PASSKEY") ?? "";
  const callbackUrlBase = Deno.env.get("MPESA_CALLBACK_URL") ?? "";
  const callbackSecret = Deno.env.get("MPESA_CALLBACK_SECRET") ?? "";
  const environment = (Deno.env.get("MPESA_ENV") ?? "sandbox").toLowerCase();

  if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrlBase || !callbackSecret) {
    return json({
      error: "M-PESA is not configured yet. Add the Daraja credentials and callback settings to the Supabase Edge Function secrets.",
      code: "mpesa_not_configured",
    }, 503);
  }

  const baseUrl = environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const authResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` },
  });
  const authJson = await authResponse.json().catch(() => ({}));
  if (!authResponse.ok || !authJson.access_token) return json({ error: "Unable to authenticate with M-PESA Daraja." }, 502);

  const timestamp = mpesaTimestamp();
  const password = btoa(`${shortcode}${passkey}${timestamp}`);
  const callbackUrl = `${callbackUrlBase}${callbackUrlBase.includes("?") ? "&" : "?"}token=${encodeURIComponent(callbackSecret)}`;
  const amount = Math.round(Number(request.connection_fee_amount ?? 500));

  const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authJson.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: "AutoAssist",
      TransactionDesc: "AutoAssist connection fee",
    }),
  });

  const stkJson = await stkResponse.json().catch(() => ({}));
  if (!stkResponse.ok || String(stkJson.ResponseCode ?? "") !== "0") {
    await service.from("connection_payments").upsert({
      request_id: requestId,
      motorist_id: request.motorist_id,
      mechanic_id: request.mechanic_id,
      amount,
      status: "failed",
      phone,
      provider_result_code: String(stkJson.ResponseCode ?? stkJson.errorCode ?? "request_failed"),
      provider_result_message: String(stkJson.ResponseDescription ?? stkJson.errorMessage ?? "M-PESA request failed"),
      failed_at: new Date().toISOString(),
    }, { onConflict: "request_id" });
    return json({ error: stkJson.errorMessage ?? stkJson.ResponseDescription ?? "M-PESA STK Push failed." }, 502);
  }

  await service.from("connection_payments").upsert({
    request_id: requestId,
    motorist_id: request.motorist_id,
    mechanic_id: request.mechanic_id,
    amount,
    currency: "KES",
    provider: "mpesa",
    status: "pending",
    phone,
    merchant_request_id: stkJson.MerchantRequestID ?? null,
    checkout_request_id: stkJson.CheckoutRequestID ?? null,
    provider_result_code: String(stkJson.ResponseCode ?? "0"),
    provider_result_message: String(stkJson.ResponseDescription ?? "STK Push sent"),
    initiated_at: new Date().toISOString(),
    failed_at: null,
  }, { onConflict: "request_id" });

  return json({
    state: "pending",
    requestId,
    amount,
    phone,
    checkoutRequestId: stkJson.CheckoutRequestID,
    customerMessage: stkJson.CustomerMessage ?? "Check your phone and enter your M-PESA PIN.",
  });
});
