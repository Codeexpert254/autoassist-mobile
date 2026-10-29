import {
  Inter_400Regular,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";

import { DemoToast } from "@/components/demo-toast";
import { DemoAppProvider } from "@/context/demo-app-context";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <DemoAppProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <DemoToast />
    </DemoAppProvider>
  );
}
