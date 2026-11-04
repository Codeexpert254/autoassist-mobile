import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StaticScreen, type StaticScreenProps } from "@/components/autoassist-ui";
import { SettingsButton } from "@/components/settings-button";

/** Settings shortcut on the other role dashboards, without touching their flows. */
export function StaticDashboardWithSettings({ screen }: { screen: StaticScreenProps }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <StaticScreen {...screen} />
      <View style={{ position: "absolute", top: insets.top + 8, right: 20, zIndex: 50 }}>
        <SettingsButton />
      </View>
    </View>
  );
}
