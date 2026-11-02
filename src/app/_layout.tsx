import {
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";

import { DemoToast } from "@/components/demo-toast";
import { AuthProvider } from "@/context/auth-context";
import { DemoAppProvider } from "@/context/demo-app-context";
import { RepairFlowProvider } from "@/context/repair-flow-context";

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
          <DemoToast />
        </RepairFlowProvider>
      </DemoAppProvider>
    </AuthProvider>
  );
}
