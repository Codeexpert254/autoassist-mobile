import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDemoApp } from "@/context/demo-app-context";
import { repairStatusLabel, useRepairFlow } from "@/context/repair-flow-context";

const quickServices = [
  {
    label: "MECHANIC",
    helper: "Verified repair help",
    route: "/motorist/mechanic-results",
    icon: { ios: "wrench.fill", android: "build", web: "build" },
  },
  {
    label: "PARTS",
    helper: "Compatible spare parts",
    route: "/motorist/spare-parts",
    icon: { ios: "shippingbox.fill", android: "inventory_2", web: "inventory_2" },
  },
  {
    label: "TOWING",
    helper: "Roadside recovery",
    route: "/motorist/request-towing",
    icon: { ios: "car.fill", android: "local_shipping", web: "local_shipping" },
  },
] as const;

export default function Home() {
  const router = useRouter();
  const { state: demoState } = useDemoApp();
  const { state } = useRepairFlow();
  const firstName = demoState.user.name.split(" ")[0] || "Motorist";
  const vehicleName = `${state.vehicle.make} ${state.vehicle.model}`.trim();
  const hasActiveRepair = !["idle", "cancelled", "completed"].includes(state.status);

  return (
    <View style={styles.homeContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heading}>
          <Text style={styles.subTitle}>Good afternoon</Text>
          <Pressable onPress={() => router.push("/preview")}>
            <Text style={styles.previewLink}>Preview</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>{firstName}</Text>

        <Pressable style={styles.vehicleContainer} onPress={() => router.push("/motorist/vehicle-details")}>
          <Text style={styles.vehicle}>MY VEHICLE</Text>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleModel}>{vehicleName}</Text>
            <Image source={require("../../../assets/images/left-arrow.png")} style={styles.vehicleArrow} />
          </View>
          <Text style={styles.vehicleReg}>{state.vehicle.year} • {state.vehicle.registration} • {state.vehicle.powerSource}</Text>
        </Pressable>

        <Text style={styles.helpTitle}>What do you need help with?</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push(hasActiveRepair ? "/motorist/mechanic-assigned" : "/motorist/describe-problem")}
        >
          <Text style={styles.primaryButtonText}>{hasActiveRepair ? "View active repair" : "Describe a car problem"}</Text>
        </Pressable>

        <View style={styles.quickServicesHeading}>
          <View>
            <Text style={styles.quickServices}>Quick services</Text>
            <Text style={styles.quickServicesHint}>Get the help you need in a few taps.</Text>
          </View>
        </View>

        <View style={styles.servicesContainer}>
          {quickServices.map((service) => (
            <ServiceCard
              key={service.label}
              label={service.label}
              helper={service.helper}
              icon={service.icon}
              onPress={() => router.push(service.route)}
            />
          ))}
        </View>

        <Text style={styles.recentActivity}>{hasActiveRepair ? "Active repair" : "Recent activity"}</Text>
        <Pressable style={styles.activityContainer} onPress={() => router.push(hasActiveRepair ? "/motorist/mechanic-assigned" : "/motorist/history")}>
          <Text style={styles.activity}>{state.requestId ? `Repair ${state.requestId}` : "Repair request"}</Text>
          <Text style={styles.activityStatus}>{repairStatusLabel(state.status)}</Text>
          <Text style={styles.activityDetails}>{hasActiveRepair ? "View live repair" : "View jobs & history"}</Text>
        </Pressable>

        <View style={styles.bottomNav}>
          <Nav label="Home" active onPress={() => {}} />
          <Nav label="Jobs" onPress={() => router.push("/motorist/history")} />
          <Nav label="Messages" onPress={() => router.push("/messages")} />
          <Nav label="Profile" onPress={() => router.push("/profile")} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function ServiceCard({
  label,
  helper,
  icon,
  onPress,
}: {
  label: string;
  helper: string;
  icon: { readonly ios: string; readonly android: string; readonly web: string };
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.serviceCard, pressed && styles.serviceCardPressed]} onPress={onPress}>
      <View style={styles.iconHolder}>
        <SymbolView name={icon as never} size={25} tintColor="#1857A6" />
      </View>
      <Text style={styles.serviceText}>{label}</Text>
      <Text style={styles.serviceHelper} numberOfLines={2}>{helper}</Text>
    </Pressable>
  );
}

function Nav({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  homeContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  heading: { marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subTitle: { color: "#667085", fontSize: 13, fontFamily: "Inter_400Regular" },
  previewLink: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  title: { color: "#102A43", fontSize: 23, fontFamily: "Inter_600SemiBold", marginTop: 4, marginBottom: 18 },
  vehicleContainer: { backgroundColor: "#123D76", minHeight: 105, padding: 16, gap: 10, borderRadius: 14, marginBottom: 32 },
  vehicleInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vehicle: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  vehicleModel: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  vehicleReg: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_400Regular" },
  vehicleArrow: { width: 10, height: 10, transform: [{ scaleX: -1 }], tintColor: "#FFFFFF" },
  helpTitle: { color: "#102A43", fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 14 },
  primaryButton: { height: 48, borderRadius: 12, backgroundColor: "#1857A6", justifyContent: "center", marginBottom: 26 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  quickServicesHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  quickServices: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  quickServicesHint: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  servicesContainer: { flexDirection: "row", gap: 10, marginTop: 14 },
  serviceCard: {
    flex: 1,
    minHeight: 124,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderColor: "#E4E7EC",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  serviceCardPressed: { backgroundColor: "#F7FAFE", transform: [{ scale: 0.98 }] },
  iconHolder: {
    width: 48,
    height: 48,
    backgroundColor: "#EAF2FD",
    borderColor: "#D5E4F7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 15,
    marginBottom: 10,
  },
  serviceText: { color: "#102A43", fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  serviceHelper: { color: "#667085", fontSize: 9, lineHeight: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  recentActivity: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 30, marginBottom: 14 },
  activityContainer: { backgroundColor: "#FFFFFF", borderColor: "#D0D5DD", borderWidth: 1, minHeight: 100, borderRadius: 14, paddingHorizontal: 16, gap: 6, justifyContent: "center" },
  activity: { color: "#102A43", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  activityStatus: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  activityDetails: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bottomNav: { marginTop: "auto", height: 64, borderTopWidth: 1, borderTopColor: "#E4E7EC", flexDirection: "row", marginHorizontal: -24 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navText: { color: "#98A2B3", fontFamily: "Inter_400Regular", fontSize: 10 },
  navTextActive: { color: "#1857A6", fontFamily: "Inter_600SemiBold" },
});
