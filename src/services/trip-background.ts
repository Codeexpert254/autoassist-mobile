import "expo-sqlite/localStorage/install";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { requireSupabase } from "@/lib/supabase";
import { publishTripPosition } from "@/services/mechanic-trip";

const TASK_NAME = "autoassist-active-mechanic-trip";
const TRIP_STORAGE = "autoassist:active-trip-v1";

type ActiveTrip = { requestId: string; mechanicId: string };

function readTrip(): ActiveTrip | null {
  try {
    const raw = globalThis.localStorage?.getItem(TRIP_STORAGE);
    const saved = raw ? JSON.parse(raw) as ActiveTrip : null;
    return saved?.requestId && saved?.mechanicId ? saved : null;
  } catch {
    return null;
  }
}

// Expo TaskManager must be registered at module scope in the Router root.
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  const trip = readTrip();
  if (!trip) return;
  const locations = (data as { locations?: Location.LocationObject[] }).locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) return;
  try {
    const { data: auth, error: authError } = await requireSupabase().auth.getUser();
    if (authError || auth.user?.id !== trip.mechanicId) {
      await stopBackgroundTripTracking();
      return;
    }
    // Server RLS rejects updates once the trip has arrived or is cancelled.
    await publishTripPosition(trip.requestId, trip.mechanicId, latest.coords);
  } catch (caught) {
    console.warn("Background trip position not sent:", caught instanceof Error ? caught.message : "Location unavailable");
  }
});

export async function startBackgroundTripTracking(requestId: string, mechanicId: string): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  if (!foreground.granted || !background.granted) return false;
  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (alreadyRunning) await Location.stopLocationUpdatesAsync(TASK_NAME);
  globalThis.localStorage?.setItem(TRIP_STORAGE, JSON.stringify({ requestId, mechanicId }));
  try {
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: "AutoAssist • Trip tracking active",
        notificationBody: "Your location is shared with this customer until you arrive. Open AutoAssist to stop.",
        notificationColor: "#1857A6",
        killServiceOnDestroy: true,
      },
    });
    return true;
  } catch (caught) {
    globalThis.localStorage?.removeItem(TRIP_STORAGE);
    throw caught;
  }
}

export async function stopBackgroundTripTracking(): Promise<void> {
  globalThis.localStorage?.removeItem(TRIP_STORAGE);
  if (Platform.OS !== "android") return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) {
      await Location.stopLocationUpdatesAsync(TASK_NAME);
    }
  } catch (caught) {
    console.warn("Could not stop background trip watcher:", caught instanceof Error ? caught.message : "Unknown error");
  }
}
