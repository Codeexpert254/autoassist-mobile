import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.homeContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heading}>
          <Text style={styles.subTitle}>Good afternoon</Text>
          <Pressable onPress={() => router.push("/preview")}>
            <Text style={styles.previewLink}>Preview</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Abraham</Text>

        <Pressable style={styles.vehicleContainer} onPress={() => router.push("/motorist/vehicle-details")}>
          <Text style={styles.vehicle}>MY VEHICLE</Text>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleModel}>Toyota Fielder</Text>
            <Image source={require("../../../assets/images/left-arrow.png")} style={styles.vehicleArrow} />
          </View>
          <Text style={styles.vehicleReg}>2015 • KDA XXX X</Text>
        </Pressable>

        <Text style={styles.helpTitle}>What do you need help with?</Text>

        <Pressable style={styles.primaryButton} onPress={() => router.push("/motorist/describe-problem")}>
          <Text style={styles.primaryButtonText}>Describe a car problem</Text>
        </Pressable>

        <Text style={styles.quickServices}>Quick services</Text>
        <View style={styles.servicesContainer}>
          <ServiceCard label="MECHANIC" icon={require("../../../assets/images/mechanicicon.png")} onPress={() => router.push("/motorist/mechanic-results")} />
          <ServiceCard label="PARTS" icon={require("../../../assets/images/partsicon.png")} onPress={() => router.push("/motorist/spare-parts")} />
          <ServiceCard label="TOWING" icon={require("../../../assets/images/towingicon.png")} onPress={() => router.push("/motorist/request-towing")} />
        </View>

        <Text style={styles.recentActivity}>Recent activity</Text>
        <Pressable style={styles.activityContainer} onPress={() => router.push("/motorist/history")}>
          <Text style={styles.activity}>Brake inspection</Text>
          <Text style={styles.activityStatus}>Completed • Nairobi Auto Care</Text>
          <Text style={styles.activityDetails}>View job details</Text>
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

function ServiceCard({ label, icon, onPress }: { label: string; icon: number; onPress: () => void }) {
  return (
    <Pressable style={styles.serviceCard} onPress={onPress}>
      <View style={styles.iconHolder}>
        <Image style={styles.serviceIcon} source={icon} />
      </View>
      <Text style={styles.serviceText}>{label}</Text>
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
  vehicleContainer: { backgroundColor: "#123D76", minHeight: 105, padding: 16, gap: 10, borderRadius: 14, marginBottom: 35 },
  vehicleInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vehicle: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  vehicleModel: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  vehicleReg: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_400Regular" },
  vehicleArrow: { width: 10, height: 10, transform: [{ scaleX: -1 }], tintColor: "#FFFFFF" },
  helpTitle: { color: "#102A43", fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 14 },
  primaryButton: { height: 48, borderRadius: 12, backgroundColor: "#1857A6", justifyContent: "center", marginBottom: 28 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  quickServices: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  servicesContainer: { flexDirection: "row", gap: 10, marginTop: 16 },
  serviceCard: { flex: 1, minHeight: 92, borderRadius: 14, backgroundColor: "#FFFFFF", borderColor: "#D0D5DD", borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  iconHolder: { width: 42, height: 32, backgroundColor: "#EAF2FD", borderColor: "#D0D5DD", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 9 },
  serviceIcon: { height: 24, width: 24 },
  serviceText: { color: "#344054", fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  recentActivity: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 38, marginBottom: 16 },
  activityContainer: { backgroundColor: "#FFFFFF", borderColor: "#D0D5DD", borderWidth: 1, minHeight: 105, borderRadius: 14, paddingHorizontal: 16, gap: 6, justifyContent: "center" },
  activity: { color: "#102A43", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  activityStatus: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  activityDetails: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bottomNav: { marginTop: "auto", height: 64, borderTopWidth: 1, borderTopColor: "#E4E7EC", flexDirection: "row", marginHorizontal: -24 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navText: { color: "#98A2B3", fontFamily: "Inter_400Regular", fontSize: 10 },
  navTextActive: { color: "#1857A6", fontFamily: "Inter_600SemiBold" },
});
