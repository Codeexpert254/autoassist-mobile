import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatKES, useDemoApp } from "@/context/demo-app-context";

const groups = [
  {
    title: "Start",
    items: [
      ["Onboarding", "/onboarding"],
      ["Login", "/login"],
      ["Register", "/register"],
      ["Role selection", "/roleselection"],
    ],
  },
  {
    title: "Motorist",
    items: [
      ["Home", "/motorist/home"],
      ["Describe problem", "/motorist/describe-problem"],
      ["Preliminary estimate", "/motorist/preliminary-estimate"],
      ["Mechanic results", "/motorist/mechanic-results"],
      ["Confirm request", "/motorist/confirm-request"],
      ["Repair progress", "/motorist/repair-progress"],
      ["Service payment", "/motorist/service-payment"],
      ["Spare parts", "/motorist/spare-parts"],
      ["Parts checkout", "/motorist/parts-checkout"],
      ["Request towing", "/motorist/request-towing"],
      ["History", "/motorist/history"],
      ["Add vehicle", "/motorist/addavehicle"],
    ],
  },
  {
    title: "Mechanic",
    items: [
      ["Registration", "/mechanic/registration"],
      ["Verification", "/mechanic/verification"],
      ["Dashboard", "/mechanic/dashboard"],
      ["Job offer", "/mechanic/job-offer"],
      ["Inspection", "/mechanic/inspection"],
      ["Create quote", "/mechanic/create-quote"],
      ["Awaiting approval", "/mechanic/awaiting-approval"],
      ["Work progress", "/mechanic/work-progress"],
      ["Complete job", "/mechanic/complete-job"],
      ["Earnings", "/mechanic/earnings"],
    ],
  },
  {
    title: "Parts dealer",
    items: [
      ["Registration", "/partsdealer/registration"],
      ["Verification", "/partsdealer/verification"],
      ["Dashboard", "/partsdealer/dashboard"],
      ["Inventory", "/partsdealer/inventory"],
      ["Orders", "/partsdealer/orders"],
      ["Prepare order", "/partsdealer/prepare-order"],
      ["Rider handoff", "/partsdealer/rider-handoff"],
      ["Sales", "/partsdealer/sales"],
    ],
  },
  {
    title: "Rider",
    items: [
      ["Registration", "/rider/registration"],
      ["Verification", "/rider/verification"],
      ["Dashboard", "/rider/dashboard"],
      ["Delivery offer", "/rider/delivery-offer"],
      ["Pickup verification", "/rider/pickup-verification"],
      ["Active delivery", "/rider/active-delivery"],
      ["Delivery complete", "/rider/delivery-complete"],
      ["Earnings", "/rider/earnings"],
    ],
  },
  {
    title: "Towing",
    items: [
      ["Registration", "/towing/registration"],
      ["Verification", "/towing/verification"],
      ["Dashboard", "/towing/dashboard"],
      ["Tow offer", "/towing/tow-offer"],
      ["En route", "/towing/en-route"],
      ["Vehicle secured", "/towing/vehicle-secured"],
      ["Active tow", "/towing/active-tow"],
      ["Complete tow", "/towing/complete-tow"],
      ["Earnings", "/towing/earnings"],
    ],
  },
  {
    title: "Admin / Operations",
    items: [
      ["Overview", "/admin/overview"],
      ["Verification queue", "/admin/verification-queue"],
      ["Live dispatch", "/admin/live-dispatch"],
      ["Orders & deliveries", "/admin/orders-deliveries"],
      ["Payments & payouts", "/admin/payments-payouts"],
      ["Support & disputes", "/admin/support-disputes"],
      ["User management", "/admin/user-management"],
      ["Analytics", "/admin/analytics"],
    ],
  },
  {
    title: "Shared",
    items: [
      ["Messages", "/messages"],
      ["Notifications", "/notifications"],
      ["Profile", "/profile"],
      ["Wallet", "/wallet"],
      ["Help center", "/shared/help-center"],
      ["Payments", "/shared/payment-methods"],
      ["Security", "/shared/security"],
      ["Privacy", "/shared/privacy-permissions"],
    ],
  },
];

export default function Preview() {
  const router = useRouter();
  const { state, resetDemo } = useDemoApp();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>AutoAssist functional demo</Text>
          <Text style={styles.subtitle}>Jump to any flow and keep shared demo state across roles.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>LIVE DEMO STATE</Text>
            <Pressable onPress={resetDemo}>
              <Text style={styles.reset}>Reset</Text>
            </Pressable>
          </View>
          <Text style={styles.statusLine}>Role: {state.role}</Text>
          <Text style={styles.statusLine}>Wallet: {formatKES(state.walletBalance)}</Text>
          <Text style={styles.statusLine}>Repair: {state.mechanicRequestStatus}</Text>
          <Text style={styles.statusLine}>Parts: {state.partsOrderStatus}</Text>
          <Text style={styles.statusLine}>Tow: {state.towStatus}</Text>
        </View>

        {groups.map((group) => (
          <View style={styles.group} key={group.title}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.grid}>
              {group.items.map(([label, route]) => (
                <Pressable key={route} style={styles.card} onPress={() => router.push(route as never)}>
                  <Text style={styles.cardText}>{label}</Text>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#E4E7EC" },
  backButton: { width: 32, height: 36, justifyContent: "center" },
  backText: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 28 },
  headerCopy: { flex: 1 },
  title: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 21 },
  subtitle: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 5 },
  content: { padding: 20, paddingBottom: 42 },
  statusCard: { borderRadius: 14, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#EAF2FD", padding: 16, marginBottom: 28, gap: 5 },
  statusHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  statusTitle: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  reset: { color: "#D9363E", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  statusLine: { color: "#344054", fontFamily: "Inter_400Regular", fontSize: 11, textTransform: "capitalize" },
  group: { marginBottom: 28 },
  groupTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 12 },
  grid: { gap: 9 },
  card: { minHeight: 50, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 12, paddingHorizontal: 14, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center" },
  cardText: { flex: 1, color: "#344054", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  arrow: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 20 },
});
