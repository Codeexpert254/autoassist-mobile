import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import {
  getConnectionContact,
  getConnectionPayment,
  getDispatchRequest,
  getMechanicActiveRepairs,
} from "@/services/dispatch-backend";
import { updateRepairStatus } from "@/services/repair-backend";

export default function JobDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const parameterRequestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const { user, profile } = useAuth();
  const { refreshBackend } = useRepairFlow();

  const [requestId, setRequestId] = useState<string | null>(parameterRequestId ?? null);
  const [request, setRequest] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!user || profile?.role !== "mechanic") {
      setError("A Mechanic account is required.");
      setLoading(false);
      return;
    }

    try {
      let id = requestId;
      if (!id) {
        const repairs = await getMechanicActiveRepairs(user.id);
        if (repairs.error) throw repairs.error;
        id = repairs.data?.[0]?.id ?? null;
        if (id) setRequestId(id);
      }

      if (!id) {
        setRequest(null);
        setLoading(false);
        return;
      }

      const [requestResult, paymentResult] = await Promise.all([
        getDispatchRequest(id),
        getConnectionPayment(id),
      ]);
      if (requestResult.error) throw requestResult.error;
      if (paymentResult.error) throw paymentResult.error;
      setRequest(requestResult.data);
      setPayment(paymentResult.data);

      if (paymentResult.data?.status === "paid" && requestResult.data?.contact_unlocked_at) {
        const connection = await getConnectionContact(id);
        setContact(connection?.contact ?? null);
      } else {
        setContact(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the current assignment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 8000);
    return () => clearInterval(timer);
  }, [requestId, user?.id]);

  const changeStatus = async (status: "en-route" | "arrived") => {
    if (!requestId || updating) return;
    setUpdating(true);
    setError("");
    try {
      const result = await updateRepairStatus(requestId, status);
      if (result.error) throw result.error;
      await refreshBackend();
      await load();
      if (status === "arrived") {
        router.push("/mechanic/inspection");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update this repair status.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ActivityIndicator color="#1857A6" />
          <Text style={styles.helper}>Loading current assignment…</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.emptyCard}>
              <SymbolView name="wrench.and.screwdriver" size={28} tintColor="#1857A6" />
              <Text style={styles.emptyTitle}>No active assignment</Text>
              <Text style={styles.emptyText}>Return to your dashboard and go available when you are ready for another request.</Text>
              <Pressable style={styles.primaryButton} onPress={() => router.replace("/mechanic/dashboard")}>
                <Text style={styles.primaryText}>Return to dashboard</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const status = String(request.status);
  const paid = payment?.status === "paid" && Boolean(request.contact_unlocked_at);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/mechanic/dashboard")}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Current assignment</Text>
            <Text style={styles.subtitle}>Customer details unlock only after the AutoAssist connection is paid.</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.requestCard}>
            <Text style={styles.eyebrow}>SERVICE REQUEST</Text>
            <Text style={styles.problemTitle}>{request.symptom}</Text>
            <Text style={styles.problemText}>{request.description}</Text>
            <Detail label="General service location" value={request.location_text} />
            <Detail label="Preferred time" value={request.preferred_time} />
            <Detail label="Status" value={status.replace(/-/g, " ")} />
          </View>

          {!paid ? (
            <View style={styles.lockCard}>
              <SymbolView name="lock.fill" size={25} tintColor="#8A5200" />
              <Text style={styles.lockTitle}>Waiting for KES 500 connection fee</Text>
              <Text style={styles.lockText}>
                You have accepted the request. AutoAssist is waiting for the motorist to complete the connection payment. Their phone number and exact contact details remain locked until Safaricom confirms payment.
              </Text>
              <ActivityIndicator color="#8A5200" style={{ marginTop: 12 }} />
            </View>
          ) : (
            <View style={styles.contactCard}>
              {payment?.provider === "sandbox_simulator" ? (
                <View style={styles.testBanner}>
                  <Text style={styles.testBannerText}>SANDBOX TEST PAYMENT — No real M-PESA money was collected.</Text>
                </View>
              ) : null}
              <View style={styles.successHeading}>
                <SymbolView name="checkmark.shield.fill" size={25} tintColor="#1B8A5A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactTitle}>Connection confirmed</Text>
                  <Text style={styles.contactSubtitle}>
                    {payment?.provider === "sandbox_simulator"
                      ? "Test connection unlocked to verify the repair journey."
                      : "You can now coordinate directly with the motorist."}
                  </Text>
                </View>
              </View>
              <Detail label="Customer" value={contact?.name || "Motorist"} />
              <Detail label="Phone" value={contact?.phone || "Not provided"} />
              <Detail label="Service location" value={contact?.serviceLocation || request.location_text} />

              {contact?.phone ? (
                <Pressable style={styles.callButton} onPress={() => void Linking.openURL(`tel:${contact.phone}`)}>
                  <Text style={styles.callText}>Call customer</Text>
                </Pressable>
              ) : null}

              {status === "connected" ? (
                <Pressable style={styles.primaryButton} disabled={updating} onPress={() => void changeStatus("en-route")}>
                  {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Start journey to customer</Text>}
                </Pressable>
              ) : status === "en-route" ? (
                <Pressable style={styles.primaryButton} disabled={updating} onPress={() => void changeStatus("arrived")}>
                  {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>I have arrived</Text>}
                </Pressable>
              ) : status === "arrived" ? (
                <Pressable style={styles.primaryButton} onPress={() => router.push("/mechanic/inspection")}>
                  <Text style={styles.primaryText}>Start inspection</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.refreshButton} onPress={() => void load()}>
            <Text style={styles.refreshText}>Refresh assignment</Text>
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
  requestCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 16 },
  eyebrow: { color: "#1857A6", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  problemTitle: { color: "#102A43", fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 5 },
  problemText: { color: "#475467", fontSize: 11, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 7, marginBottom: 12 },
  detailRow: { borderTopWidth: 1, borderTopColor: "#EAECF0", paddingVertical: 10 },
  detailLabel: { color: "#667085", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" },
  detailValue: { color: "#102A43", fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3, textTransform: "capitalize" },
  lockCard: { alignItems: "center", backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F5D48A", borderRadius: 15, padding: 18, marginTop: 15 },
  lockTitle: { color: "#8A5200", fontSize: 14, textAlign: "center", fontFamily: "Inter_600SemiBold", marginTop: 9 },
  lockText: { color: "#667085", fontSize: 10, lineHeight: 16, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 6 },
  contactCard: { borderWidth: 1, borderColor: "#B7E4CB", backgroundColor: "#F4FBF7", borderRadius: 15, padding: 16, marginTop: 15 },
  successHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  contactTitle: { color: "#176B45", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  contactSubtitle: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 2 },
  callButton: { minHeight: 43, borderRadius: 10, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 10, backgroundColor: "#FFFFFF" },
  callText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  primaryButton: { minHeight: 48, borderRadius: 11, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 10 },
  primaryText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  errorText: { color: "#D9363E", backgroundColor: "#FFF1F2", borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 14 },
  refreshButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 14 },
  refreshText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyCard: { alignItems: "center", borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 24 },
  emptyTitle: { color: "#102A43", fontSize: 15, textAlign: "center", fontFamily: "Inter_600SemiBold", marginTop: 10 },
  emptyText: { color: "#667085", fontSize: 11, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 6 },
});
