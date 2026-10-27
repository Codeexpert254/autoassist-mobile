import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
      ["Mechanic profile", "/motorist/mechanic-profile"],
      ["Confirm request", "/motorist/confirm-request"],
      ["Spare parts", "/motorist/spare-parts"],
      ["Part details", "/motorist/part-details"],
      ["Parts checkout", "/motorist/parts-checkout"],
      ["Request towing", "/motorist/request-towing"],
      ["History", "/motorist/history"],
      ["Vehicle details", "/motorist/vehicle-details"],
    ],
  },
  {
    title: "Mechanic",
    items: [
      ["Registration", "/mechanic/registration"],
      ["Verification", "/mechanic/verification"],
      ["Dashboard", "/mechanic/dashboard"],
      ["Job offer", "/mechanic/job-offer"],
      ["Job details", "/mechanic/job-details"],
      ["Inspection", "/mechanic/inspection"],
      ["Create quote", "/mechanic/create-quote"],
      ["Work progress", "/mechanic/work-progress"],
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
      ["Active delivery", "/rider/active-delivery"],
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
      ["Active tow", "/towing/active-tow"],
      ["Earnings", "/towing/earnings"],
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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>AutoAssist preview</Text>
          <Text style={styles.subtitle}>Jump directly to any flow while we build functionality.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {groups.map((group) => (
          <View style={styles.group} key={group.title}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.grid}>
              {group.items.map(([label, route]) => (
                <Pressable
                  key={route}
                  style={styles.card}
                  onPress={() => router.push(route as never)}
                >
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
  group: { marginBottom: 28 },
  groupTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 12 },
  grid: { gap: 9 },
  card: { minHeight: 50, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 12, paddingHorizontal: 14, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center" },
  cardText: { flex: 1, color: "#344054", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  arrow: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 20 },
});
