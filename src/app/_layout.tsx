import {
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { dismissFloatingOffer } from "@/services/floating-offers";
import "@/services/trip-background";

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
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (Platform.OS === "web" || loading || !user || !profile) return;

    const openResponse = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data;
      if (!data) return;

      const route = typeof data.route === "string" ? data.route : null;
      if (!route) return;
      const clearTap = () => {
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      };

      // Never open mechanic offers when a motorist (or another role) is logged in.
      if (
        (route.startsWith("/mechanic/") && profile.role !== "mechanic") ||
        (route.startsWith("/motorist/") && profile.role !== "motorist") ||
        (route.startsWith("/partsdealer/") && profile.role !== "partsdealer" && !(profile.role === "mechanic" && profile.provider_type === "garage")) ||
        (route.startsWith("/towing/") && profile.role !== "towing") ||
        (route.startsWith("/rider/") && profile.role !== "rider") ||
        (data.type === "mechanic_offer" && profile.role !== "mechanic")
      ) {
        clearTap();
        return;
      }

      const params: Record<string, string> = {};
      if (typeof data.offerId === "string") params.offerId = data.offerId;
      if (typeof data.requestId === "string") params.requestId = data.requestId;
      if (typeof data.orderId === "string") params.orderId = data.orderId;

      clearTap();
      router.push({ pathname: route as never, params });
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse);
    void Notifications.getLastNotificationResponseAsync().then(openResponse).catch(() => undefined);

    return () => subscription.remove();
  }, [router, loading, user?.id, profile?.role]);

  return null;
}

function ClearNativeOverlayOnForeground() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (AppState.currentState === "active") dismissFloatingOffer();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") dismissFloatingOffer();
    });
    return () => listener.remove();
  }, []);
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
          <ClearNativeOverlayOnForeground />
          <DemoToast />
        </RepairFlowProvider>
      </DemoAppProvider>
    </AuthProvider>
  );
}
