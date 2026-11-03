import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const BUCKET = "mechanic-verification";
const SIGNED_URL_TTL_SECONDS = 300;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";

  if (!serviceKey) return json({ error: "Admin verification service is unavailable" }, 503);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const service = createClient(supabaseUrl, serviceKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const reviewerId = authData.user.id;
  const { data: isAdmin, error: adminError } = await service.rpc("is_verification_admin", {
    p_user_id: reviewerId,
  });
  if (adminError) {
    console.error("Admin lookup failed", { code: adminError.code, message: adminError.message });
    return json({ error: "Unable to verify admin access" }, 500);
  }
  if (isAdmin !== true) return json({ error: "Admin access required" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "status") return json({ isAdmin: true });

  if (action === "list") {
    const requestedStatus = String(body.status ?? "pending");
    const allowedStatuses = new Set(["pending", "approved", "rejected", "draft", "all"]);
    if (!allowedStatuses.has(requestedStatus)) return json({ error: "Invalid status filter" }, 400);

    let query = service
      .from("mechanic_verification_submissions")
      .select("user_id,status,submitted_at,reviewed_at,review_note,identity_claimed,national_id_confirmed,business_permit_confirmed,profile_photo_confirmed,certificate_paths")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (requestedStatus !== "all") query = query.eq("status", requestedStatus);

    const { data: submissions, error: submissionsError } = await query;
    if (submissionsError) return json({ error: submissionsError.message }, 500);

    const ids = (submissions ?? []).map((item) => item.user_id);
    if (!ids.length) return json({ items: [] });

    const [{ data: profiles, error: profilesError }, { data: mechanics, error: mechanicsError }] = await Promise.all([
      service.from("profiles").select("id,full_name,phone,role,provider_type").in("id", ids),
      service.from("mechanic_profiles").select("user_id,location,services,verified,rating,reviews_count").in("user_id", ids),
    ]);

    if (profilesError || mechanicsError) {
      return json({ error: profilesError?.message ?? mechanicsError?.message ?? "Unable to load mechanic profiles" }, 500);
    }

    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
    const mechanicMap = new Map((mechanics ?? []).map((item) => [item.user_id, item]));

    return json({
      items: (submissions ?? []).map((submission) => ({
        ...submission,
        profile: profileMap.get(submission.user_id) ?? null,
        mechanic: mechanicMap.get(submission.user_id) ?? null,
      })),
    });
  }

  if (action === "detail") {
    const subjectUserId = String(body.userId ?? "");
    if (!subjectUserId) return json({ error: "userId is required" }, 400);

    const [{ data: submission, error: submissionError }, { data: profile, error: profileError }, { data: mechanic, error: mechanicError }] = await Promise.all([
      service.from("mechanic_verification_submissions").select("*").eq("user_id", subjectUserId).maybeSingle(),
      service.from("profiles").select("id,full_name,phone,role,provider_type,created_at").eq("id", subjectUserId).maybeSingle(),
      service.from("mechanic_profiles").select("user_id,location,services,verified,rating,reviews_count,created_at").eq("user_id", subjectUserId).maybeSingle(),
    ]);

    if (submissionError || profileError || mechanicError) {
      return json({ error: submissionError?.message ?? profileError?.message ?? mechanicError?.message ?? "Unable to load verification" }, 500);
    }
    if (!submission || !profile || profile.role !== "mechanic") return json({ error: "Verification submission not found" }, 404);

    const { data: identityNumber, error: identityError } = await service.rpc("get_verification_identity_number", {
      p_reviewer_user_id: reviewerId,
      p_subject_user_id: subjectUserId,
    });
    if (identityError) {
      console.error("Private identity lookup failed", { code: identityError.code, message: identityError.message });
      return json({ error: "Unable to load the private ID number" }, 500);
    }

    const sign = async (path: string | null) => {
      if (!path) return null;
      const { data, error } = await service.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error) {
        console.error("Signed URL failed", { path, message: error.message });
        return null;
      }
      return data.signedUrl;
    };

    const certificatePaths = Array.isArray(submission.certificate_paths) ? submission.certificate_paths : [];
    const [nationalIdUrl, businessPermitUrl, profilePhotoUrl, certificateUrls] = await Promise.all([
      sign(submission.national_id_path ?? submission.national_id_front_path ?? null),
      sign(submission.business_permit_path ?? null),
      sign(submission.profile_photo_path ?? null),
      Promise.all(certificatePaths.map((path: string) => sign(path))),
    ]);

    return json({
      submission,
      profile,
      mechanic,
      identityNumber: identityNumber ?? null,
      identityNumberStored: Boolean(identityNumber),
      evidence: {
        nationalIdUrl,
        businessPermitUrl,
        profilePhotoUrl,
        certificateUrls: certificateUrls.filter(Boolean),
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      },
    });
  }

  if (action === "review") {
    const subjectUserId = String(body.userId ?? "");
    const decision = String(body.decision ?? "");
    const note = typeof body.note === "string" ? body.note : null;
    if (!subjectUserId) return json({ error: "userId is required" }, 400);
    if (!new Set(["approve", "reject", "resubmit"]).has(decision)) return json({ error: "Invalid review decision" }, 400);

    const { data, error } = await service.rpc("review_mechanic_verification", {
      p_reviewer_user_id: reviewerId,
      p_subject_user_id: subjectUserId,
      p_decision: decision,
      p_note: note,
    });

    if (error) {
      const message = error.message.includes("Readable ID number is missing")
        ? "Readable ID number is missing for this older submission. Request resubmission before approval."
        : error.message;
      return json({ error: message }, 400);
    }

    return json({ ok: true, result: data });
  }

  return json({ error: "Unknown action" }, 400);
});
