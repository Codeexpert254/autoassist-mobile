import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRepairFlow } from "@/context/repair-flow-context";

export default function MechanicResultsFunctional() {
  const router = useRouter();
  const {
    state,
    mechanics,
    selectMechanic,
    backendLoading,
    backendError,
    liveBackend,
    refreshBackend,
  } = useRepairFlow();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Mechanics near you</Text>
            <Text style={styles.subtitle}>
              {state.vehicleSaved
                ? `Matched for ${state.problem.symptom.toLowerCase()} • ${state.vehicle.make} ${state.vehicle.model}`
                : `Matched for ${state.problem.symptom.toLowerCase()} near your location`}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.matchSummary}>
            <View style={styles.matchIcon}>
              <SymbolView name="checkmark.seal.fill" size={24} tintColor="#1857A6" />
            </View>
            <View style={styles.matchCopy}>
              <Text style={styles.matchTitle}>{liveBackend ? "Verified live providers" : "Demo provider matches"}</Text>
              <Text style={styles.matchText}>
                {liveBackend
                  ? state.vehicleSaved
                    ? "Only mechanics approved on AutoAssist appear in this list. Vehicle details help refine compatibility."
                    : "Only mechanics approved on AutoAssist appear in this list. Add vehicle details later if you want more precise compatibility matching."
                  : "Developer Preview uses sample mechanics so the full journey remains testable."}
              </Text>
            </View>
          </View>

          {backendLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color="#1857A6" />
              <Text style={styles.stateText}>Finding verified mechanics…</Text>
            </View>
          ) : null}

          {backendError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Couldn’t refresh mechanic matches</Text>
              <Text style={styles.errorText}>{backendError}</Text>
              <Pressable style={styles.retryButton} onPress={() => void refreshBackend()}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!backendLoading && mechanics.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <SymbolView name="wrench.and.screwdriver" size={28} tintColor="#1857A6" />
              </View>
              <Text style={styles.emptyTitle}>No verified mechanics available yet</Text>
              <Text style={styles.emptyText}>
                Your request details are saved. A mechanic must complete provider registration and be verified before they can receive live customer jobs.
              </Text>
              <Pressable style={styles.secondaryButton} onPress={() => router.replace("/motorist/home")}>
                <Text style={styles.secondaryText}>Return home</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.list}>
            {mechanics.map((mechanic, index) => (
              <Pressable
                key={mechanic.id}
                onPress={() => {
                  selectMechanic(mechanic.id);
                  router.push("/motorist/mechanic-profile");
                }}
                style={({ pressed }) => [styles.card, index === 0 && styles.topCard, pressed && styles.cardPressed]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <SymbolView name="wrench.adjustable" size={24} tintColor="#1857A6" />
                  </View>
                  <View style={styles.cardHeading}>
                    <View style={styles.nameRow}>
                      <Text style={styles.mechanicName}>{mechanic.name}</Text>
                      {mechanic.live ? <SymbolView name="checkmark.seal.fill" size={16} tintColor="#1B8A5A" /> : null}
                    </View>
                    <Text style={styles.location}>{mechanic.location || `${mechanic.distanceKm} km away`}</Text>
                  </View>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>{mechanic.match}%</Text>
                  </View>
                </View>

                <View style={styles.specialties}>
                  {mechanic.specialties.slice(0, 3).map((specialty) => (
                    <View key={specialty} style={styles.chip}>
                      <Text style={styles.chipText}>{specialty}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <SymbolView name="star.fill" size={14} tintColor="#D98200" />
                    <Text style={styles.metaText}>{mechanic.rating > 0 ? mechanic.rating.toFixed(1) : "New"}</Text>
                  </View>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.metaText}>{mechanic.reviews} reviews</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.verifiedText}>{mechanic.live ? "Verified" : "Demo"}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#EAECF0" },
  backButton: { width: 34, minHeight: 38, justifyContent: "center" },
  backText: { color: "#102A43", fontSize: 28, lineHeight: 32, fontFamily: "Inter_600SemiBold" },
  headerCopy: { flex: 1 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  content: { padding: 20, paddingBottom: 34 },
  matchSummary: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "#EAF2FD", borderWidth: 1, borderColor: "#B8D2F0", marginBottom: 18 },
  matchIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  matchCopy: { flex: 1 },
  matchTitle: { color: "#102A43", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  matchText: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  centerState: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: 10 },
  stateText: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  errorCard: { borderWidth: 1, borderColor: "#F3C5C9", backgroundColor: "#FFF1F2", borderRadius: 12, padding: 14, marginBottom: 14 },
  errorTitle: { color: "#A12830", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  errorText: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 5 },
  retryButton: { marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#D9363E" },
  retryText: { color: "#D9363E", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyCard: { alignItems: "center", borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 16, padding: 24, marginTop: 8 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#EAF2FD", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: "#102A43", fontSize: 15, textAlign: "center", fontFamily: "Inter_600SemiBold" },
  emptyText: { color: "#667085", fontSize: 11, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 7 },
  secondaryButton: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", alignSelf: "stretch", marginTop: 18 },
  secondaryText: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { gap: 12 },
  card: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 16, backgroundColor: "#FFFFFF" },
  topCard: { borderColor: "#B8D2F0", backgroundColor: "#F9FBFE" },
  cardPressed: { opacity: 0.82 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#EAF2FD", alignItems: "center", justifyContent: "center" },
  cardHeading: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  mechanicName: { color: "#102A43", fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  location: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  matchBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "#EAF7F1" },
  matchBadgeText: { color: "#1B8A5A", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  specialties: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  chip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "#F2F4F7" },
  chipText: { color: "#475467", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular" },
  dot: { color: "#D0D5DD", fontSize: 10 },
  verifiedText: { color: "#1B8A5A", fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
