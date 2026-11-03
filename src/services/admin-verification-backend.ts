import { FunctionsHttpError } from "@supabase/supabase-js";

import { requireSupabase } from "@/lib/supabase";

export type AdminVerificationStatus = "draft" | "pending" | "approved" | "rejected";

export type AdminVerificationListItem = {
  user_id: string;
  status: AdminVerificationStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  identity_claimed: boolean;
  national_id_confirmed: boolean;
  business_permit_confirmed: boolean;
  profile_photo_confirmed: boolean;
  certificate_paths: string[] | null;
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    provider_type: "individual" | "garage" | null;
  } | null;
  mechanic: {
    user_id: string;
    location: string | null;
    services: string[] | null;
    verified: boolean;
    rating: number | null;
    reviews_count: number | null;
  } | null;
};

export type AdminVerificationDetail = {
  submission: Record<string, any>;
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    provider_type: "individual" | "garage" | null;
    created_at: string | null;
  };
  mechanic: {
    user_id: string;
    location: string | null;
    services: string[] | null;
    verified: boolean;
    rating: number | null;
    reviews_count: number | null;
    created_at: string | null;
  } | null;
  identityNumber: string | null;
  identityNumberStored: boolean;
  evidence: {
    nationalIdUrl: string | null;
    businessPermitUrl: string | null;
    profilePhotoUrl: string | null;
    certificateUrls: string[];
    expiresInSeconds: number;
  };
};

async function functionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      const message = String((payload as { error?: unknown } | null)?.error ?? "").trim();
      if (message) return message;
    } catch {
      // Use the SDK message below when the response body is unavailable.
    }
  }

  return error instanceof Error ? error.message : "Unable to contact the admin verification service.";
}

async function invokeAdminVerification<T>(body: Record<string, unknown>): Promise<T> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("admin-verification", { body });
  if (error) throw new Error(await functionErrorMessage(error));
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function getAdminVerificationStatus() {
  return invokeAdminVerification<{ isAdmin: boolean }>({ action: "status" });
}

export async function listAdminVerifications(status: AdminVerificationStatus | "all" = "pending") {
  return invokeAdminVerification<{ items: AdminVerificationListItem[] }>({ action: "list", status });
}

export async function getAdminVerificationDetail(userId: string) {
  return invokeAdminVerification<AdminVerificationDetail>({ action: "detail", userId });
}

export async function reviewAdminVerification(input: {
  userId: string;
  decision: "approve" | "reject" | "resubmit";
  note?: string | null;
}) {
  return invokeAdminVerification<{ ok: true; result: { status: AdminVerificationStatus; decision: string } }>({
    action: "review",
    userId: input.userId,
    decision: input.decision,
    note: input.note ?? null,
  });
}
