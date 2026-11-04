import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRepairFlow } from "@/context/repair-flow-context";
import { getConnectionContact, getConnectionPayment, getDispatchRequest } from "@/services/dispatch-backend";

export default function MechanicAssigned() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const { state } = useRepairFlow();
  const parameterRequestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const requestId = parameterRequestId ?? state.requestId ?? undefined;

  const [request, setRequest] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!requestId || requestId.startsWith("REP-")) {
      setError("No live mechanic connection is available for this request.");
      setLoading(false);
      return;
    }

    setError("");
    try {
      const [requestResult, paymentResult] = await Promise.all([
        getDispatchRequest(requestId),
        getConnectionPayment(requestId),
      ]);
      if (requestResult.error) throw requestResult.error;
      if (paymentResult.error) throw paymentResult.error;
      setRequest(requestResult.data);
      setPayment(paymentResult.data);

      const result = await getConnectionContact(requestId);
      setContact(result?.contact ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load mechanic connection details.");
      setContact(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    if (!requestId) return;
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, [requestId]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ActivityIndicator color="#1857A6" />
          <Text style={styles.helper}>Loading your mechanic connection…</Text>
        </SafeAreaView>
      </View>
    );
  }

  const locked = !contact;
  const statusLabel = String(request?.status ?? "connected").replace(/-/g, " ");

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/motorist/home")}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Your mechanic connection</Text>
            <Text style={styles.subtitle}>AutoAssist keeps this connection tied to your repair request.</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {locked ? (
            <View style={styles.lockedCard}>
              <View style={styles.iconCircle}>
                <SymbolView name="lock.fill" size={28} tintColor="#1857A6" />
              </View>
              <Text style={styles.lockedTitle}>Connection details are still locked</Text>
              <Text style={styles.lockedText}>{error || "Complete the KES 500 AutoAssist connection fee to unlock your assigned mechanic’s contact details."}</Text>
              {requestId ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.replace({ pathname: "/motorist/connection-payment", params: { requestId } })}
                >
                  <Text style={styles.primaryText}>Go to connection payment</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.successCard}>
                <View style={styles.iconCircleGreen}>
                  <SymbolView name="checkmark.shield.fill" size={29} tintColor="#1B8A5A" />
                </View>
                <Text style={styles.successTitle}>Connection confirmed</Text>
                <Text style={styles.successText}>
                  {payment?.provider === "sandbox_simulator"
                    ? "TEST CONNECTION — A KES 500 payment was simulated. No actual M-PESA money was collected."
                    : "The KES 500 AutoAssist connection fee is confirmed. You and the mechanic can now coordinate this repair."}
                </Text>
              </View>

              {payment?.provider === "sandbox_simulator" ? (
                <View style={styles.testBanner}>
                  <Text style={styles.testBannerText}>SANDBOX TEST ONLY — No real payment was made.</Text>
                </View>
              ) : null}

              <View style={styles.mechanicCard}>
                <Text style={styles.eyebrow}>ASSIGNED MECHANIC</Text>
                <Text style={styles.mechanicName}>{contact.name || "Verified mechanic"}</Text>
                {contact.contactPerson && contact.contactPerson !== contact.name ? (
                  <Text style={styles.contactPerson}>Contact: {contact.contactPerson}</Text>
                ) : null}
                <View style={styles.ratingRow}>
                  <SymbolView name="star.fill" size={15} tintColor="#D98200" />
                  <Text style={styles.ratingText}>{Number(contact.rating ?? 0) > 0 ? Number(contact.rating).toFixed(1) : "New"}</Text>
                  {Number(contact.reviews ?? 0) > 0 ? <Text style={styles.reviewText}>• {contact.reviews} reviews</Text> : null}
                  <Text style={styles.verifiedText}>• Verified</Text>
                </View>
                <Detail label="Phone" value={contact.phone || "Not provided"} />
                <Detail label="Service base" value={contact.location || "Not provided"} />
                <Detail label="Request status" value={statusLabel} />

                {contact.phone ? (
                  <Pressable style={styles.primaryButton} onPress={() => void Linking.openURL(`tel:${contact.phone}`)}>
                    <Text style={styles.primaryText}>Call mechanic</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.noteCard}>
                <Text style={styles.noteTitle}>Repair pricing is separate</Text>
                <Text style={styles.noteText}>
                  {payment?.provider === "sandbox_simulator"
                    ? "This is an end-to-end service-flow test. No KES 500 fee was charged. In a live service, the actual connection fee is separate from repair labour and parts."
                    : "The KES 500 fee pays AutoAssist for making the verified connection. The mechanic will inspect the vehicle and send the repair labour/parts quote separately."}
                </Text>
              </View>
            </>
          )}

          <Pressable style={styles.refreshButton} onPress={() => void load()}>
            <Text style={styles.refreshText}>Refresh connection status</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  testBanner: { borderRadius: 10, backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F5D48A", padding: 12, marginBottom: 12 },
  testBannerText: { color: "#8A5200", fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
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
  content: { padding: 20, paddingBottom: 34 },
  lockedCard: { alignItems: "center", borderRadius: 18, backgroundColor: "#F5F9FE", borderWidth: 1, borderColor: "#B8D2F0", padding: 24 },
  iconCircle: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  lockedTitle: { color: "#102A43", fontSize: 16, textAlign: "center", fontFamily: "Inter_600SemiBold", marginTop: 12 },
  lockedText: { color: "#667085", fontSize: 11, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 6 },
  successCard: { alignItems: "center", borderRadius: 16, backgroundColor: "#F4FBF7", borderWidth: 1, borderColor: "#B7E4CB", padding: 18, marginBottom: 15 },
  iconCircleGreen: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  successTitle: { color: "#176B45", fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 9 },
  successText: { color: "#667085", fontSize: 10, lineHeight: 16, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 5 },
  mechanicCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 16 },
  eyebrow: { color: "#1857A6", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  mechanicName: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold", marginTop: 5 },
  contactPerson: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 9, marginBottom: 10 },
  ratingText: { color: "#475467", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  reviewText: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular" },
  verifiedText: { color: "#1B8A5A", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  detailRow: { borderTopWidth: 1, borderTopColor: "#EAECF0", paddingVertical: 10 },
  detailLabel: { color: "#667085", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" },
  detailValue: { color: "#102A43", fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3, textTransform: "capitalize" },
  primaryButton: { minHeight: 47, borderRadius: 11, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 16, alignSelf: "stretch" },
  primaryText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  noteCard: { backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F5D48A", borderRadius: 13, padding: 14, marginTop: 14 },
  noteTitle: { color: "#8A5200", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  noteText: { color: "#667085", fontSize: 10, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  refreshButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 14 },
  refreshText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
