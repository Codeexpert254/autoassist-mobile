import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerDevicePushToken } from "@/services/dispatch-backend";
import { requireSupabase } from "@/lib/supabase";

const TOKEN_STORAGE_KEY = "autoassist:devicePushToken";

export type PushRegistrationResult = {
  registered: boolean;
  message: string;
};

export async function ensureJobNotifications(userId: string): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return {
      registered: false,
      message: "Push notifications require a physical device.",
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("jobs", {
      name: "AutoAssist jobs",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    });
    // A new channel ID ensures Android applies sound/importance configuration
    // even if an older channel was previously created as silent.
    await Notifications.setNotificationChannelAsync("incoming-requests-v2", {
      name: "Incoming service requests",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      description: "New matched requests needing an immediate response.",
    });
  }

  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    permissions = await Notifications.requestPermissionsAsync();
  }

  if (!permissions.granted) {
    return {
      registered: false,
      message: "Notifications are disabled. Enable them in your phone settings so you do not miss repair requests.",
    };
  }

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);

  if (!projectId) {
    return {
      registered: false,
      message: "Push token registration needs an EAS project ID. It will become active in the AutoAssist development/production build.",
    };
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const result = await registerDevicePushToken(userId, token.data, Device.deviceName);
    if (result.error) throw result.error;
    globalThis.localStorage?.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ userId, token: token.data }));

    return {
      registered: true,
      message: "Job notifications are enabled on this device.",
    };
  } catch (error) {
    return {
      registered: false,
      message: error instanceof Error ? error.message : "Unable to register this device for job notifications.",
    };
  }
}


/**
 * Prevent a phone that was used by a mechanic from continuing to receive
 * mechanic alerts after switching to a motorist account. Only revoke the
 * current physical device; leave other mechanic devices subscribed.
 */
export async function unregisterCurrentDevicePushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;
  const raw = globalThis.localStorage?.getItem(TOKEN_STORAGE_KEY);
  let token: string | undefined;
  if (raw) {
    try {
      const saved = JSON.parse(raw) as { userId?: string; token?: string };
      if (saved.userId === userId) token = saved.token;
    } catch {
      // A corrupt local cache should not block logout.
    }
  }

  // Older APKs did not cache the token. Resolve the current Expo token
  // without asking for notification permissions or registering a new one.
  if (!token) {
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted) return;
    const projectId = Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
    if (!projectId) return;
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  }

  const { error } = await requireSupabase().from("device_push_tokens")
    .update({ enabled: false })
    .eq("user_id", userId)
    .eq("expo_push_token", token);
  if (error) throw error;
  if (raw) globalThis.localStorage?.removeItem(TOKEN_STORAGE_KEY);
}
