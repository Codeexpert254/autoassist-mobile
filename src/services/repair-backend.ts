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

export async function upsertProfile(input: {
  userId: string;
  fullName: string;
  phone: string;
  role: AppRole;
}) {
  return requireSupabase()
    .from("profiles")
    .upsert({
      id: input.userId,
      full_name: input.fullName,
      phone: input.phone,
      role: input.role,
    })
    .select()
    .single();
}

export async function saveVehicle(userId: string, vehicle: VehicleInput, vehicleId?: string) {
  const client = requireSupabase();
  const payload = {
    owner_id: userId,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    registration: vehicle.registration,
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
      description: input.description,
      symptom: input.symptom,
      location_text: input.locationText,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      preferred_time: input.preferredTime,
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
    .select("*, vehicles(*), repair_quotes(*)")
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
  return requireSupabase()
    .from("inspections")
    .upsert(
      {
        request_id: input.requestId,
        mechanic_id: input.mechanicId,
        brake_pads: input.brakePads,
        brake_discs: input.brakeDiscs,
        brake_fluid: input.brakeFluid,
        notes: input.notes,
      },
      { onConflict: "request_id" },
    )
    .select()
    .single();
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
  return requireSupabase()
    .from("repair_quotes")
    .upsert(
      {
        request_id: input.requestId,
        mechanic_id: input.mechanicId,
        labour_description: input.labourDescription,
        labour_amount: input.labourAmount,
        part_description: input.partDescription,
        part_amount: input.partAmount,
        service_fee: input.serviceFee,
      },
      { onConflict: "request_id" },
    )
    .select()
    .single();
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
    .upsert(
      {
        request_id: input.requestId,
        motorist_id: input.motoristId,
        mechanic_id: input.mechanicId,
        rating: input.rating,
        review: input.review ?? null,
      },
      { onConflict: "request_id" },
    )
    .select()
    .single();
}

export function subscribeToRepair(requestId: string, onChange: () => void) {
  const client = requireSupabase();
  const channel = client
    .channel(`repair:${requestId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "repair_requests",
        filter: `id=eq.${requestId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "inspections",
        filter: `request_id=eq.${requestId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "repair_quotes",
        filter: `request_id=eq.${requestId}`,
      },
      onChange,
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
