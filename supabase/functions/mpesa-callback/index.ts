import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function metadataValue(items: any[], name: string) {
  return items.find((item) => item?.Name === name)?.Value ?? null;
}

async function sendPush(service: any, userId: string, payload: { title: string; body: string; data: Record<string, unknown> }) {
  const { data: tokens } = await service
    .from("device_push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId)
    .eq("enabled", true);
  const messages = (tokens ?? []).map((item: any) => ({
    to: item.expo_push_token,
    sound: "default",
    priority: "high",
    channelId: "jobs",
    ...payload,
  }));
  if (messages.length === 0) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ResultCode: 0, ResultDesc: "Accepted" });

  const expectedSecret = Deno.env.get("MPESA_CALLBACK_SECRET") ?? "";
  const suppliedSecret = new URL(req.url).searchParams.get("token") ?? "";
  if (!expectedSecret || suppliedSecret !== expectedSecret) return json({ error: "Unauthorized callback" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const service = createClient(supabaseUrl, serviceKey);
  const payload = await req.json().catch(() => ({}));
  const callback = payload?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) return json({ ResultCode: 0, ResultDesc: "Callback received" });

  const { data: payment, error: paymentError } = await service
    .from("connection_payments")
    .select("*")
    .eq("checkout_request_id", callback.CheckoutRequestID)
    .maybeSingle();
  if (paymentError || !payment) {
    console.error("Unknown checkout request", callback.CheckoutRequestID, paymentError);
    return json({ ResultCode: 0, ResultDesc: "Callback received" });
  }

  const resultCode = String(callback.ResultCode ?? "");
  const resultDesc = String(callback.ResultDesc ?? "");
  if (resultCode === "0") {
    const items = callback?.CallbackMetadata?.Item ?? [];
    const receipt = metadataValue(items, "MpesaReceiptNumber");
    const amount = metadataValue(items, "Amount");
    const phone = metadataValue(items, "PhoneNumber");
    const paidAt = new Date().toISOString();

    // A status-query reconciliation may have already confirmed this payment.
    // Keep the receipt when it arrives late, but never duplicate the unlock.
    if (payment.status === "paid") {
      if (receipt && !payment.mpesa_receipt_number) {
        await service.from("connection_payments")
          .update({ mpesa_receipt_number: String(receipt) })
          .eq("id", payment.id).eq("status", "paid").is("mpesa_receipt_number", null);
      }
      return json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (amount != null && Number(amount) !== Number(payment.amount)) {
      console.error("Ignoring M-PESA callback with mismatched amount");
      return json({ ResultCode: 0, ResultDesc: "Callback received" });
    }

    const { data: confirmed, error: confirmError } = await service.from("connection_payments").update({
      status: "paid",
      amount: amount ?? payment.amount,
      mpesa_receipt_number: receipt ? String(receipt) : null,
      phone: phone ? String(phone) : payment.phone,
      provider_result_code: resultCode,
      provider_result_message: resultDesc,
      paid_at: paidAt,
      failed_at: null,
    }).eq("id", payment.id)
      .eq("checkout_request_id", callback.CheckoutRequestID)
      .eq("status", "pending")
      .select("id").maybeSingle();

    if (confirmError) {
      console.error("M-PESA callback payment update failed", confirmError);
      return json({ error: "Unable to confirm payment" }, 500);
    }
    if (!confirmed) return json({ ResultCode: 0, ResultDesc: "Callback already processed" });

    const { error: unlockError } = await service.from("repair_requests")
      .update({ status: "connected", contact_unlocked_at: paidAt })
      .eq("id", payment.request_id)
      .eq("status", "accepted");
    if (unlockError) console.error("M-PESA callback connection unlock failed", unlockError);

    const notificationData = { type: "connection_unlocked", requestId: payment.request_id };
    await Promise.all([
      sendPush(service, payment.motorist_id, {
        title: "Connection confirmed",
        body: "Payment received. Your mechanic connection is now unlocked.",
        data: { ...notificationData, route: "/motorist/mechanic-assigned" },
      }),
      sendPush(service, payment.mechanic_id, {
        title: "Customer connection confirmed",
        body: "The AutoAssist connection fee is paid. You can now proceed to the customer.",
        data: { ...notificationData, route: "/mechanic/job-details" },
      }),
    ]).catch((error) => console.error("Connection push failed", error));
  } else {
    // Never downgrade a confirmed payment if a delayed failure arrives.
    await service.from("connection_payments").update({
      status: "failed",
      provider_result_code: resultCode,
      provider_result_message: resultDesc,
      failed_at: new Date().toISOString(),
    }).eq("id", payment.id)
      .eq("checkout_request_id", callback.CheckoutRequestID)
      .eq("status", "pending");
  }

  return json({ ResultCode: 0, ResultDesc: "Accepted" });
});
