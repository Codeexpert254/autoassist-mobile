import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";

export default function Security() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>Security</Text>
            <Text style={styles.subtitle}>Manage sign-in and account security.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Signed-in email</Text>
          <Text style={styles.cardValue}>{user?.email ?? "Not available"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Password</Text>
          <Text style={styles.cardText}>
            Password reset and recovery controls will appear here once the AutoAssist recovery deep-link flow is enabled.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Device access</Text>
          <Text style={styles.cardText}>
            Keep your phone lock enabled and sign out of AutoAssist on devices you no longer use.
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
  card: { borderRadius: 14, borderWidth: 1, borderColor: "#E4E7EC", padding: 16, marginBottom: 12 },
  cardTitle: { color: "#102A43", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardValue: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 7 },
  cardText: { color: "#667085", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 7 },
});