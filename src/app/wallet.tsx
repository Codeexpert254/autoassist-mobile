import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatKES, useDemoApp } from "@/context/demo-app-context";

export default function Wallet() {
  const router = useRouter();
  const { state } = useDemoApp();

  return (
    <View style={styles.walletContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image source={require("../../assets/images/left-arrow.png")} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.title}>Wallet & transactions</Text>
        </View>
        <Text style={styles.subTitle}>Payments, earnings and refunds across AutoAssist.</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>DEMO BALANCE</Text>
          <Text style={styles.balanceAmount}>{formatKES(state.walletBalance)}</Text>
          <Text style={styles.balanceMeta}>{state.paymentMethod}</Text>
        </View>

        <Transaction title="Mechanic service" amount="- KSh 11,650" negative />
        <Transaction title="Rider payout" amount="+ KSh 420" />
        <Transaction title="Parts order refund" amount="+ KSh 1,450" />

        <Pressable
          style={styles.managePaymentButton}
          onPress={() => router.push("/shared/payment-methods")}
        >
          <Text style={styles.managePaymentText}>Manage payment methods</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Transaction({ title, amount, negative }: { title: string; amount: string; negative?: boolean }) {
  return (
    <View style={styles.transaction}>
      <Text style={styles.lineTitle}>{title}</Text>
      <Text style={[styles.lineAmount, negative ? styles.negative : styles.positive]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  walletContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 20, gap: 12, flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backIcon: { width: 14, height: 14 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subTitle: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 24 },
  balanceCard: { minHeight: 132, borderRadius: 16, backgroundColor: "#123D76", justifyContent: "center", gap: 10, padding: 18, marginBottom: 36 },
  balanceLabel: { color: "#DCE9F8", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  balanceAmount: { color: "#FFFFFF", fontSize: 28, fontFamily: "Inter_600SemiBold" },
  balanceMeta: { color: "#DCE9F8", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  transaction: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: "#E4E7EC", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lineTitle: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  lineAmount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  positive: { color: "#1B8A5A" },
  negative: { color: "#D9363E" },
  managePaymentButton: { height: 48, borderColor: "#1857A6", borderWidth: 1, borderRadius: 10, backgroundColor: "#FFFFFF", justifyContent: "center", marginTop: "auto", marginBottom: 24 },
  managePaymentText: { color: "#1857A6", fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
});
