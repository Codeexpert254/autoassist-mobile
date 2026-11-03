import {
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { DemoToast } from "@/components/demo-toast";
import { AuthProvider } from "@/context/auth-context";
import { DemoAppProvider } from "@/context/demo-app-context";
import { RepairFlowProvider } from "@/context/repair-flow-context";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function NotificationRouter() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const openResponse = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data;
      const route = typeof data?.route === "string" ? data.route : null;
      if (!route) return;

      const params: Record<string, string> = {};
      if (typeof data.offerId === "string") params.offerId = data.offerId;
      if (typeof data.requestId === "string") params.requestId = data.requestId;

      router.push({ pathname: route as never, params });
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse);
    void Notifications.getLastNotificationResponseAsync().then(openResponse).catch(() => undefined);

    return () => subscription.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <DemoAppProvider>
        <RepairFlowProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
          <NotificationRouter />
          <DemoToast />
        </RepairFlowProvider>
      </DemoAppProvider>
    </AuthProvider>
  );
}
