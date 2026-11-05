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
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

const BUCKET = "mechanic-verification";
const SIGNED_URL_TTL_SECONDS = 300;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
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
  const { data: adminRole, error: adminError } = await service.rpc("get_autoassist_admin_role", {
    p_user_id: reviewerId,
  });
  if (adminError) {
    console.error("Admin lookup failed", { code: adminError.code, message: adminError.message });
    return json({ error: "Unable to verify admin access" }, 500);
  }
  if (!adminRole) return json({ error: "Admin access required" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "status") return json({ isAdmin: true, role: adminRole });

  if (!["super_admin", "verification_admin"].includes(String(adminRole))) {
    return json({ error: "Verification admin access required" }, 403);
  }


  // Shared verification queue for the four provider types. Existing mechanic
  // actions (list/detail/review) remain unchanged for older admin clients.
  if (action === "list-all") {
    const allowedRoles = new Set(["all", "mechanic", "partsdealer", "rider", "towing"]);
    const allowedStatuses = new Set(["all", "pending", "approved", "rejected", "draft"]);
    const roleFilter = String(body.role ?? "all");
    const statusFilter = String(body.status ?? "pending");
    if (!allowedRoles.has(roleFilter) || !allowedStatuses.has(statusFilter))
      return json({ error: "Invalid verification filter" }, 400);

    const [mech, shops, riders, towing] = await Promise.all([
      service.from("mechanic_verification_submissions")
        .select("user_id,status,submitted_at,review_note").order("submitted_at",{ascending:false}).limit(200),
      service.from("parts_shops")
        .select("id,owner_id,shop_name,location_text,seller_kind,verification_status,created_at,verification_note")
        .order("created_at",{ascending:false}).limit(200),
      service.from("parts_rider_profiles")
        .select("user_id,vehicle_type,registration_number,verification_status,verification_note,created_at")
        .order("created_at",{ascending:false}).limit(200),
      service.from("towing_agent_profiles")
        .select("user_id,business_name,vehicle_type,vehicle_registration,operating_area,verification_status,review_note,submitted_at")
        .order("submitted_at",{ascending:false}).limit(200),
    ]);
    const problem = mech.error || shops.error || riders.error || towing.error;
    if (problem) return json({ error: "Unable to load verification applications" }, 500);
    const ids = Array.from(new Set([
      ...(mech.data ?? []).map(x=>x.user_id),
      ...(shops.data ?? []).map(x=>x.owner_id),
      ...(riders.data ?? []).map(x=>x.user_id),
      ...(towing.data ?? []).map(x=>x.user_id),
    ]));
    const profileResult = ids.length
      ? await service.from("profiles").select("id,full_name,phone,role,provider_type").in("id",ids)
      : {data:[],error:null};
    if (profileResult.error) return json({error:"Unable to load applicant accounts"},500);
    const profileMap = new Map((profileResult.data ?? []).map(x=>[x.id,x]));
    const items = [
      ...(mech.data ?? []).map(x=>({
        id:x.user_id,role:"mechanic",ownerId:x.user_id,status:x.status,
        createdAt:x.submitted_at,displayName:profileMap.get(x.user_id)?.full_name??"Mechanic",
        summary:profileMap.get(x.user_id)?.provider_type==="garage"?"Garage / business":"Individual mechanic",
        reviewNote:x.review_note??null,
      })),
      ...(shops.data ?? []).map(x=>({
        id:x.id,role:"partsdealer",ownerId:x.owner_id,status:x.verification_status,
        createdAt:x.created_at,displayName:x.shop_name,
        summary:(x.seller_kind==="garage"?"Garage seller":"Parts shop")+" · "+x.location_text,
        reviewNote:x.verification_note??null,
      })),
      ...(riders.data ?? []).map(x=>({
        id:x.user_id,role:"rider",ownerId:x.user_id,status:x.verification_status,
        createdAt:x.created_at,displayName:profileMap.get(x.user_id)?.full_name??"Rider",
        summary:x.vehicle_type+" · "+x.registration_number,
        reviewNote:x.verification_note??null,
      })),
      ...(towing.data ?? []).map(x=>({
        id:x.user_id,role:"towing",ownerId:x.user_id,status:x.verification_status,
        createdAt:x.submitted_at,displayName:x.business_name,
        summary:x.vehicle_type+" · "+x.vehicle_registration+" · "+x.operating_area,
        reviewNote:x.review_note??null,
      })),
    ].filter(x=>(roleFilter==="all"||x.role===roleFilter)
      &&(statusFilter==="all"||x.status===statusFilter))
      .sort((a,b)=>String(b.createdAt??"").localeCompare(String(a.createdAt??"")));
    return json({items});
  }

  if (action === "detail-provider") {
    const role = String(body.role??"");
    const id = String(body.id??"");
    if (!["partsdealer","rider","towing"].includes(role) ||
      !/^[0-9a-f-]{36}$/i.test(id)) return json({error:"Invalid applicant"},400);
    const table = role==="partsdealer"?"parts_shops":
      role==="rider"?"parts_rider_profiles":"towing_agent_profiles";
    const key = role==="partsdealer"?"id":"user_id";
    const {data:record,error:lookupError}=await service.from(table).select("*").eq(key,id).maybeSingle();
    if (lookupError) return json({error:"Unable to load applicant"},500);
    if (!record) return json({error:"Applicant not found"},404);
    const ownerId=role==="partsdealer"?record.owner_id:record.user_id;
    const {data:profile}=await service.from("profiles")
      .select("id,full_name,phone,role,provider_type,created_at").eq("id",ownerId).maybeSingle();
    const evidence:Record<string,string|null>={};
    if(role==="towing"){
      for(const [label,path] of [
        ["licenseUrl",record.license_image_path],
        ["insuranceUrl",record.insurance_image_path],
        ["truckUrl",record.truck_image_path],
      ]){
        if(!path){evidence[label]=null;continue;}
        // Never generate signed links outside this applicant's private folder.
        if(!String(path).startsWith(ownerId+"/")){evidence[label]=null;continue;}
        const signed=await service.storage.from("towing-verification")
          .createSignedUrl(String(path),300);
        evidence[label]=signed.error?null:(signed.data?.signedUrl??null);
      }
    }
    return json({role,record,profile,evidence,expiresInSeconds:300});
  }

  if (action === "review-provider") {
    const role=String(body.role??"");
    const id=String(body.id??"");
    const decision=String(body.decision??"");
    const note=typeof body.note==="string"?body.note.trim():"";
    if(!["mechanic","partsdealer","rider","towing"].includes(role) ||
      !/^[0-9a-f-]{36}$/i.test(id) ||
      !["approve","reject"].includes(decision))
      return json({error:"Invalid verification decision"},400);
    if(decision==="reject"&&note.length<5)
      return json({error:"Provide a reason for rejection (at least 5 characters)"},400);
    if(role==="mechanic"){
      const {data,error}=await service.rpc("review_mechanic_verification",{
        p_reviewer_user_id:reviewerId,p_subject_user_id:id,p_decision:decision,p_note:note,
      });
      return error?json({error:error.message},400):json({ok:true,result:data});
    }
    // The caller JWT is required for SQL review functions to audit auth.uid().
    const approve=decision==="approve";
    const target = role==="partsdealer"
      ? {fn:"review_parts_shop_application",args:{p_shop_id:id,p_approve:approve,p_note:note}}
      : role==="rider"
        ? {fn:"review_parts_rider_application_with_note",args:{p_rider_id:id,p_approve:approve,p_note:note}}
        : {fn:"review_towing_application",args:{p_towing_user_id:id,p_approve:approve,p_note:note}};
    const {data,error}=await userClient.rpc(target.fn,target.args);
    return error?json({error:error.message},400):json({ok:true,result:data});
  }

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
