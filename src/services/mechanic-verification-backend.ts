import { requireSupabase } from "@/lib/supabase";

export type MechanicVerificationChecklist = {
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
    // ImagePicker returns a local device URI (for example file:// or content://).
    // Local URI responses do not reliably expose normal HTTP response status,
    // so reading the bytes is the reliable success check on React Native.
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
