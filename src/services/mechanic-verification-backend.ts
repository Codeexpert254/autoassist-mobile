import { FunctionsHttpError } from "@supabase/supabase-js";
import { Alert } from "react-native";

import { requireSupabase } from "@/lib/supabase";

export type MechanicVerificationChecklist = {
  identityClaimed: boolean;
  nationalId: boolean;
  businessPermit: boolean;
  certificates: boolean;
  profilePhoto: boolean;
};

export type MechanicVerificationEvidence = {
  nationalIdPath: string | null;
  businessPermitPath: string | null;
  certificatePaths: string[];
  profilePhotoPath: string | null;
};

export type VerificationImageKind =
  | "national-id"
  | "business-permit"
  | "certificate"
  | "profile-photo";

const VERIFICATION_BUCKET = "mechanic-verification";
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionForMimeType(mimeType?: string | null) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function verificationPayload(
  userId: string,
  checklist: MechanicVerificationChecklist,
  evidence: MechanicVerificationEvidence,
) {
  return {
    user_id: userId,
    national_id_confirmed: checklist.nationalId,
    business_permit_confirmed: checklist.businessPermit,
    certificates_confirmed: checklist.certificates,
    profile_photo_confirmed: checklist.profilePhoto,
    national_id_path: evidence.nationalIdPath,
    national_id_front_path: evidence.nationalIdPath,
    national_id_back_path: null,
    selfie_path: null,
    business_permit_path: evidence.businessPermitPath,
    certificate_paths: evidence.certificatePaths,
    profile_photo_path: evidence.profilePhotoPath,
  };
}

export async function getMechanicVerification(userId: string) {
  return requireSupabase()
    .from("mechanic_verification_submissions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

async function functionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      if (payload && typeof payload === "object" && "error" in payload) {
        const message = String((payload as { error?: unknown }).error ?? "").trim();
        if (message) return message;
      }
    } catch {
      // Fall through to the SDK's generic message when the response body is unavailable.
    }
  }

  return error instanceof Error ? error.message : "Unable to contact the verification service.";
}

/**
 * Registers an Individual Mechanic's claimed National ID number privately.
 * The Edge Function stores the normalized readable ID only in a private,
 * server-managed table and also keeps a one-way HMAC fingerprint for
 * duplicate-account detection. The public verification row never contains it.
 */
export async function registerMechanicIdentityNumber(identityNumber: string) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("register-verification-identity", {
    body: { identityNumber },
  });
  if (error) throw new Error(await functionErrorMessage(error));
  if (data?.error) throw new Error(String(data.error));
  return data as { registered: boolean; readableIdentityStored?: boolean };
}

export async function uploadMechanicVerificationImage(input: {
  userId: string;
  kind: VerificationImageKind;
  uri: string;
  mimeType?: string | null;
}) {
  const client = requireSupabase();

  if (input.mimeType && !ALLOWED_IMAGE_MIME_TYPES.has(input.mimeType)) {
    throw new Error("Only JPEG, PNG, or WebP verification images are supported.");
  }

  let arrayBuffer: ArrayBuffer;
  try {
    const response = await fetch(input.uri);
    arrayBuffer = await response.arrayBuffer();
  } catch {
    throw new Error("Unable to read the selected image from this device. Please retake it or choose another image.");
  }

  if (!arrayBuffer.byteLength) {
    throw new Error("The selected verification image is empty. Please retake it or choose another image.");
  }

  const extension = extensionForMimeType(input.mimeType);
  const suffix = Math.random().toString(36).slice(2, 10);
  const path = `${input.userId}/${input.kind}/${Date.now()}-${suffix}.${extension}`;

  const result = await client.storage.from(VERIFICATION_BUCKET).upload(path, arrayBuffer, {
    contentType: input.mimeType ?? "image/jpeg",
    upsert: false,
  });

  if (!result.error && input.kind === "national-id") {
    Alert.alert(
      "ID number matched",
      "The ID number matches the National ID image you provided, and the image was uploaded securely. Complete the remaining required documents, then submit your application for verification.",
    );
  }

  return result;
}

export async function saveMechanicVerificationDraft(
  userId: string,
  checklist: MechanicVerificationChecklist,
  evidence: MechanicVerificationEvidence,
) {
  const client = requireSupabase();
  const { data: existing, error: lookupError } = await getMechanicVerification(userId);
  if (lookupError) throw lookupError;

  const payload = verificationPayload(userId, checklist, evidence);

  if (existing) {
    return client
      .from("mechanic_verification_submissions")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();
  }

  return client
    .from("mechanic_verification_submissions")
    .insert({ ...payload, status: "draft" })
    .select()
    .single();
}

export async function submitMechanicVerification(
  userId: string,
  checklist: MechanicVerificationChecklist,
  evidence: MechanicVerificationEvidence,
) {
  const client = requireSupabase();
  const { data: existing, error: lookupError } = await getMechanicVerification(userId);
  if (lookupError) throw lookupError;

  const payload = {
    ...verificationPayload(userId, checklist, evidence),
    status: "pending",
  };

  if (existing) {
    return client
      .from("mechanic_verification_submissions")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();
  }

  return client
    .from("mechanic_verification_submissions")
    .insert(payload)
    .select()
    .single();
}
