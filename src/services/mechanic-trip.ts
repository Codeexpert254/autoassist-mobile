import { requireSupabase } from "@/lib/supabase";

export type TripPosition = {
  request_id: string;
  mechanic_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  heading_deg: number | null;
  speed_mps: number | null;
  updated_at: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
};

export async function readTripPosition(requestId: string): Promise<TripPosition | null> {
  const table = requireSupabase().from("mechanic_trip_locations" as never) as any;
  const { data, error } = await table.select("*").eq("request_id", requestId).maybeSingle();
  if (error) throw error;
  return (data ?? null) as TripPosition | null;
}

/** RLS allows writes only by the assigned mechanic while the paid job is en route. */
export async function publishTripPosition(requestId: string, mechanicId: string, coords: Coordinates): Promise<void> {
  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude) ||
      Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180) return;
  const table = requireSupabase().from("mechanic_trip_locations" as never) as any;
  const { error } = await table.upsert({
    request_id: requestId,
    mechanic_id: mechanicId,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy_m: coords.accuracy != null && Number.isFinite(coords.accuracy)
      ? Math.max(0, Math.min(5000, coords.accuracy)) : null,
    heading_deg: coords.heading != null && Number.isFinite(coords.heading) && coords.heading >= 0
      ? Math.min(360, coords.heading) : null,
    speed_mps: coords.speed != null && Number.isFinite(coords.speed) && coords.speed >= 0
      ? Math.min(120, coords.speed) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "request_id" });
  if (error) throw error;
}

export function subscribeToTripPosition(requestId: string, onChange: () => void): () => void {
  const client = requireSupabase();
  const channel = client.channel(`trip-position:${requestId}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "mechanic_trip_locations", filter: `request_id=eq.${requestId}`,
    }, onChange)
    .subscribe();
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    void client.removeChannel(channel);
  };
}
