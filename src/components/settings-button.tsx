import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

/** Shared, accessible settings shortcut in the upper-right dashboard header. */
export function SettingsButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      accessibilityHint="Manage your AutoAssist app and notification preferences"
      hitSlop={8}
      style={styles.button}
      onPress={() => router.push("/settings")}
    >
      <SymbolView name={{ ios: "gearshape.fill", android: "settings", web: "settings" } as never}
        size={21} tintColor="#1857A6" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 40, minHeight: 40, borderRadius: 12,
    borderWidth: 1, borderColor: "#E4E7EC",
    backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
  },
});
