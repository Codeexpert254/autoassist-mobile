import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDemoApp } from "@/context/demo-app-context";

export function DemoToast() {
  const { state, clearToast } = useDemoApp();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!state.toast) return;
    const timer = setTimeout(clearToast, 1800);
    return () => clearTimeout(timer);
  }, [state.toast, clearToast]);

  if (!state.toast) return null;

  return (
    <View pointerEvents="none" style={[styles.toast, { top: insets.top + 8 }]}>
      <Text style={styles.label}>DEMO UPDATE</Text>
      <Text style={styles.text}>{state.toast}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 999,
    elevation: 12,
    borderRadius: 12,
    backgroundColor: "#123D76",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  label: {
    color: "#B8D2F0",
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  text: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});
