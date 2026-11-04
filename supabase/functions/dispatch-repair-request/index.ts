import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreCandidate(candidate: any, request: any) {
  const reviews = Number(candidate.reviews_count ?? 0);
  const rating = Number(candidate.rating ?? 0);
  const bayesianRating = (rating * reviews + 4.2 * 8) / (reviews + 8);
  const qualityScore = Math.min(100, Math.max(0, (bayesianRating / 5) * 100));

  const accepted = Number(candidate.accepted_offers ?? 0);
  const declined = Number(candidate.declined_offers ?? 0);
  const expired = Number(candidate.expired_offers ?? 0);
  const totalResponses = accepted + declined + expired;
  const reliabilityScore = totalResponses > 0 ? (accepted / totalResponses) * 100 : 75;

  let distanceKm: number | null = null;
  let distanceScore = 60;
  if (request.latitude != null && request.longitude != null && candidate.latitude != null && candidate.longitude != null) {
    distanceKm = haversineKm(
      Number(request.latitude),
      Number(request.longitude),
      Number(candidate.latitude),
      Number(candidate.longitude),
    );
    distanceScore = Math.max(0, 100 - Math.min(distanceKm, 20) * 5);
  }

  const symptom = String(request.symptom ?? "").toLowerCase();
  const services = Array.isArray(candidate.services) ? candidate.services : [];
  const serviceMatch = symptom === "other" || services.some((service: string) => service.toLowerCase().includes(symptom));
  const serviceScore = serviceMatch ? 100 : 55;
  const matchScore = qualityScore * 0.45 + distanceScore * 0.3 + reliabilityScore * 0.15 + serviceScore * 0.1;

  return { candidate, distanceKm, serviceMatch, matchScore };
}

async function sendPush(service: any, userId: string, requestId: string, offerId: string, request: any) {
  const { data: tokens } = await service
    .from("device_push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId)
    .eq("enabled", true);

  const messages = (tokens ?? []).map((item: any) => ({
    to: item.expo_push_token,
    sound: "default",
    priority: "high",
    channelId: "incoming-requests",
    title: `New ${String(request.symptom).slice(0, 25)} request nearby`,
    body: `${String(request.description).slice(0, 95)} • ${String(request.location_text).slice(0, 45)} • ${String(request.preferred_time).slice(0, 30)}`,
    data: { type: "mechanic_offer", route: "/mechanic/job-offer", offerId, requestId },
  }));

  if (messages.length === 0) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
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
  const retry = body.retry === true;
  if (!requestId) return json({ error: "requestId is required" }, 400);

  const { data: request, error: requestError } = await service.from("repair_requests").select("*").eq("id", requestId).single();
  if (requestError || !request) return json({ error: "Repair request not found" }, 404);
  if (request.motorist_id !== authData.user.id) return json({ error: "Forbidden" }, 403);
  if (["cancelled", "completed"].includes(request.status)) return json({ state: request.status, requestId });
  if (request.mechanic_id) return json({ state: request.status, requestId, mechanicId: request.mechanic_id });
  if (!["matching", "offered"].includes(request.status)) {
    return json({ error: "This request is not eligible for matching." }, 409);
  }

  const now = new Date();
  const { data: offers } = await service.from("mechanic_offers").select("*").eq("request_id", requestId).order("created_at", { ascending: true });

  const activeOffer = (offers ?? []).find((offer: any) => offer.status === "offered" && new Date(offer.expires_at) > now);
  if (activeOffer) return json({ state: "offered", requestId, offerId: activeOffer.id, expiresAt: activeOffer.expires_at });

  const expiredOffers = (offers ?? []).filter((offer: any) => offer.status === "offered" && new Date(offer.expires_at) <= now);
  for (const offer of expiredOffers) {
    await service.from("mechanic_offers").update({ status: "expired", responded_at: now.toISOString() }).eq("id", offer.id).eq("status", "offered");
  }

  const excludedMechanics = new Set((offers ?? []).map((offer: any) => offer.mechanic_id));
  const { data: profiles, error: profilesError } = await service
    .from("mechanic_profiles")
    .select("user_id, garage_name, location, services, rating, reviews_count, latitude, longitude, completed_jobs, accepted_offers, declined_offers, expired_offers")
    .eq("verified", true)
    .eq("is_available", true);
  if (profilesError) return json({ error: profilesError.message }, 500);

  const candidateIds = (profiles ?? []).map((item: any) => item.user_id);
  const busy = new Set<string>();
  if (candidateIds.length > 0) {
    const { data: activeRepairs } = await service
      .from("repair_requests")
      .select("mechanic_id, status")
      .in("mechanic_id", candidateIds)
      .not("status", "in", '("completed","cancelled")');
    for (const item of activeRepairs ?? []) if (item.mechanic_id) busy.add(item.mechanic_id);
  }

  let scored = (profiles ?? [])
    .filter((item: any) => !excludedMechanics.has(item.user_id) && !busy.has(item.user_id))
    .map((item: any) => scoreCandidate(item, request))
    .filter((item: any) => item.distanceKm == null || item.distanceKm <= 20);

  const serviceMatches = scored.filter((item: any) => item.serviceMatch);
  if (serviceMatches.length > 0) scored = serviceMatches;
  scored.sort((a: any, b: any) => b.matchScore - a.matchScore);

  let winner = scored[0];

  // A declined mechanic should not be spammed automatically. However,
  // a motorist explicitly pressing Retry may try that same eligible
  // mechanic again if there are no previously untried providers.
  // Maximum three offers per mechanic per request, at least 10 seconds apart.
  // All offers are separate rows; the existing request/description is reused.
  let retryAfterSeconds = 0;
  if (!winner && retry && (offers ?? []).length) {
    const lastByMechanic = new Map<string, { count: number; lastAt: number; lastStatus: string }>();
    for (const previous of offers ?? []) {
      const mechanicId = String(previous.mechanic_id);
      const previousAt = new Date(previous.created_at).getTime();
      const entry = lastByMechanic.get(mechanicId);
      if (!entry) {
        lastByMechanic.set(mechanicId, { count: 1, lastAt: previousAt, lastStatus: String(previous.status) });
      } else {
        entry.count++;
        if (previousAt > entry.lastAt) {
          entry.lastAt = previousAt;
          entry.lastStatus = String(previous.status);
        }
      }
    }
    const eligibleReoffers = (profiles ?? [])
      .filter((item: any) => !busy.has(item.user_id))
      .map((item: any) => ({ score: scoreCandidate(item, request), previous: lastByMechanic.get(item.user_id) }))
      .filter((item: any) => item.previous &&
        item.previous.count < 3 &&
        ["declined", "expired"].includes(item.previous.lastStatus) &&
        (item.score.distanceKm == null || item.score.distanceKm <= 20))
      .sort((a: any, b: any) => b.score.matchScore - a.score.matchScore);

    const ready = eligibleReoffers.find((item: any) => (now.getTime() - item.previous.lastAt) >= 10000);
    winner = ready?.score;
    if (!winner && eligibleReoffers.length) {
      retryAfterSeconds = Math.max(1, Math.ceil(
        (10000 - (now.getTime() - eligibleReoffers[0].previous.lastAt)) / 1000,
      ));
    }
  }

  if (!winner) {
    await service.from("repair_requests")
      .update({ status: "matching" })
      .eq("id", requestId)
      .in("status", ["matching", "offered"])
      .is("mechanic_id", null);
    return json({
      state: "no_provider",
      requestId,
      retryAfterSeconds,
      message: retryAfterSeconds > 0
        ? `The previous mechanic declined. You can retry in ${retryAfterSeconds} seconds.`
        : "No other verified mechanic is available now. Keep this request open and retry when a provider comes online.",
    });
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const { data: offer, error: offerError } = await service
    .from("mechanic_offers")
    .insert({
      request_id: requestId,
      mechanic_id: winner.candidate.user_id,
      rank: Number(request.dispatch_attempts ?? 0) + 1,
      distance_km: winner.distanceKm == null ? null : Number(winner.distanceKm.toFixed(2)),
      match_score: Number(winner.matchScore.toFixed(2)),
      status: "offered",
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (offerError) return json({ error: offerError.message }, 500);

  await service.from("repair_requests").update({ status: "offered", dispatch_attempts: Number(request.dispatch_attempts ?? 0) + 1 }).eq("id", requestId);

  try {
    await sendPush(service, winner.candidate.user_id, requestId, offer.id, request);
  } catch (pushError) {
    console.error("Push delivery failed", pushError);
  }

  return json({
    state: "offered",
    requestId,
    reoffered: excludedMechanics.has(winner.candidate.user_id),
    offerId: offer.id,
    expiresAt,
    candidate: {
      name: winner.candidate.garage_name || "Verified mechanic",
      rating: Number(winner.candidate.rating ?? 0),
      reviews: Number(winner.candidate.reviews_count ?? 0),
      distanceKm: winner.distanceKm == null ? null : Number(winner.distanceKm.toFixed(2)),
      matchScore: Number(winner.matchScore.toFixed(0)),
    },
  });
});
