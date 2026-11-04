import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import {
  getMechanicOffer,
  getPendingMechanicOffer,
  respondToMechanicOffer,
} from "@/services/dispatch-backend";

export default function JobOffer() {
  const router = useRouter();
  const params = useLocalSearchParams<{ offerId?: string }>();
  const requestedOfferId = Array.isArray(params.offerId) ? params.offerId[0] : params.offerId;
  const { user, profile } = useAuth();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");

  const loadOffer = async () => {
    if (!user || profile?.role !== "mechanic") return;
    setLoading(true);
    setError("");
    try {
      const result = requestedOfferId
        ? await getMechanicOffer(requestedOfferId)
        : await getPendingMechanicOffer(user.id);
      if (result.error) throw result.error;
      setOffer(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load this request offer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOffer();
  }, [requestedOfferId, user?.id, profile?.role]);

  const respond = async (response: "accept" | "decline") => {
    if (!offer?.id || responding) return;
    setResponding(response);
    setError("");
    try {
      await respondToMechanicOffer(offer.id, response);
      router.replace("/mechanic/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to respond to this request.");
      await loadOffer();
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ActivityIndicator color="#1857A6" />
          <Text style={styles.helper}>Loading matched request…</Text>
        </SafeAreaView>
      </View>
    );
  }

  const request = Array.isArray(offer?.repair_requests) ? offer.repair_requests[0] : offer?.repair_requests;
  const expired = offer?.expires_at ? new Date(offer.expires_at).getTime() <= Date.now() : false;
  const active = offer?.status === "offered" && !expired;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/mechanic/dashboard")}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Matched repair request</Text>
            <Text style={styles.subtitle}>AutoAssist selected you for this customer request.</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!offer || !request ? (
            <View style={styles.emptyCard}>
              <SymbolView name="bell.slash" size={30} tintColor="#1857A6" />
              <Text style={styles.emptyTitle}>No active matched request</Text>
              <Text style={styles.emptyText}>Return to your dashboard and stay available. AutoAssist will notify you when a suitable request is matched.</Text>
              <Pressable style={styles.primaryButton} onPress={() => router.replace("/mechanic/dashboard")}>
                <Text style={styles.primaryText}>Return to dashboard</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.matchCard}>
                <View style={styles.matchIcon}>
                  <SymbolView name="checkmark.seal.fill" size={25} tintColor="#1857A6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchTitle}>{Math.round(Number(offer.match_score ?? 0))}% match</Text>
                  <Text style={styles.matchText}>
                    {offer.distance_km == null ? "Nearby request" : `${Number(offer.distance_km).toFixed(1)} km away`} • verified dispatch
                  </Text>
                </View>
              </View>

              <View style={styles.detailsCard}>
                <Text style={styles.eyebrow}>REPAIR REQUEST</Text>
                <Text style={styles.problemTitle}>{request.symptom}</Text>
                <Text style={styles.problemText}>{request.description}</Text>
                <Row label="Location" value={request.location_text} />
                <Row label="Preferred time" value={request.preferred_time} />
                <Row label="Offer status" value={expired ? "Expired" : String(offer.status)} />
              </View>

              <View style={styles.privacyCard}>
                <Text style={styles.privacyTitle}>Customer details stay protected</Text>
                <Text style={styles.privacyText}>
                  Accepting reserves this request for you. The motorist then pays the KES 500 AutoAssist connection fee. Phone and exact customer contact details unlock only after payment succeeds.
                </Text>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {active ? (
                <View style={styles.actions}>
                  <Pressable
                    style={styles.primaryButton}
                    disabled={Boolean(responding)}
                    onPress={() => void respond("accept")}
                  >
                    {responding === "accept" ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Accept request</Text>}
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    disabled={Boolean(responding)}
                    onPress={() => void respond("decline")}
                  >
                    {responding === "decline" ? <ActivityIndicator color="#1857A6" /> : <Text style={styles.secondaryText}>Decline</Text>}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.expiredCard}>
                  <Text style={styles.expiredTitle}>This offer is no longer active</Text>
                  <Text style={styles.expiredText}>AutoAssist may already be matching the motorist with another available mechanic.</Text>
                  <Pressable style={styles.secondaryButton} onPress={() => router.replace("/mechanic/dashboard")}>
                    <Text style={styles.secondaryText}>Return to dashboard</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 10 },
  helper: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular" },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#EAECF0" },
  backButton: { width: 34, minHeight: 38, justifyContent: "center" },
  backText: { color: "#102A43", fontSize: 28, lineHeight: 32, fontFamily: "Inter_600SemiBold" },
  headerCopy: { flex: 1 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  content: { padding: 20, paddingBottom: 32 },
  matchCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, backgroundColor: "#F5F9FE", borderWidth: 1, borderColor: "#B8D2F0", padding: 14, marginBottom: 14 },
  matchIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  matchTitle: { color: "#102A43", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  matchText: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4 },
  detailsCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 16 },
  eyebrow: { color: "#1857A6", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  problemTitle: { color: "#102A43", fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 6 },
  problemText: { color: "#475467", fontSize: 11, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 7, marginBottom: 14 },
  row: { borderTopWidth: 1, borderTopColor: "#EAECF0", paddingVertical: 10 },
  rowLabel: { color: "#667085", fontSize: 9, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  rowValue: { color: "#102A43", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 3 },
  privacyCard: { backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F5D48A", borderRadius: 13, padding: 14, marginTop: 14 },
  privacyTitle: { color: "#8A5200", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  privacyText: { color: "#667085", fontSize: 10, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 5 },
  errorText: { color: "#D9363E", backgroundColor: "#FFF1F2", borderRadius: 10, padding: 10, fontSize: 11, marginTop: 14, fontFamily: "Inter_400Regular" },
  actions: { marginTop: 4 },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 16 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  secondaryButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryText: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  expiredCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, padding: 15, marginTop: 14 },
  expiredTitle: { color: "#102A43", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  expiredText: { color: "#667085", fontSize: 10, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 5 },
  emptyCard: { alignItems: "center", borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 24 },
  emptyTitle: { color: "#102A43", fontSize: 15, textAlign: "center", fontFamily: "Inter_600SemiBold", marginTop: 12 },
  emptyText: { color: "#667085", fontSize: 11, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 7 },
});
