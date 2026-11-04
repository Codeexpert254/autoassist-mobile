import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import {
  checkConnectionPayment,
  getConnectionPayment,
  getDispatchRequest,
  initiateConnectionPayment,
} from "@/services/dispatch-backend";

export default function ConnectionPayment() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const { profile } = useAuth();

  const [request, setRequest] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    if (!requestId) {
      setError("Missing repair request.");
      setLoading(false);
      return;
    }
    try {
      const [requestResult, paymentResult] = await Promise.all([
        getDispatchRequest(requestId),
        getConnectionPayment(requestId),
      ]);
      if (requestResult.error) throw requestResult.error;
      if (paymentResult.error) throw paymentResult.error;
      setRequest(requestResult.data);
      setPayment(paymentResult.data);

      if (paymentResult.data?.status === "paid" || requestResult.data?.status === "connected") {
        router.replace({ pathname: "/motorist/mechanic-assigned", params: { requestId } });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the connection payment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [requestId]);

  useEffect(() => {
    if (!requestId || payment?.status !== "pending" || !payment?.checkout_request_id) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [requestId, payment?.status, payment?.checkout_request_id]);

  const checkPaymentStatus = async () => {
    if (!requestId || checking || paying) return;
    setChecking(true);
    setError("");
    setMessage("");
    setStatusNotice("");
    try {
      const result = await checkConnectionPayment(requestId);
      if (result.state === "paid") {
        router.replace({ pathname: "/motorist/mechanic-assigned", params: { requestId } });
        return;
      }
      await load();
      setStatusNotice(result.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to check your M-PESA payment. Try again.");
    } finally {
      setChecking(false);
    }
  };

  const startPayment = async () => {
    if (!requestId || paying || checking) return;
    setPaying(true);
    setError("");
    setMessage("");
    setStatusNotice("");
    try {
      const result = await initiateConnectionPayment(requestId, phone);
      if (result?.state === "paid") {
        router.replace({ pathname: "/motorist/mechanic-assigned", params: { requestId } });
        return;
      }
      setMessage(result?.customerMessage ?? "STK Push sent. Check your phone and enter your M-PESA PIN.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start M-PESA payment.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ActivityIndicator color="#1857A6" />
          <Text style={styles.helper}>Loading connection payment…</Text>
        </SafeAreaView>
      </View>
    );
  }

  const amount = Number(request?.connection_fee_amount ?? payment?.amount ?? 500);
  const status = String(payment?.status ?? "not_started");
  // A pending checkout must be resolved before attempting another payment.
  const checkoutPending = status === "pending" && Boolean(payment?.checkout_request_id);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Connect with your mechanic</Text>
            <Text style={styles.subtitle}>One AutoAssist connection fee before direct contact is unlocked.</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.amountCard}>
            <View style={styles.iconCircle}>
              <SymbolView name="lock.shield.fill" size={29} tintColor="#1857A6" />
            </View>
            <Text style={styles.amountLabel}>AUTOASSIST CONNECTION FEE</Text>
            <Text style={styles.amount}>KES {amount.toLocaleString()}</Text>
            <Text style={styles.amountText}>Paid to AutoAssist for the successful connection. The mechanic’s repair labour and parts are separate.</Text>
          </View>

          <View style={styles.explanationCard}>
            <Text style={styles.cardTitle}>What this unlocks</Text>
            <Text style={styles.cardText}>• Your assigned mechanic’s direct phone/contact details</Text>
            <Text style={styles.cardText}>• The confirmed service connection</Text>
            <Text style={styles.cardText}>• The mechanic’s ability to proceed to your service location</Text>
          </View>

          <Text style={styles.label}>M-PESA phone number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="0712 345 678"
            placeholderTextColor="#98A2B3"
          />
          <Text style={styles.inputHint}>Use the Safaricom number for this payment. Sandbox tests may not send a real phone prompt.</Text>

          {status === "pending" && payment?.checkout_request_id ? (
            <View style={styles.pendingCard}>
              <ActivityIndicator color="#1857A6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Waiting for M-PESA confirmation</Text>
                <Text style={styles.pendingText}>Complete the payment prompt on your phone. AutoAssist will unlock the connection only after Safaricom confirms payment.</Text>
              </View>
            </View>
          ) : null}

          {status === "failed" ? (
            <View style={styles.failedCard}>
              <Text style={styles.failedTitle}>Previous payment attempt was not completed</Text>
              <Text style={styles.failedText}>{payment?.provider_result_message || "You can send a new STK Push below."}</Text>
            </View>
          ) : null}

          {message ? <Text style={styles.successText}>{message}</Text> : null}
          {statusNotice ? (
            <View style={styles.statusNotice}>
              <SymbolView name="info.circle.fill" size={18} tintColor="#1857A6" />
              <Text style={styles.statusNoticeText}>{statusNotice}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, (paying || checking || checkoutPending) && styles.disabledButton]}
            disabled={paying || checking || checkoutPending}
            onPress={() => void startPayment()}
          >
            {paying ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={styles.primaryText}>
                {checkoutPending ? "Payment request in progress" :
                  `Pay KES ${amount.toLocaleString()} with M-PESA`}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.refreshButton, checking && styles.disabledRefreshButton]}
            disabled={checking || paying}
            onPress={() => void checkPaymentStatus()}
            accessibilityRole="button"
            accessibilityLabel="Check M-PESA payment status"
          >
            {checking ? (
              <View style={styles.checkingRow}>
                <ActivityIndicator size="small" color="#1857A6" />
                <Text style={styles.refreshText}>Checking with M-PESA…</Text>
              </View>
            ) : (
              <Text style={styles.refreshText}>I have paid — check status</Text>
            )}
          </Pressable>

          <Text style={styles.securityText}>This button checks M-PESA securely through AutoAssist. Contact details unlock only after a confirmed callback or verified Daraja status result.</Text>
        </ScrollView>
      </SafeAreaView>
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
  content: { padding: 20, paddingBottom: 34 },
  amountCard: { alignItems: "center", borderRadius: 18, backgroundColor: "#F5F9FE", borderWidth: 1, borderColor: "#B8D2F0", padding: 22 },
  iconCircle: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  amountLabel: { color: "#667085", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  amount: { color: "#102A43", fontSize: 32, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  amountText: { color: "#667085", fontSize: 11, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 7 },
  explanationCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, padding: 14, marginTop: 16, marginBottom: 20 },
  cardTitle: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 5 },
  cardText: { color: "#667085", fontSize: 10, lineHeight: 17, fontFamily: "Inter_400Regular" },
  label: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  input: { minHeight: 52, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 14, color: "#344054", fontSize: 14, fontFamily: "Inter_400Regular" },
  inputHint: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 5 },
  pendingCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F5F9FE", borderWidth: 1, borderColor: "#B8D2F0", borderRadius: 12, padding: 13, marginTop: 16 },
  pendingTitle: { color: "#102A43", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pendingText: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 3 },
  failedCard: { backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F5D48A", borderRadius: 12, padding: 13, marginTop: 16 },
  failedTitle: { color: "#8A5200", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  failedText: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 3 },
  successText: { color: "#176B45", backgroundColor: "#EFFAF4", borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 15, marginTop: 14, fontFamily: "Inter_400Regular" },
  errorText: { color: "#D9363E", backgroundColor: "#FFF1F2", borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 15, marginTop: 14, fontFamily: "Inter_400Regular" },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 18, paddingHorizontal: 12 },
  disabledButton: { backgroundColor: "#A9C2DF" },
  primaryText: { color: "#FFFFFF", fontSize: 12, textAlign: "center", fontFamily: "Inter_600SemiBold" },
  refreshButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 10 },
  disabledRefreshButton: { opacity: 0.65 },
  checkingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusNotice: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 10, padding: 12, marginTop: 14, backgroundColor: "#F0F7FF", borderWidth: 1, borderColor: "#B8D2F0" },
  statusNoticeText: { flex: 1, color: "#1857A6", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular" },
  refreshText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  securityText: { color: "#667085", fontSize: 9, lineHeight: 14, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 16 },
});
