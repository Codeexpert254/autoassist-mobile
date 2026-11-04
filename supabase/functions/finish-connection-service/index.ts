import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  if (!url || !anonKey || !serviceKey) {
    return json({ error: "Service unavailable" }, 503);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId)) {
    return json({ error: "Valid requestId is required" }, 400);
  }

  const service = createClient(url, serviceKey);
  const [{ data: request, error: requestError }, { data: mechanic, error: mechanicError }] = await Promise.all([
    service.from("repair_requests")
      .select("id,motorist_id,mechanic_id,status,contact_unlocked_at")
      .eq("id", requestId).maybeSingle(),
    service.from("mechanic_profiles").select("verified")
      .eq("user_id", auth.user.id).maybeSingle(),
  ]);
  if (requestError || mechanicError) return json({ error: "Unable to check service assignment" }, 500);
  if (!request) return json({ error: "Service request not found" }, 404);
  if (request.mechanic_id !== auth.user.id || !mechanic?.verified) {
    return json({ error: "Verified assigned mechanic required" }, 403);
  }
  if (request.status === "repair-complete" || request.status === "completed") {
    return json({ state: request.status, message: "Service finish already recorded." });
  }
  if (request.status !== "arrived" || !request.contact_unlocked_at) {
    return json({ error: "Mark arrival and unlock the paid connection before finishing the service" }, 409);
  }
  const { data: payment, error: paymentError } = await service
    .from("connection_payments")
    .select("status").eq("request_id", requestId).maybeSingle();
  if (paymentError) return json({ error: "Unable to verify connection payment" }, 500);
  if (payment?.status !== "paid") return json({ error: "Connection payment must be confirmed" }, 409);

  // Conditional transition is idempotent. A repeated tap cannot issue duplicate state changes.
  const { data: updated, error: updateError } = await service
    .from("repair_requests")
    .update({ status: "repair-complete" })
    .eq("id", requestId)
    .eq("mechanic_id", auth.user.id)
    .eq("status", "arrived")
    .select("id")
    .maybeSingle();
  if (updateError) {
    console.error("Unable to finish connection service", updateError);
    return json({ error: "Unable to finish this service" }, 500);
  }
  if (!updated) return json({ state: "already_updated", message: "Service status was already changed. Refresh the assignment." });

  // Notify the motorist in addition to the motorist screen polling for this status.
  try {
    const { data: tokens, error: tokenError } = await service
      .from("device_push_tokens")
      .select("expo_push_token")
      .eq("user_id", request.motorist_id).eq("enabled", true);
    if (tokenError) throw tokenError;
    if (tokens?.length) {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(tokens.map((token: any) => ({
          to: token.expo_push_token,
          title: "Please rate your AutoAssist provider",
          body: "Your mechanic has marked the visit finished. Rate the service to complete this request.",
          sound: "default",
          priority: "high",
          channelId: "jobs",
          data: { type: "rating_requested", route: "/motorist/mechanic-assigned", requestId },
        }))),
      });
      if (!response.ok) console.error("Rating notification rejected", response.status);
    }
  } catch (error) {
    console.error("Rating notification could not be delivered", error);
  }

  return json({
    state: "repair-complete",
    message: "Service marked finished. The motorist can now rate the provider to complete the job.",
  });
});
