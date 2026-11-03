import { Platform } from "react-native";

import { requireSupabase } from "@/lib/supabase";

export type DispatchRequestStatus =
  | "matching"
  | "offered"
  | "requested"
  | "accepted"
  | "connected"
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

export type MechanicOfferStatus = "offered" | "accepted" | "declined" | "expired" | "cancelled";
export type ConnectionPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type DispatchRepairRequestInput = {
  vehicleId?: string | null;
  description: string;
  symptom: "Brakes" | "Engine" | "Electrical" | "Other";
  locationText: string;
  latitude?: number | null;
  longitude?: number | null;
  preferredTime: string;
};

async function throwFunctionError(error: unknown, fallback: string): Promise<never> {
  let message = error instanceof Error ? error.message : fallback;
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === "function") {
    try {
      const payload = await context.json();
      if (payload?.error) message = String(payload.error);
    } catch {
      // Keep the original function error when the response is not JSON.
    }
  }
  throw new Error(message);
}

export async function createDispatchRepairRequest(
  motoristId: string,
  input: DispatchRepairRequestInput,
) {
  return requireSupabase()
    .from("repair_requests")
    .insert({
      motorist_id: motoristId,
      mechanic_id: null,
      vehicle_id: input.vehicleId ?? null,
      description: input.description.trim(),
      symptom: input.symptom,
      location_text: input.locationText.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      preferred_time: input.preferredTime.trim() || "As soon as possible",
      status: "matching",
    } as never)
    .select()
    .single();
}

export async function getDispatchRequest(requestId: string) {
  const table = requireSupabase().from("repair_requests") as any;
  return table.select("*").eq("id", requestId).single();
}

export async function dispatchRepairRequest(requestId: string) {
  const { data, error } = await requireSupabase().functions.invoke("dispatch-repair-request", {
    body: { requestId },
  });
  if (error) return throwFunctionError(error, "Unable to dispatch this repair request.");
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function getAssignedMechanic(mechanicId: string) {
  const table = requireSupabase().from("mechanic_profiles") as any;
  return table
    .select("user_id, garage_name, location, provider_type, services, rating, reviews_count, completed_jobs")
    .eq("user_id", mechanicId)
    .single();
}

export async function updateMechanicAvailability(
  userId: string,
  available: boolean,
  coordinates?: { latitude: number; longitude: number } | null,
) {
  const table = requireSupabase().from("mechanic_profiles") as any;
  const payload: Record<string, unknown> = { is_available: available };
  if (coordinates) {
    payload.latitude = coordinates.latitude;
    payload.longitude = coordinates.longitude;
  }
  return table.update(payload).eq("user_id", userId).select().single();
}

export async function getPendingMechanicOffer(mechanicId: string) {
  const table = requireSupabase().from("mechanic_offers") as any;
  return table
    .select("*, repair_requests(*)")
    .eq("mechanic_id", mechanicId)
    .eq("status", "offered")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getMechanicOffer(offerId: string) {
  const table = requireSupabase().from("mechanic_offers") as any;
  return table.select("*, repair_requests(*)").eq("id", offerId).single();
}

export async function respondToMechanicOffer(offerId: string, response: "accept" | "decline") {
  const { data, error } = await requireSupabase().functions.invoke("respond-mechanic-offer", {
    body: { offerId, response },
  });
  if (error) return throwFunctionError(error, "Unable to respond to this mechanic offer.");
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function registerDevicePushToken(
  userId: string,
  expoPushToken: string,
  deviceName?: string | null,
) {
  const table = requireSupabase().from("device_push_tokens") as any;
  return table.upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform: Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web" ? Platform.OS : "unknown",
      device_name: deviceName ?? null,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "expo_push_token" },
  );
}

export async function getConnectionPayment(requestId: string) {
  const table = requireSupabase().from("connection_payments") as any;
  return table.select("*").eq("request_id", requestId).maybeSingle();
}

export async function initiateConnectionPayment(requestId: string, phone?: string) {
  const { data, error } = await requireSupabase().functions.invoke("mpesa-stk-push", {
    body: { requestId, phone: phone?.trim() || undefined },
  });
  if (error) return throwFunctionError(error, "Unable to start M-PESA payment.");
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function getConnectionContact(requestId: string) {
  const { data, error } = await requireSupabase().functions.invoke("get-connection-contact", {
    body: { requestId },
  });
  if (error) return throwFunctionError(error, "Unable to unlock connection details.");
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function getMechanicActiveRepairs(mechanicId: string) {
  const table = requireSupabase().from("repair_requests") as any;
  return table
    .select("*")
    .eq("mechanic_id", mechanicId)
    .not("status", "in", '("completed","cancelled")')
    .order("updated_at", { ascending: false });
}

export function subscribeToMechanicOffers(mechanicId: string, onChange: () => void) {
  const client = requireSupabase();
  const channel = client
    .channel(`mechanic-offers:${mechanicId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mechanic_offers", filter: `mechanic_id=eq.${mechanicId}` },
      onChange,
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
