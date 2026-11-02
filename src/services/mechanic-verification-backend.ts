import { requireSupabase } from "@/lib/supabase";

export type MechanicVerificationChecklist = {
  nationalId: boolean;
  businessPermit: boolean;
  certificates: boolean;
  profilePhoto: boolean;
};

export async function getMechanicVerification(userId: string) {
  return requireSupabase()
    .from("mechanic_verification_submissions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function submitMechanicVerification(
  userId: string,
  checklist: MechanicVerificationChecklist,
) {
  const client = requireSupabase();
  const { data: existing, error: lookupError } = await getMechanicVerification(userId);
  if (lookupError) throw lookupError;

  const payload = {
    user_id: userId,
    national_id_confirmed: checklist.nationalId,
    business_permit_confirmed: checklist.businessPermit,
    certificates_confirmed: checklist.certificates,
    profile_photo_confirmed: checklist.profilePhoto,
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
