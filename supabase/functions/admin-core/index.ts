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

const toNumber = (value: unknown) => Number(value ?? 0) || 0;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  if (!serviceKey) return json({ error: "Admin service is unavailable" }, 503);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const service = createClient(supabaseUrl, serviceKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const reviewerId = authData.user.id;
  const { data: adminRole, error: roleError } = await service.rpc("get_autoassist_admin_role", { p_user_id: reviewerId });
  if (roleError) return json({ error: "Unable to verify admin access" }, 500);
  if (!adminRole) return json({ error: "Admin access required" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "status");

  if (action === "status") return json({ isAdmin: true, role: adminRole });
  if (adminRole !== "super_admin") return json({ error: "Super admin access required" }, 403);

  if (action === "overview" || action === "analytics") {
    const [profilesResult, mechanicsResult, requestsResult, paymentsResult, ratingsResult] = await Promise.all([
      service.from("profiles").select("id,role,created_at"),
      service.from("mechanic_profiles").select("user_id,verified,is_available,rating,reviews_count,completed_jobs"),
      service.from("repair_requests").select("id,status,connection_fee_amount,created_at,symptom,location_text"),
      service.from("connection_payments").select("id,status,amount,created_at,paid_at"),
      service.from("ratings").select("rating,created_at"),
    ]);

    const firstError = profilesResult.error || mechanicsResult.error || requestsResult.error || paymentsResult.error || ratingsResult.error;
    if (firstError) return json({ error: firstError.message }, 500);

    const profiles = profilesResult.data ?? [];
    const mechanics = mechanicsResult.data ?? [];
    const requests = requestsResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const ratings = ratingsResult.data ?? [];

    const roleCounts = profiles.reduce<Record<string, number>>((acc, item) => {
      acc[item.role] = (acc[item.role] ?? 0) + 1;
      return acc;
    }, {});
    const requestCounts = requests.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
    const paymentCounts = payments.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
    const paidPayments = payments.filter((item) => item.status === "paid");
    const paidAmount = paidPayments.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const avgRating = ratings.length
      ? ratings.reduce((sum, item) => sum + toNumber(item.rating), 0) / ratings.length
      : 0;

    return json({
      role: adminRole,
      metrics: {
        totalUsers: profiles.length,
        roleCounts,
        mechanics: mechanics.length,
        verifiedMechanics: mechanics.filter((item) => item.verified).length,
        availableMechanics: mechanics.filter((item) => item.is_available).length,
        repairRequests: requests.length,
        requestCounts,
        connectionPayments: payments.length,
        paymentCounts,
        paidConnectionFees: paidAmount,
        ratings: ratings.length,
        averageRating: Number(avgRating.toFixed(2)),
      },
      recentRequests: requests.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8),
    });
  }

  if (action === "users") {
    const [{ data: profiles, error: profilesError }, { data: mechanics, error: mechanicsError }, authUsers] = await Promise.all([
      service.from("profiles").select("id,full_name,phone,role,provider_type,created_at,updated_at").order("created_at", { ascending: false }).limit(250),
      service.from("mechanic_profiles").select("user_id,garage_name,location,verified,rating,reviews_count,is_available,completed_jobs"),
      service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (profilesError || mechanicsError || authUsers.error) {
      return json({ error: profilesError?.message ?? mechanicsError?.message ?? authUsers.error?.message ?? "Unable to load users" }, 500);
    }
    const mechanicMap = new Map((mechanics ?? []).map((item) => [item.user_id, item]));
    const authMap = new Map((authUsers.data.users ?? []).map((item) => [item.id, item]));
    return json({
      items: (profiles ?? []).map((profile) => {
        const authUser = authMap.get(profile.id);
        return {
          ...profile,
          email: authUser?.email ?? null,
          last_sign_in_at: authUser?.last_sign_in_at ?? null,
          email_confirmed_at: authUser?.email_confirmed_at ?? null,
          mechanic: mechanicMap.get(profile.id) ?? null,
        };
      }),
    });
  }

  if (action === "jobs") {
    const { data: jobs, error } = await service
      .from("repair_requests")
      .select("id,motorist_id,mechanic_id,vehicle_id,description,symptom,location_text,status,submitted_at,created_at,updated_at,dispatch_attempts,connection_fee_amount,contact_unlocked_at")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) return json({ error: error.message }, 500);

    const ids = Array.from(new Set((jobs ?? []).flatMap((job) => [job.motorist_id, job.mechanic_id].filter(Boolean))));
    const { data: profiles, error: profileError } = ids.length
      ? await service.from("profiles").select("id,full_name,phone,role").in("id", ids)
      : { data: [], error: null };
    if (profileError) return json({ error: profileError.message }, 500);
    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
    return json({
      items: (jobs ?? []).map((job) => ({
        ...job,
        motorist: profileMap.get(job.motorist_id) ?? null,
        mechanic: job.mechanic_id ? profileMap.get(job.mechanic_id) ?? null : null,
      })),
    });
  }

  if (action === "payments") {
    const { data: payments, error } = await service
      .from("connection_payments")
      .select("id,request_id,motorist_id,mechanic_id,amount,currency,provider,status,phone,mpesa_receipt_number,provider_result_code,provider_result_message,initiated_at,paid_at,failed_at,refunded_at,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) return json({ error: error.message }, 500);
    return json({ items: payments ?? [] });
  }

  return json({ error: "Unknown action" }, 400);
});
