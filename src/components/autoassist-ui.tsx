import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AdminScreen,
  BottomNav as BaseBottomNav,
  ScreenHeader,
  StaticScreen as BaseStaticScreen,
  type ScreenBlock,
  type StaticScreenProps,
  type Tone,
} from "./autoassist-ui-base";
import {
  getBottomTarget,
  primaryNext,
  secondaryNext,
} from "@/data/prototype-navigation";

export { AdminScreen, ScreenHeader, BaseBottomNav as BottomNav };
export type { ScreenBlock, StaticScreenProps, Tone };

const contextualNext: Record<string, { label: string; route: string }> = {
  "/motorist/mechanic-results": {
    label: "Open top mechanic",
    route: "/motorist/mechanic-profile",
  },
  "/motorist/spare-parts": {
    label: "View brake pad set",
    route: "/motorist/part-details",
  },
  "/partsdealer/inventory": {
    label: "Add new part",
    route: "/partsdealer/add-part",
  },
};

export function StaticScreen(props: StaticScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const next = primaryNext[pathname];
  const secondary = secondaryNext[pathname];
  const context = contextualNext[pathname];
  const actionLabel = props.primaryAction ?? context?.label;
  const actionRoute = next ?? context?.route;

  const extraBottomSpace = actionLabel || props.secondaryAction || props.bottomNav ? 115 : 24;
  const blocks: ScreenBlock[] = [
    ...(props.blocks ?? []),
    { type: "spacer", size: extraBottomSpace },
  ];

  return (
    <View style={styles.container}>
      <BaseStaticScreen
        {...props}
        blocks={blocks}
        primaryAction={undefined}
        secondaryAction={undefined}
        bottomNav={false}
      />

      {props.headerBack !== false ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backHitArea, { top: insets.top + 6 }]}
        />
      ) : null}

      {actionLabel || props.secondaryAction ? (
        <View
          style={[
            styles.actions,
            { bottom: props.bottomNav ? insets.bottom + 70 : insets.bottom + 16 },
          ]}
        >
          {actionLabel && actionRoute ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push(actionRoute as never)}
            >
              <Text style={styles.primaryText}>{actionLabel}</Text>
            </Pressable>
          ) : null}

          {props.secondaryAction && secondary ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push(secondary as never)}
            >
              <Text style={styles.secondaryText}>{props.secondaryAction}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {props.bottomNav ? (
        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 4) }]}>
          {(["Home", "Jobs", "Messages", "Profile"] as const).map((item) => (
            <Pressable
              key={item}
              style={styles.navItem}
              onPress={() => router.replace(getBottomTarget(pathname, item) as never)}
            >
              <Text
                style={[
                  styles.navText,
                  (props.activeTab ?? "Home") === item && styles.navTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backHitArea: {
    position: "absolute",
    left: 14,
    width: 42,
    height: 42,
    zIndex: 20,
  },
  actions: {
    position: "absolute",
    left: 20,
    right: 20,
    gap: 8,
    paddingTop: 8,
    backgroundColor: "rgba(255,255,255,0.97)",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#1857A6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: "#344054",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 64,
    borderTopWidth: 1,
    borderTopColor: "#E4E7EC",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  navItem: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    color: "#98A2B3",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  navTextActive: {
    color: "#1857A6",
    fontFamily: "Inter_600SemiBold",
  },
});
