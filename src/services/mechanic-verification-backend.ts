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

/**
 * Registers an Individual Mechanic's claimed National ID number privately.
 * The Edge Function normalizes the number and stores only a one-way HMAC
 * fingerprint so the plaintext ID number is never persisted by the app.
 */
export async function registerMechanicIdentityNumber(identityNumber: string) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("register-verification-identity", {
    body: { identityNumber },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as { registered: boolean };
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

  return client.storage.from(VERIFICATION_BUCKET).upload(path, arrayBuffer, {
    contentType: input.mimeType ?? "image/jpeg",
    upsert: false,
  });
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
