import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import { ensureAutoAssistNotificationChannels, REQUEST_CHANNEL, primaryNotificationSound } from "@/services/notification-sounds";

// Foreground reminders only. Never run an unbounded loop, especially when the
// provider has already opened/dismissed the offer. OS push handles background.
const timers = new Map<string, ReturnType<typeof setInterval>>();
const activeAlerts = new Set<string>();
const CHANNEL_ID = REQUEST_CHANNEL;

export function stopOfferAlert(key: string) {
  const timer = timers.get(key);
  if (timer) clearInterval(timer);
  timers.delete(key);
  activeAlerts.delete(key);
}

export async function startOfferAlert(key: string, title: string, body: string) {
  stopOfferAlert(key);
  if (AppState.currentState !== "active") return;
  activeAlerts.add(key);
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted || !activeAlerts.has(key)) return;
    await ensureAutoAssistNotificationChannels();
    if (!activeAlerts.has(key)) return;
    let played = 0;
    const sound = () => {
      if (!activeAlerts.has(key) || AppState.currentState !== "active") {
        stopOfferAlert(key);
        return;
      }
      played++;
      void Notifications.scheduleNotificationAsync({
        content: {
          title, body, sound: primaryNotificationSound,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
      }).catch(() => undefined);
      if (played >= 3) stopOfferAlert(key);
    };
    sound();
    if (played < 3) timers.set(key, setInterval(sound, 20000));
  } catch {
    stopOfferAlert(key);
    // An unavailable notification service must never block accepting work.
  }
}
