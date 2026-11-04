import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerDevicePushToken } from "@/services/dispatch-backend";

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
