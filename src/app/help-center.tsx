import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HelpCenter() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>Help & support</Text>
            <Text style={styles.subtitle}>Find guidance for common AutoAssist questions.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How matching works</Text>
          <Text style={styles.cardText}>
            AutoAssist matches motorists with verified, available mechanics using service relevance, distance, rating and reliability.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connection fee</Text>
          <Text style={styles.cardText}>
            The KES 500 AutoAssist connection fee is separate from the mechanic's repair labour and parts quote.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Need more help?</Text>
          <Text style={styles.cardText}>
            In-app support messaging and issue reporting can be added here as the support workflow is finalized.
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
  cardText: { color: "#667085", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 7 },
});