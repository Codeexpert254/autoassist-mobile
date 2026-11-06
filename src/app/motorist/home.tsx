import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppText as Text } from "@/components/autoassist-font";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useDemoApp } from "@/context/demo-app-context";
import { repairStatusLabel, useRepairFlow } from "@/context/repair-flow-context";
import { normalizePowerSource } from "@/services/vehicle-backend";
import { ensureJobNotifications } from "@/services/push-notifications";
import { SettingsButton } from "@/components/settings-button";

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
  const { backendEnabled, user, profile, signOut, refreshProfile } = useAuth();
  const [refreshing,setRefreshing]=useState(false);
  const pullRefresh=async()=>{
    if(refreshing)return;
    setRefreshing(true);
    try{if(backendEnabled)await refreshProfile();}catch(error){
      Alert.alert("Unable to refresh",error instanceof Error?error.message:"Try again.");
    }finally{setRefreshing(false);}
  };
  const { state: demoState, logout: demoLogout } = useDemoApp();
  const { state } = useRepairFlow();
  const displayName = profile?.full_name || demoState.user.name;
  const firstName = displayName.split(" ")[0] || "Motorist";
  const vehicleName = `${state.vehicle.make} ${state.vehicle.model}`.trim();
  const hasVehicle = state.vehicleSaved;
  const hasActiveRepair = !["idle", "cancelled", "completed"].includes(state.status);
  const vehiclePowerSource = normalizePowerSource(state.vehicle.powerSource);

  useEffect(() => {
    if (!backendEnabled || !user || profile?.role !== "motorist") return;
    // Register the motorist's phone for the "rate your mechanic" prompt.
    // In-app job status and rating remain available if push is denied.
    void ensureJobNotifications(user.id).catch(() => {
      // Notification opt-out or unavailable push services must not block the app.
    });
  }, [backendEnabled, user?.id, profile?.role]);

  const openVehicle = () => {
    if (hasVehicle) {
      router.push("/motorist/vehicle-details");
      return;
    }
    router.push({ pathname: "/motorist/addavehicle", params: { mode: "add" } });
  };

  const openProblemFlow = () => {
    router.push(hasActiveRepair ? "/motorist/mechanic-assigned" : "/motorist/describe-problem");
  };

  const performLogout = async () => {
    try {
      if (backendEnabled) {
        await signOut();
      }
      demoLogout();
      router.replace("/login");
    } catch (error) {
      Alert.alert(
        "Unable to log out",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "Log out of AutoAssist?",
      "You will need to log in again to access your account.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: () => void performLogout() },
      ],
    );
  };

  return (
    <View style={styles.homeContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void pullRefresh()} tintColor="#1857A6" colors={["#1857A6"]}/>}>
        <View style={styles.heading}>
          <Text style={styles.subTitle}>Good afternoon</Text>
          <View style={styles.headerActions}>
            <SettingsButton />
            {!backendEnabled ? (
              <Pressable onPress={() => router.push("/preview")}>
                <Text style={styles.previewLink}>Preview</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.logoutButton} onPress={confirmLogout}>
              <SymbolView
                name={{ ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" } as never}
                size={16}
                tintColor="#B42318"
              />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.title}>{firstName}</Text>

        <Pressable style={styles.vehicleContainer} onPress={openVehicle}>
          <Text style={styles.vehicle}>{hasVehicle ? "MY VEHICLE" : "ADD A VEHICLE"}</Text>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleModel}>{hasVehicle ? vehicleName : "Set up your vehicle"}</Text>
            <Image source={require("../../../assets/images/left-arrow.png")} style={styles.vehicleArrow} />
          </View>
          <Text style={styles.vehicleReg}>
            {hasVehicle
              ? `${state.vehicle.year} • ${state.vehicle.registration} • ${vehiclePowerSource}`
              : "Optional — add vehicle details anytime for more precise matching"}
          </Text>
        </Pressable>

        <View style={styles.sectionHeading}>
          <View style={styles.sectionMark}/>
          <View style={{flex:1}}>
            <Text style={styles.helpTitle}>How can we help you?</Text>
            <Text style={styles.sectionSub}>Choose the service you need. We\u2019ll guide you through the steps.</Text>
          </View>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={openProblemFlow}
        >
          <Text style={styles.primaryButtonText}>
            {hasActiveRepair ? "View active connection" : "Describe a car problem"}
          </Text>
        </Pressable>

        <Text style={styles.primaryHint}>Not sure what\u2019s wrong? Describe the symptoms and we\u2019ll help you find a mechanic.</Text>

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

        <Pressable accessibilityRole="button" accessibilityLabel="Track your towing service"
          style={({pressed})=>[styles.trackingLink,pressed&&styles.serviceCardPressed]}
          onPress={()=>router.push("/motorist/tow-assigned")}>
          <View style={styles.trackingIcon}>
            <SymbolView name={{ios:"location.fill",android:"location_on",web:"location_on"} as never}
              size={21} tintColor="#1857A6"/>
          </View>
          <View style={{flex:1}}>
            <Text style={styles.trackingTitle}>Track a tow truck</Text>
            <Text style={styles.trackingSubtitle}>See your agent's location and vehicle delivery status</Text>
          </View>
          <SymbolView name={{ios:"chevron.right",android:"chevron_right",web:"chevron_right"} as never}
            size={20} tintColor="#1857A6"/>
        </Pressable>

        <Text style={styles.recentActivity}>{hasActiveRepair ? "Active connection" : "Recent activity"}</Text>
        <Pressable style={styles.activityContainer} onPress={() => router.push(hasActiveRepair ? "/motorist/mechanic-assigned" : "/motorist/history")}>
          <Text style={styles.activity}>{state.requestId ? `Repair ${state.requestId}` : "Repair request"}</Text>
          <Text style={styles.activityStatus}>{repairStatusLabel(state.status)}</Text>
          <Text style={styles.activityDetails}>{hasActiveRepair ? "View service connection" : "View jobs & history"}</Text>
        </Pressable>

        </ScrollView>
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
  homeContainer: { flex: 1, backgroundColor: "#F7F9FC" },
  scroll:{flex:1},
  scrollContent:{paddingBottom:30},
  safeArea: { flex: 1, paddingHorizontal: 24 },
  heading: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  subTitle: { color: "#667085", fontSize: 13, fontFamily: "Inter_400Regular" },
  previewLink: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  logoutButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: "#F4C7C3", backgroundColor: "#FFF5F4", flexDirection: "row", alignItems: "center", gap: 6 },
  logoutText: { color: "#B42318", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  title: { color: "#102A43", fontSize: 23, fontFamily: "Inter_600SemiBold", marginTop: 4, marginBottom: 18 },
  vehicleContainer: { backgroundColor: "#102A43", minHeight: 122, padding: 20, gap: 12, borderRadius: 22, marginBottom: 26 },
  vehicleInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vehicle: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  vehicleModel: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  vehicleReg: { color: "#FFFFFF", fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  vehicleArrow: { width: 10, height: 10, transform: [{ scaleX: -1 }], tintColor: "#FFFFFF" },
  helpTitle: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  sectionHeading:{flexDirection:"row",alignItems:"flex-start",gap:11,marginBottom:15},
  sectionMark:{height:38,width:5,borderRadius:4,backgroundColor:"#1857A6"},
  sectionSub:{fontSize:12,color:"#667085",lineHeight:19,marginTop:4},
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: "#1857A6", justifyContent: "center", marginBottom: 8 },
  primaryHint:{fontSize:11,color:"#667085",lineHeight:18,marginBottom:24},
  trackingLink:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#EDF5FF",
    borderColor:"#D6E7FB",borderWidth:1,borderRadius:16,padding:14,marginTop:16},
  trackingIcon:{width:42,height:42,alignItems:"center",justifyContent:"center",borderRadius:13,backgroundColor:"#FFFFFF"},
  trackingTitle:{fontSize:13,color:"#102A43",fontFamily:"Inter_600SemiBold"},
  trackingSubtitle:{fontSize:11,color:"#61748A",lineHeight:16,marginTop:4},
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
  bottomNav: { minHeight: 64, borderTopWidth: 1, borderTopColor: "#E4E7EC", backgroundColor:"#FFFFFF", flexDirection: "row", marginHorizontal: -24 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navText: { color: "#98A2B3", fontFamily: "Inter_400Regular", fontSize: 10 },
  navTextActive: { color: "#1857A6", fontFamily: "Inter_600SemiBold" },
});
