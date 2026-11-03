import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentMethods() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>Payment methods</Text>
            <Text style={styles.subtitle}>Manage how you pay for AutoAssist services.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>PRIMARY METHOD</Text>
          <Text style={styles.methodTitle}>M-PESA</Text>
          <Text style={styles.body}>
            AutoAssist connection fees will use M-PESA STK Push once your payment request is ready.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>More methods later</Text>
          <Text style={styles.body}>
            Additional payment methods can be added here as AutoAssist expands its payment options.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 12, paddingBottom: 20 },
  backButton: { width: 34, minHeight: 38, justifyContent: "center" },
  backText: { color: "#102A43", fontSize: 28, lineHeight: 32, fontFamily: "Inter_600SemiBold" },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#F5F9FE", padding: 18 },
  eyebrow: { color: "#1857A6", fontSize: 9, letterSpacing: 0.9, fontFamily: "Inter_600SemiBold" },
  methodTitle: { color: "#102A43", fontSize: 20, fontFamily: "Inter_600SemiBold", marginTop: 6 },
  body: { color: "#667085", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 6 },
  infoCard: { borderRadius: 14, borderWidth: 1, borderColor: "#E4E7EC", padding: 16, marginTop: 14 },
  infoTitle: { color: "#102A43", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});