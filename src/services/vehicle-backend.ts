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
