import { requireSupabase } from "@/lib/supabase";

export type VehiclePowerSource = "Hybrid" | "Electric" | "Non-hybrid";
export type VehicleFuelType = "Petrol" | "Diesel";

export type VehicleFormValue = {
  make: string;
  model: string;
  year: number;
  registration: string;
  powerSource: VehiclePowerSource;
  fuelType: VehicleFuelType | null;
  transmission: string;
};

export function normalizePowerSource(value?: string | null): VehiclePowerSource {
  if (value === "Hybrid" || value === "Electric" || value === "Non-hybrid") return value;
  return "Non-hybrid";
}

export function inferFuelType(
  powerSource?: string | null,
  explicitFuelType?: string | null,
): VehicleFuelType | null {
  if (explicitFuelType === "Petrol" || explicitFuelType === "Diesel") return explicitFuelType;
  if (powerSource === "Petrol" || powerSource === "Diesel") return powerSource;
  return null;
}

export async function getMotoristVehicles(userId: string) {
  const table = requireSupabase().from("vehicles") as any;
  return table
    .select("*")
    .eq("owner_id", userId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
}

export async function saveMotoristVehicle(
  userId: string,
  vehicle: VehicleFormValue,
  vehicleId?: string,
) {
  const table = requireSupabase().from("vehicles") as any;
  const payload = {
    owner_id: userId,
    make: vehicle.make.trim(),
    model: vehicle.model.trim(),
    year: vehicle.year,
    registration: vehicle.registration.trim().toUpperCase(),
    power_source: vehicle.powerSource,
    fuel_type: vehicle.powerSource === "Electric" ? null : vehicle.fuelType,
    transmission: vehicle.transmission,
    archived_at: null,
  };

  if (vehicleId) {
    return table
      .update(payload)
      .eq("id", vehicleId)
      .eq("owner_id", userId)
      .select()
      .single();
  }

  return table.insert(payload).select().single();
}

export async function deleteMotoristVehicle(userId: string, vehicleId: string) {
  const client = requireSupabase();
  const history = await (client.from("repair_requests") as any)
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .eq("motorist_id", userId);

  if (history.error) {
    return { data: null, error: history.error, archived: false };
  }

  const table = client.from("vehicles") as any;
  if ((history.count ?? 0) > 0) {
    const result = await table
      .update({ archived_at: new Date().toISOString() })
      .eq("id", vehicleId)
      .eq("owner_id", userId)
      .select("id")
      .single();

    return { ...result, archived: true };
  }

  const result = await table
    .delete()
    .eq("id", vehicleId)
    .eq("owner_id", userId)
    .select("id")
    .single();

  return { ...result, archived: false };
}
