import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function normalizeIdentityNumber(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function hmacHex(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${secret}::autoassist-identity-v1`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";

  if (!serviceKey) return json({ error: "Verification service is unavailable" }, 503);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const service = createClient(supabaseUrl, serviceKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const normalized = normalizeIdentityNumber(String(body.identityNumber ?? ""));
  if (!/^[A-Z0-9]{6,20}$/.test(normalized)) {
    return json({ error: "Enter a valid National ID number." }, 400);
  }

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .single();
  if (profileError || profile?.role !== "mechanic") {
    return json({ error: "A Mechanic account is required." }, 403);
  }

  const fingerprint = await hmacHex(serviceKey, normalized);
  const { data: registered, error: identityError } = await service.rpc(
    "register_mechanic_identity_fingerprint",
    {
      p_user_id: authData.user.id,
      p_identity_hmac: fingerprint,
    },
  );

  if (identityError) {
    console.error("Identity fingerprint RPC failed", {
      code: identityError.code,
      message: identityError.message,
      hint: identityError.hint,
    });
    return json({ error: "Unable to securely register this ID number. Please try again." }, 500);
  }

  if (registered !== true) {
    return json({ error: "This identity is already linked to another AutoAssist mechanic account." }, 409);
  }

  const { error: verificationError } = await service
    .from("mechanic_verification_submissions")
    .upsert({
      user_id: authData.user.id,
      identity_claimed: true,
      status: "draft",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (verificationError) {
    console.error("Verification draft update failed", {
      code: verificationError.code,
      message: verificationError.message,
      hint: verificationError.hint,
    });
    return json({ error: "Unable to update the verification draft. Please try again." }, 500);
  }

  return json({ registered: true });
});
