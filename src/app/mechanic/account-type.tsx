import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const options = [
  {
    key: "individual",
    title: "Individual mechanic",
    subtitle: "Work under your own name. Verification uses your National ID.",
    icon: { ios: "person.crop.circle.fill", android: "person", web: "person" },
  },
  {
    key: "garage",
    title: "Garage / business",
    subtitle: "Register a garage or repair business. Verification uses a valid business permit.",
    icon: { ios: "building.2.fill", android: "store", web: "store" },
  },
] as const;

export default function MechanicAccountType() {
  const router = useRouter();

  const chooseType = (providerType: "individual" | "garage") => {
    router.push({ pathname: "/register", params: { role: "mechanic", providerType } });
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>MECHANIC ACCOUNT</Text>
            <Text style={styles.title}>How are you registering?</Text>
            <Text style={styles.subtitle}>
              Choose the option that matches how you provide repair services.
            </Text>
          </View>
        </View>

        <View style={styles.list}>
          {options.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => chooseType(option.key)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.iconHolder}>
                <SymbolView name={option.icon} size={28} tintColor="#1857A6" />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Why this matters</Text>
          <Text style={styles.noteText}>
            Individual mechanics and registered garages use different verification documents, but both receive jobs through the same mechanic dashboard after approval.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 20, marginBottom: 28 },
  backButton: { width: 36, minHeight: 38, justifyContent: "center" },
  backText: { color: "#102A43", fontSize: 28, lineHeight: 32, fontFamily: "Inter_600SemiBold" },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#1857A6", fontSize: 10, letterSpacing: 0.9, fontFamily: "Inter_600SemiBold", marginBottom: 7 },
  title: { color: "#102A43", fontSize: 23, lineHeight: 29, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginTop: 8 },
  list: { gap: 14 },
  card: { minHeight: 110, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: "#FFFFFF" },
  cardPressed: { borderColor: "#B8D2F0", backgroundColor: "#F5F9FE" },
  iconHolder: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#EAF2FD", borderWidth: 1, borderColor: "#D5E4F7", alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1 },
  cardTitle: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardSubtitle: { color: "#667085", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 5 },
  chevron: { color: "#1857A6", fontSize: 26, lineHeight: 28 },
  note: { marginTop: 24, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E4E7EC", padding: 14 },
  noteTitle: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  noteText: { color: "#667085", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 5 },
});
