import { requireSupabase } from "@/lib/supabase";

export type AppRole = "motorist" | "mechanic";
export type BackendRepairStatus =
  | "requested"
  | "accepted"
  | "en-route"
  | "arrived"
  | "inspected"
  | "quoted"
  | "approved"
  | "repairing"
  | "repair-complete"
  | "paid"
  | "completed"
  | "cancelled";

export type VehicleInput = {
  make: string;
  model: string;
  year: number;
  registration: string;
  powerSource: string;
  transmission: string;
};

export type RepairRequestInput = {
  vehicleId: string;
  mechanicId: string;
  description: string;
  symptom: string;
  locationText: string;
  latitude?: number | null;
  longitude?: number | null;
  preferredTime: string;
};

export async function signUpWithEmail(
  email: string,
  password: string,
  profile: { fullName: string; phone: string; role: AppRole },
) {
  const client = requireSupabase();
  return client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: profile.fullName,
        phone: profile.phone,
        role: profile.role,
      },
    },
  });
}

export async function signInWithEmail(email: string, password: string) {
  return requireSupabase().auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return requireSupabase().auth.signOut();
}

export async function getOwnProfile(userId: string) {
  return requireSupabase().from("profiles").select("*").eq("id", userId).single();
}

export async function updateOwnProfile(userId: string, input: { fullName: string; phone: string }) {
  return requireSupabase()
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
    })
    .eq("id", userId)
    .select()
    .single();
}

export async function getMechanicProfile(userId: string) {
  return requireSupabase()
    .from("mechanic_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function saveMechanicProfile(
  userId: string,
  input: { garageName: string; location: string; services: string[] },
) {
  const client = requireSupabase();
  const existing = await getMechanicProfile(userId);
  if (existing.error) throw existing.error;

  if (existing.data) {
    return client
      .from("mechanic_profiles")
      .update({
        garage_name: input.garageName.trim(),
        location: input.location.trim(),
        services: input.services,
      })
      .eq("user_id", userId)
      .select()
      .single();
  }

  return client
    .from("mechanic_profiles")
    .insert({
      user_id: userId,
      garage_name: input.garageName.trim(),
      location: input.location.trim(),
      services: input.services,
    })
    .select()
    .single();
}

export async function getVerifiedMechanics() {
  return requireSupabase()
    .from("mechanic_profiles")
    .select("*")
    .eq("verified", true)
    .order("rating", { ascending: false });
}

export async function getOwnedVehicles(userId: string) {
  const table = requireSupabase().from("vehicles") as any;
  return table
    .select("*")
    .eq("owner_id", userId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
}

export async function saveVehicle(userId: string, vehicle: VehicleInput, vehicleId?: string) {
  const client = requireSupabase();
  const payload = {
    owner_id: userId,
    make: vehicle.make.trim(),
    model: vehicle.model.trim(),
    year: vehicle.year,
    registration: vehicle.registration.trim().toUpperCase(),
    power_source: vehicle.powerSource,
    transmission: vehicle.transmission,
  };

  if (vehicleId) {
    return client
      .from("vehicles")
      .update(payload)
      .eq("id", vehicleId)
      .eq("owner_id", userId)
      .select()
      .single();
  }

  return client.from("vehicles").insert(payload).select().single();
}

export async function createRepairRequest(motoristId: string, input: RepairRequestInput) {
  return requireSupabase()
    .from("repair_requests")
    .insert({
      motorist_id: motoristId,
      mechanic_id: input.mechanicId,
      vehicle_id: input.vehicleId,
      description: input.description.trim(),
      symptom: input.symptom,
      location_text: input.locationText.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      preferred_time: input.preferredTime.trim() || "As soon as possible",
      status: "requested",
    })
    .select()
    .single();
}

export async function getRepairRequest(requestId: string) {
  return requireSupabase()
    .from("repair_requests")
    .select("*, vehicles(*), inspections(*), repair_quotes(*), ratings(*)")
    .eq("id", requestId)
    .single();
}

export async function getMotoristRepairs(motoristId: string) {
  return requireSupabase()
    .from("repair_requests")
    .select("*, vehicles(*), repair_quotes(*)")
    .eq("motorist_id", motoristId)
    .order("created_at", { ascending: false });
}

export async function getMechanicRepairs(mechanicId: string) {
  return requireSupabase()
    .from("repair_requests")
    .select("*, vehicles(*), inspections(*), repair_quotes(*), ratings(*)")
    .eq("mechanic_id", mechanicId)
    .order("created_at", { ascending: false });
}

export async function updateRepairStatus(requestId: string, status: BackendRepairStatus) {
  return requireSupabase()
    .from("repair_requests")
    .update({ status })
    .eq("id", requestId)
    .select()
    .single();
}

export async function saveInspection(input: {
  requestId: string;
  mechanicId: string;
  brakePads: string;
  brakeDiscs: string;
  brakeFluid: string;
  notes: string;
}) {
  const client = requireSupabase();
  const { data: existing, error: lookupError } = await client
    .from("inspections")
    .select("id")
    .eq("request_id", input.requestId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const payload = {
    request_id: input.requestId,
    mechanic_id: input.mechanicId,
    brake_pads: input.brakePads,
    brake_discs: input.brakeDiscs,
    brake_fluid: input.brakeFluid,
    notes: input.notes.trim(),
  };

  if (existing) {
    return client.from("inspections").update(payload).eq("id", existing.id).select().single();
  }

  return client.from("inspections").insert(payload).select().single();
}

export async function saveRepairQuote(input: {
  requestId: string;
  mechanicId: string;
  labourDescription: string;
  labourAmount: number;
  partDescription: string;
  partAmount: number;
  serviceFee: number;
}) {
  const client = requireSupabase();
  const { data: existing, error: lookupError } = await client
    .from("repair_quotes")
    .select("id")
    .eq("request_id", input.requestId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const payload = {
    request_id: input.requestId,
    mechanic_id: input.mechanicId,
    labour_description: input.labourDescription.trim(),
    labour_amount: input.labourAmount,
    part_description: input.partDescription.trim(),
    part_amount: input.partAmount,
    service_fee: input.serviceFee,
  };

  if (existing) {
    return client.from("repair_quotes").update(payload).eq("id", existing.id).select().single();
  }

  return client.from("repair_quotes").insert(payload).select().single();
}

export async function submitRating(input: {
  requestId: string;
  motoristId: string;
  mechanicId: string;
  rating: number;
  review?: string;
}) {
  return requireSupabase()
    .from("ratings")
    .insert({
      request_id: input.requestId,
      motorist_id: input.motoristId,
      mechanic_id: input.mechanicId,
      rating: input.rating,
      review: input.review?.trim() || null,
    })
    .select()
    .single();
}

export function subscribeToRepair(requestId: string, onChange: () => void) {
  const client = requireSupabase();
  const channel = client
    .channel(`repair:${requestId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "repair_requests", filter: `id=eq.${requestId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "inspections", filter: `request_id=eq.${requestId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "repair_quotes", filter: `request_id=eq.${requestId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ratings", filter: `request_id=eq.${requestId}` },
      onChange,
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
