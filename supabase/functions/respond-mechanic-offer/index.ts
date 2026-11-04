import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreCandidate(candidate: any, request: any) {
  const reviews = Number(candidate.reviews_count ?? 0);
  const rating = Number(candidate.rating ?? 0);
  const bayesianRating = (rating * reviews + 4.2 * 8) / (reviews + 8);
  const qualityScore = (bayesianRating / 5) * 100;
  const accepted = Number(candidate.accepted_offers ?? 0);
  const declined = Number(candidate.declined_offers ?? 0);
  const expired = Number(candidate.expired_offers ?? 0);
  const total = accepted + declined + expired;
  const reliability = total > 0 ? (accepted / total) * 100 : 75;
  let distanceKm: number | null = null;
  let distanceScore = 60;
  if (request.latitude != null && request.longitude != null && candidate.latitude != null && candidate.longitude != null) {
    distanceKm = haversineKm(Number(request.latitude), Number(request.longitude), Number(candidate.latitude), Number(candidate.longitude));
    distanceScore = Math.max(0, 100 - Math.min(distanceKm, 20) * 5);
  }
  const symptom = String(request.symptom ?? "").toLowerCase();
  const services = Array.isArray(candidate.services) ? candidate.services : [];
  const serviceMatch = symptom === "other" || services.some((service: string) => service.toLowerCase().includes(symptom));
  const score = qualityScore * 0.45 + distanceScore * 0.3 + reliability * 0.15 + (serviceMatch ? 100 : 55) * 0.1;
  return { candidate, distanceKm, serviceMatch, matchScore: score };
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
    ...payload,
    channelId: payload.data.type === "mechanic_offer" ? "incoming-requests" : "jobs",
  }));
  if (messages.length === 0) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
}

async function dispatchNext(service: any, request: any) {
  const { data: existingOffers } = await service.from("mechanic_offers").select("*").eq("request_id", request.id);
  const excluded = new Set((existingOffers ?? []).map((item: any) => item.mechanic_id));
  const { data: profiles } = await service
    .from("mechanic_profiles")
    .select("user_id, garage_name, services, rating, reviews_count, latitude, longitude, accepted_offers, declined_offers, expired_offers")
    .eq("verified", true)
    .eq("is_available", true);

  const ids = (profiles ?? []).map((item: any) => item.user_id);
  const busy = new Set<string>();
  if (ids.length > 0) {
    const { data: activeRepairs } = await service
      .from("repair_requests")
      .select("mechanic_id, status")
      .in("mechanic_id", ids)
      .not("status", "in", '("completed","cancelled")');
    for (const item of activeRepairs ?? []) if (item.mechanic_id) busy.add(item.mechanic_id);
  }

  let scored = (profiles ?? [])
    .filter((item: any) => !excluded.has(item.user_id) && !busy.has(item.user_id))
    .map((item: any) => scoreCandidate(item, request))
    .filter((item: any) => item.distanceKm == null || item.distanceKm <= 20);
  const serviceMatches = scored.filter((item: any) => item.serviceMatch);
  if (serviceMatches.length > 0) scored = serviceMatches;
  scored.sort((a: any, b: any) => b.matchScore - a.matchScore);
  const winner = scored[0];

  if (!winner) {
    await service.from("repair_requests").update({ status: "matching" }).eq("id", request.id);
    return null;
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const { data: offer, error } = await service
    .from("mechanic_offers")
    .insert({
      request_id: request.id,
      mechanic_id: winner.candidate.user_id,
      rank: Number(request.dispatch_attempts ?? 0) + 1,
      distance_km: winner.distanceKm == null ? null : Number(winner.distanceKm.toFixed(2)),
      match_score: Number(winner.matchScore.toFixed(2)),
      status: "offered",
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (error) throw error;

  await service.from("repair_requests").update({ status: "offered", dispatch_attempts: Number(request.dispatch_attempts ?? 0) + 1 }).eq("id", request.id);

  await sendPush(service, winner.candidate.user_id, {
    title: `New ${String(request.symptom).slice(0, 25)} request nearby`,
    body: `${String(request.description).slice(0, 95)} • ${String(request.location_text).slice(0, 45)} • ${String(request.preferred_time).slice(0, 30)}`,
    data: { type: "mechanic_offer", route: "/mechanic/job-offer", offerId: offer.id, requestId: request.id },
  }).catch((error) => console.error("Push failed", error));

  return offer;
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
  const offerId = String(body.offerId ?? "");
  const response = String(body.response ?? "");
  if (!offerId || !["accept", "decline"].includes(response)) return json({ error: "offerId and response=accept|decline are required" }, 400);

  const { data: offer, error: offerError } = await service.from("mechanic_offers").select("*").eq("id", offerId).single();
  if (offerError || !offer) return json({ error: "Offer not found" }, 404);
  if (offer.mechanic_id !== authData.user.id) return json({ error: "Forbidden" }, 403);
  if (offer.status !== "offered") return json({ error: `Offer is already ${offer.status}` }, 409);

  const { data: request, error: requestError } = await service.from("repair_requests").select("*").eq("id", offer.request_id).single();
  if (requestError || !request) return json({ error: "Repair request not found" }, 404);

  if (new Date(offer.expires_at) <= new Date()) {
    await service.from("mechanic_offers").update({ status: "expired", responded_at: new Date().toISOString() }).eq("id", offer.id).eq("status", "offered");
    await dispatchNext(service, { ...request, dispatch_attempts: Number(request.dispatch_attempts ?? 0) });
    return json({ state: "expired" }, 409);
  }

  if (response === "decline") {
    await service.from("mechanic_offers").update({ status: "declined", responded_at: new Date().toISOString() }).eq("id", offer.id).eq("status", "offered");
    const next = await dispatchNext(service, { ...request, dispatch_attempts: Number(request.dispatch_attempts ?? 0) });
    return json({ state: "declined", nextOfferCreated: Boolean(next) });
  }

  const { data: mechanic } = await service.from("mechanic_profiles").select("verified, is_available").eq("user_id", authData.user.id).single();
  if (!mechanic?.verified || !mechanic?.is_available) return json({ error: "Mechanic must be verified and available to accept this request" }, 409);

  const now = new Date().toISOString();
  const { data: assigned, error: assignError } = await service
    .from("repair_requests")
    .update({ mechanic_id: authData.user.id, status: "accepted" })
    .eq("id", request.id)
    .is("mechanic_id", null)
    .in("status", ["matching", "offered"])
    .select()
    .maybeSingle();

  if (assignError) return json({ error: assignError.message }, 500);
  if (!assigned) {
    await service.from("mechanic_offers").update({ status: "cancelled", responded_at: now }).eq("id", offer.id);
    return json({ error: "This request has already been assigned" }, 409);
  }

  await service.from("mechanic_offers").update({ status: "accepted", responded_at: now }).eq("id", offer.id).eq("status", "offered");
  await service.from("mechanic_profiles").update({ is_available: false, availability_updated_at: now }).eq("user_id", authData.user.id);

  await service.from("connection_payments").upsert(
    {
      request_id: request.id,
      motorist_id: request.motorist_id,
      mechanic_id: authData.user.id,
      amount: Number(request.connection_fee_amount ?? 500),
      currency: "KES",
      provider: "mpesa",
      status: "pending",
      initiated_at: now,
    },
    { onConflict: "request_id" },
  );

  await sendPush(service, request.motorist_id, {
    title: "Mechanic found",
    body: "A verified mechanic accepted your request. Pay the KES 500 AutoAssist connection fee to connect.",
    data: { type: "connection_payment", route: "/motorist/connection-payment", requestId: request.id },
  }).catch((error) => console.error("Motorist push failed", error));

  return json({ state: "accepted", requestId: request.id, connectionFee: Number(request.connection_fee_amount ?? 500) });
});
