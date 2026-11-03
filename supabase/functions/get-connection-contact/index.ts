import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

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

  const userId = authData.user.id;
  if (request.motorist_id !== userId && request.mechanic_id !== userId) return json({ error: "Forbidden" }, 403);

  const { data: payment } = await service.from("connection_payments").select("status, paid_at").eq("request_id", requestId).maybeSingle();
  if (payment?.status !== "paid" || !request.contact_unlocked_at) {
    return json({ error: "Connection details remain locked until the KES 500 AutoAssist connection fee is paid." }, 402);
  }

  if (userId === request.motorist_id) {
    const { data: mechanicProfile } = await service.from("profiles").select("id, full_name, phone, provider_type").eq("id", request.mechanic_id).single();
    const { data: provider } = await service
      .from("mechanic_profiles")
      .select("garage_name, location, provider_type, rating, reviews_count")
      .eq("user_id", request.mechanic_id)
      .single();
    return json({
      unlocked: true,
      role: "mechanic",
      contact: {
        name: provider?.provider_type === "garage" && provider?.garage_name ? provider.garage_name : mechanicProfile?.full_name,
        contactPerson: mechanicProfile?.full_name,
        phone: mechanicProfile?.phone,
        location: provider?.location,
        providerType: provider?.provider_type ?? mechanicProfile?.provider_type,
        rating: Number(provider?.rating ?? 0),
        reviews: Number(provider?.reviews_count ?? 0),
      },
    });
  }

  const { data: motorist } = await service.from("profiles").select("id, full_name, phone").eq("id", request.motorist_id).single();
  return json({
    unlocked: true,
    role: "motorist",
    contact: {
      name: motorist?.full_name,
      phone: motorist?.phone,
      serviceLocation: request.location_text,
      latitude: request.latitude,
      longitude: request.longitude,
    },
  });
});
