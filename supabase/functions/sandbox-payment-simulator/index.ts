import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function sendTestNotifications(service: any, requestId: string) {
  const { data: request, error } = await service
    .from("repair_requests")
    .select("motorist_id,mechanic_id")
    .eq("id", requestId)
    .single();
  if (error || !request?.mechanic_id) {
    console.error("Unable to load sandbox notification recipients", error);
    return;
  }

  const notifications = [
    {
      userId: request.motorist_id,
      title: "Test connection confirmed",
      body: "Sandbox payment simulated. No real money was collected. Mechanic contact is now unlocked.",
      route: "/motorist/mechanic-assigned",
    },
    {
      userId: request.mechanic_id,
      title: "Test customer connection confirmed",
      body: "Sandbox payment simulated. No real money was collected. You can test the service journey.",
      route: "/mechanic/job-details",
    },
  ];
  for (const note of notifications) {
    try {
      const { data: tokens, error: tokenError } = await service
        .from("device_push_tokens")
        .select("expo_push_token")
        .eq("user_id", note.userId)
        .eq("enabled", true);
      if (tokenError) throw tokenError;
      if (!tokens?.length) continue;
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(tokens.map((item: any) => ({
          to: item.expo_push_token,
          title: note.title,
          body: note.body,
          data: { type: "connection_unlocked", route: note.route, requestId, simulated: true },
          channelId: "jobs",
          priority: "high",
          sound: "default",
        }))),
      });
      if (!response.ok) console.error("Sandbox notification provider error", response.status);
    } catch (pushError) {
      // A push outage must never roll back an already completed test payment.
      console.error("Sandbox connection notification failed", pushError);
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  if (!serviceKey || !anonKey || !supabaseUrl) return json({ error: "Simulator service unavailable" }, 503);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const service = createClient(supabaseUrl, serviceKey);

  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json({ error: "Unauthorized" }, 401);

  // Role comes from the server-controlled admin_users table, never user_metadata.
  const { data: role, error: roleError } = await service.rpc("get_autoassist_admin_role", {
    p_user_id: auth.user.id,
  });
  if (roleError) return json({ error: "Unable to verify admin authorization" }, 500);
  if (role !== "super_admin") return json({ error: "Super-admin authorization required" }, 403);

  const sandbox = (Deno.env.get("MPESA_ENV") ?? "").toLowerCase() === "sandbox";
  const optIn = Deno.env.get("AUTOASSIST_PAYMENT_SIMULATOR_ENABLED") === "true";
  const enabled = sandbox && optIn;

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "status");

  if (action === "status") {
    return json({
      enabled,
      sandbox,
      simulatedPaymentsNotReal: true,
      message: enabled
        ? "Sandbox-only simulator is ready. No actual M-PESA money is collected."
        : "Simulator disabled. It requires MPESA_ENV=sandbox and AUTOASSIST_PAYMENT_SIMULATOR_ENABLED=true in server secrets.",
    });
  }
  if (action !== "simulate") return json({ error: "Unknown action" }, 400);
  if (!enabled) return json({ error: "Sandbox payment simulator is disabled on this server." }, 403);

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  const outcome = body.outcome;
  const confirmation = body.confirmation;
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId)) {
    return json({ error: "A valid repair request ID is required" }, 400);
  }
  if (outcome !== "success" && outcome !== "failure") {
    return json({ error: "Select simulated success or failure" }, 400);
  }
  if (confirmation !== "SIMULATE TEST PAYMENT") {
    return json({ error: "You must explicitly confirm the simulated payment action" }, 400);
  }

  // The only write is an atomic, service-role-exclusive database function.
  // It rejects unaccepted repairs, actual paid transactions and active
  // Daraja checkouts and always labels the record sandbox_simulator.
  const { data: result, error: resultError } = await service.rpc("apply_autoassist_sandbox_payment", {
    p_request_id: requestId,
    p_outcome: outcome,
  });
  if (resultError) {
    console.error("Sandbox payment denied", { requestId, outcome, code: resultError.code });
    return json({ error: resultError.message || "Sandbox payment simulation failed" }, 409);
  }
  console.info("Sandbox payment simulation", {
    actorId: auth.user.id, requestId, outcome, state: result?.state,
  });

  if (outcome === "success") await sendTestNotifications(service, requestId);
  return json({
    ...result,
    message: outcome === "success"
      ? "TEST SUCCESS: KES 500 simulated (no money moved). The mechanic connection is unlocked."
      : "TEST FAILURE: No money moved. The mechanic connection remains locked.",
  });
});
