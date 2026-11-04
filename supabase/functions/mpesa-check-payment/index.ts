import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function mpesaTimestamp() {
  // Daraja expects the M-PESA East Africa Time timestamp (YYYYMMDDHHmmss).
  const date = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

async function unlockConnection(service: any, requestId: string) {
  const now = new Date().toISOString();
  const { data: updated, error } = await service
    .from("repair_requests")
    .update({ status: "connected", contact_unlocked_at: now })
    .eq("id", requestId)
    .eq("status", "accepted")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (updated) return true;

  const { data: request, error: readError } = await service
    .from("repair_requests")
    .select("status, contact_unlocked_at")
    .eq("id", requestId)
    .single();
  if (readError) throw readError;
  // A repair may already have moved beyond the connected state.
  if (request?.contact_unlocked_at) return false;
  throw new Error("Payment is confirmed, but the connection is not unlocked yet.");
}

async function notifyConnection(service: any, payment: any) {
  for (const [userId, title, body, route] of [
    [payment.motorist_id, "Connection confirmed", "Payment received. Your mechanic connection is now unlocked.", "/motorist/mechanic-assigned"],
    [payment.mechanic_id, "Customer connection confirmed", "The AutoAssist connection fee is paid. You can now proceed to the customer.", "/mechanic/job-details"],
  ]) {
    try {
      const { data: tokens } = await service
        .from("device_push_tokens").select("expo_push_token")
        .eq("user_id", userId).eq("enabled", true);
      if (!tokens?.length) continue;
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(tokens.map((item: any) => ({
          to: item.expo_push_token,
          sound: "default", priority: "high", channelId: "jobs",
          title, body, data: { type: "connection_unlocked", route, requestId: payment.request_id },
        }))),
      });
    } catch (error) {
      console.error("Connection notification failed", error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(requestId)) {
    return json({ error: "Valid repair request ID is required." }, 400);
  }

  // Keep all privileged payment lookups on the server.
  const service = createClient(supabaseUrl, serviceKey);
  const { data: repair, error: repairError } = await service
    .from("repair_requests").select("id, motorist_id, status, contact_unlocked_at")
    .eq("id", requestId).maybeSingle();
  if (repairError) return json({ error: "Unable to load repair request." }, 500);
  if (!repair) return json({ error: "Repair request not found." }, 404);
  if (repair.motorist_id !== authData.user.id) return json({ error: "Forbidden" }, 403);

  const { data: payment, error: paymentError } = await service
    .from("connection_payments").select("*").eq("request_id", requestId).maybeSingle();
  if (paymentError) return json({ error: "Unable to load connection payment." }, 500);
  if (payment?.provider === "sandbox_simulator") {
    return json({
      state: payment.status === "paid" ? "paid" : "failed",
      simulated: true,
      message: payment.status === "paid"
        ? "SANDBOX TEST SUCCESS: Contact is unlocked. No real M-PESA funds were collected."
        : "SANDBOX TEST FAILURE: No real M-PESA funds were collected. Contact remains locked.",
    });
  }
  if (!payment || !payment.checkout_request_id) {
    return json({ state: "not_started", message: "No M-PESA checkout request has been started for this connection." });
  }
  if (payment.status === "paid") {
    try {
      if (!repair.contact_unlocked_at) await unlockConnection(service, requestId);
    } catch (error) {
      console.error("Paid payment connection reconciliation failed", error);
      return json({ state: "paid", message: "M-PESA payment is confirmed, but contact unlock needs attention. Please retry status check." }, 500);
    }
    return json({ state: "paid", message: "Payment is confirmed. Your mechanic connection is unlocked." });
  }
  if (payment.status === "failed") {
    return json({ state: "failed", message: payment.provider_result_message || "M-PESA did not complete the payment." });
  }
  if (payment.status !== "pending") {
    return json({ state: "pending", message: "The payment is not confirmed yet." });
  }

  const initiatedAt = Date.parse(String(payment.initiated_at ?? ""));
  if (Number.isFinite(initiatedAt) && Date.now() - initiatedAt < 10000) {
    return json({ state: "pending", message: "M-PESA is still processing the request. Check again shortly." });
  }

  const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY") ?? "";
  const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET") ?? "";
  const shortcode = Deno.env.get("MPESA_SHORTCODE") ?? "";
  const passkey = Deno.env.get("MPESA_PASSKEY") ?? "";
  const environment = (Deno.env.get("MPESA_ENV") ?? "sandbox").toLowerCase();
  if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
    return json({ error: "M-PESA status checking is not configured on the server." }, 503);
  }

  const baseUrl = environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

  try {
    const authResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` },
    });
    const authJson = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok || !authJson.access_token) {
      return json({ error: "Unable to authenticate with Daraja to check the payment." }, 502);
    }

    const timestamp = mpesaTimestamp();
    const checkResponse = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: btoa(`${shortcode}${passkey}${timestamp}`),
        Timestamp: timestamp,
        CheckoutRequestID: payment.checkout_request_id,
      }),
    });
    const result = await checkResponse.json().catch(() => ({}));
    if (!checkResponse.ok || String(result.ResponseCode ?? "") !== "0") {
      // A failed status query is not evidence of a failed payment.
      return json({
        state: "pending",
        message: "Daraja could not confirm this payment yet. No new charge was initiated. Try checking again shortly.",
      });
    }
    if (result.CheckoutRequestID && result.CheckoutRequestID !== payment.checkout_request_id) {
      return json({ error: "Daraja returned a different checkout reference." }, 502);
    }

    if (result.ResultCode === undefined || result.ResultCode === null) {
      return json({ state: "pending", message: "Daraja accepted the status query but has not returned a final payment result." });
    }

    const resultCode = String(result.ResultCode);
    const resultDesc = String(result.ResultDesc ?? "M-PESA payment status received");
    const update = resultCode === "0"
      ? { status: "paid", provider_result_code: resultCode, provider_result_message: resultDesc, paid_at: new Date().toISOString(), failed_at: null }
      : { status: "failed", provider_result_code: resultCode, provider_result_message: resultDesc, failed_at: new Date().toISOString() };

    // Compare-and-set ensures a delayed query never overwrites a callback,
    // a newer checkout, or a payment that was already confirmed.
    const { data: transitioned, error: updateError } = await service
      .from("connection_payments").update(update)
      .eq("id", payment.id)
      .eq("checkout_request_id", payment.checkout_request_id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;

    if (transitioned && resultCode === "0") {
      await unlockConnection(service, requestId);
      await notifyConnection(service, payment);
    }

    if (!transitioned) {
      const { data: latest } = await service
        .from("connection_payments").select("status, provider_result_message")
        .eq("id", payment.id).maybeSingle();
      if (latest?.status === "paid") {
        if (!repair.contact_unlocked_at) await unlockConnection(service, requestId);
        return json({ state: "paid", message: "Payment is confirmed. Your mechanic connection is unlocked." });
      }
      if (latest?.status === "failed") {
        return json({ state: "failed", message: latest.provider_result_message || "Payment was not completed." });
      }
      return json({ state: "pending", message: "A newer M-PESA attempt is being processed. Check its status shortly." });
    }

    if (resultCode === "0") {
      return json({ state: "paid", message: "Daraja confirmed your payment. Contact details are now unlocked." });
    }
    return json({ state: "failed", message: resultDesc });
  } catch (error) {
    console.error("M-PESA status query failed", error);
    return json({ error: "Unable to check M-PESA right now. The payment has not been marked paid or failed." }, 502);
  }
});
