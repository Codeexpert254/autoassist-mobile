import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";

// Foreground reminders only. Never run an unbounded loop, especially when the
// provider has already opened/dismissed the offer. OS push handles background.
const timers = new Map<string, ReturnType<typeof setInterval>>();
const CHANNEL_ID = "incoming-requests-v3";

export function stopOfferAlert(key: string) {
  const timer = timers.get(key);
  if (timer) clearInterval(timer);
  timers.delete(key);
}

export async function startOfferAlert(key: string, title: string, body: string) {
  stopOfferAlert(key);
  if (AppState.currentState !== "active") return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Urgent AutoAssist work offers",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 350, 150, 350],
        description: "Audible alerts for new work. Change sound and vibration in Android settings.",
      });
    }
    let played = 0;
    const sound = () => {
      if (AppState.currentState !== "active") {
        stopOfferAlert(key);
        return;
      }
      played++;
      void Notifications.scheduleNotificationAsync({
        content: {
          title, body, sound: "default",
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
      }).catch(() => undefined);
      if (played >= 3) stopOfferAlert(key);
    };
    sound();
    if (played < 3) timers.set(key, setInterval(sound, 20000));
  } catch {
    // An unavailable notification service must never block accepting work.
  }
}
