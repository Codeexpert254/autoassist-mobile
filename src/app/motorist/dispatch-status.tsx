import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import {
  createDispatchRepairRequest,
  dispatchRepairRequest,
  getAssignedMechanic,
  getDispatchRequest,
} from "@/services/dispatch-backend";
import { getOwnedVehicles, updateRepairStatus } from "@/services/repair-backend";

export default function DispatchStatus() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const parameterRequestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const { backendEnabled, user, profile } = useAuth();
  const { state, refreshBackend } = useRepairFlow();
  const creatingRef = useRef(false);

  const [requestId, setRequestId] = useState<string | null>(parameterRequestId ?? null);
  const [request, setRequest] = useState<any>(null);
  const [mechanic, setMechanic] = useState<any>(null);
  const [dispatchMessage, setDispatchMessage] = useState("Preparing your request…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const createRequest = async () => {
    if (!backendEnabled) {
      router.replace("/motorist/mechanic-results");
      return null;
    }
    if (!user || profile?.role !== "motorist") throw new Error("A Motorist account is required.");
    if (creatingRef.current) return null;

    creatingRef.current = true;
    try {
      const vehicles = await getOwnedVehicles(user.id);
      if (vehicles.error) throw vehicles.error;
      const vehicleId = vehicles.data?.[0]?.id ?? null;

      const result = await createDispatchRepairRequest(user.id, {
        vehicleId,
        description: state.problem.description,
        symptom: state.problem.symptom,
        locationText: state.problem.location,
        latitude: state.problem.latitude ?? null,
        longitude: state.problem.longitude ?? null,
        preferredTime: state.problem.preferredTime,
      });
      if (result.error) throw result.error;

      setRequestId(result.data.id);
      setRequest(result.data);
      setDispatchMessage("Finding the best verified mechanic for you…");

      // Keep the shared repair context attached to the same live request so the
      // existing inspection/quote/history lifecycle continues from this dispatch.
      await refreshBackend();

      return result.data.id as string;
    } finally {
      creatingRef.current = false;
    }
  };

  const refresh = async (id: string, forceDispatch = false) => {
    const requestResult = await getDispatchRequest(id);
    if (requestResult.error) throw requestResult.error;
    const liveRequest = requestResult.data;
    setRequest(liveRequest);

    if (liveRequest.mechanic_id) {
      const mechanicResult = await getAssignedMechanic(liveRequest.mechanic_id);
      if (!mechanicResult.error) setMechanic(mechanicResult.data);
    } else {
      setMechanic(null);
    }

    if ((liveRequest.status === "matching" || liveRequest.status === "offered") && !liveRequest.mechanic_id) {
      if (forceDispatch || liveRequest.status === "matching") {
        const result = await dispatchRepairRequest(id);
        if (result?.state === "no_provider") {
          setDispatchMessage("No suitable verified mechanic is available right now. You can keep this request open and retry shortly.");
        } else if (result?.state === "offered") {
          setDispatchMessage("A highly rated nearby mechanic has been notified. Waiting for their response…");
        }
      } else {
        setDispatchMessage("A highly rated nearby mechanic has been notified. Waiting for their response…");
      }
    }
  };

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = async () => {
      setLoading(true);
      setError("");
      try {
        const id = requestId ?? (await createRequest());
        if (!id || !active) return;
        await refresh(id, true);
        if (!active) return;

        timer = setInterval(() => {
          void refresh(id, true).catch((caught) => {
            if (active) setError(caught instanceof Error ? caught.message : "Unable to refresh matching status.");
          });
        }, 15000);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to start mechanic matching.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void start();
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [requestId, backendEnabled, user?.id]);

  const cancel = async () => {
    if (!requestId || cancelling) return;
    setCancelling(true);
    setError("");
    try {
      const result = await updateRepairStatus(requestId, "cancelled");
      if (result.error) throw result.error;
      router.replace("/motorist/home");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel this request.");
    } finally {
      setCancelling(false);
    }
  };

  const status = String(request?.status ?? "matching");
  const accepted = status === "accepted" && Boolean(request?.mechanic_id);
  const connected = ["connected", "en-route", "arrived", "inspected", "quoted", "approved", "repairing", "repair-complete", "paid", "completed"].includes(status);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/motorist/home")}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Finding suitable help</Text>
            <Text style={styles.subtitle}>AutoAssist dispatches a verified mechanic for you.</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.problemCard}>
            <Text style={styles.eyebrow}>YOUR REQUEST</Text>
            <Text style={styles.problemTitle}>{state.problem.symptom}</Text>
            <Text style={styles.problemText}>{state.problem.description}</Text>
            <Text style={styles.locationText}>{state.problem.location}</Text>
          </View>

          {loading && !request ? (
            <View style={styles.centerCard}>
              <ActivityIndicator color="#1857A6" size="large" />
              <Text style={styles.centerTitle}>Preparing matching…</Text>
            </View>
          ) : accepted ? (
            <View style={styles.acceptedCard}>
              <View style={styles.iconCircleGreen}>
                <SymbolView name="checkmark.seal.fill" size={28} tintColor="#1B8A5A" />
              </View>
              <Text style={styles.centerTitle}>A mechanic accepted your request</Text>
              <Text style={styles.centerText}>
                {mechanic?.garage_name || "Verified mechanic"}
                {Number(mechanic?.rating ?? 0) > 0 ? ` • ★ ${Number(mechanic.rating).toFixed(1)}` : ""}
              </Text>
              <Text style={styles.feeTitle}>AutoAssist connection fee</Text>
              <Text style={styles.feeAmount}>KES 500</Text>
              <Text style={styles.centerText}>
                Pay once to unlock direct contact and location details. Repair labour and parts are separate and will be quoted by the mechanic.
              </Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push({ pathname: "/motorist/connection-payment", params: { requestId: requestId! } })}
              >
                <Text style={styles.primaryText}>Pay KES 500 & connect</Text>
              </Pressable>
            </View>
          ) : connected ? (
            <View style={styles.acceptedCard}>
              <View style={styles.iconCircleGreen}>
                <SymbolView name="checkmark.circle.fill" size={30} tintColor="#1B8A5A" />
              </View>
              <Text style={styles.centerTitle}>Connection unlocked</Text>
              <Text style={styles.centerText}>Your mechanic is connected to this request. You can now view the service connection.</Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push({ pathname: "/motorist/mechanic-assigned", params: { requestId: requestId! } })}
              >
                <Text style={styles.primaryText}>View mechanic connection</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centerCard}>
              <View style={styles.iconCircle}>
                <SymbolView name="location.magnifyingglass" size={28} tintColor="#1857A6" />
              </View>
              <ActivityIndicator color="#1857A6" />
              <Text style={styles.centerTitle}>Matching quality + distance</Text>
              <Text style={styles.centerText}>{dispatchMessage}</Text>
              <View style={styles.ruleCard}>
                <Text style={styles.ruleTitle}>How AutoAssist chooses</Text>
                <Text style={styles.ruleText}>Verified provider • relevant service • nearby location • strong ratings • reliable response history</Text>
              </View>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!accepted && !connected && requestId ? (
            <Pressable style={styles.retryButton} onPress={() => void refresh(requestId, true)}>
              <Text style={styles.retryText}>Retry matching now</Text>
            </Pressable>
          ) : null}

          {requestId && !["cancelled", "completed"].includes(status) && !connected ? (
            <Pressable style={styles.cancelButton} onPress={() => void cancel()} disabled={cancelling}>
              <Text style={styles.cancelText}>{cancelling ? "Cancelling…" : "Cancel request"}</Text>
            </Pressable>
          ) : null}
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
  problemCard: { borderRadius: 15, borderWidth: 1, borderColor: "#E4E7EC", padding: 16, marginBottom: 16 },
  eyebrow: { color: "#1857A6", fontSize: 9, letterSpacing: 0.9, fontFamily: "Inter_600SemiBold" },
  problemTitle: { color: "#102A43", fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 5 },
  problemText: { color: "#475467", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 6 },
  locationText: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 10 },
  centerCard: { alignItems: "center", borderRadius: 18, backgroundColor: "#F5F9FE", borderWidth: 1, borderColor: "#B8D2F0", padding: 22, gap: 11 },
  acceptedCard: { alignItems: "center", borderRadius: 18, backgroundColor: "#F4FBF7", borderWidth: 1, borderColor: "#B7E4CB", padding: 22 },
  iconCircle: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  iconCircleGreen: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  centerTitle: { color: "#102A43", fontSize: 16, textAlign: "center", fontFamily: "Inter_600SemiBold" },
  centerText: { color: "#667085", fontSize: 11, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 5 },
  ruleCard: { alignSelf: "stretch", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginTop: 5 },
  ruleTitle: { color: "#102A43", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ruleText: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 4 },
  feeTitle: { color: "#475467", fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 18 },
  feeAmount: { color: "#102A43", fontSize: 30, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  primaryButton: { width: "100%", minHeight: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 18 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorText: { color: "#D9363E", backgroundColor: "#FFF1F2", padding: 11, borderRadius: 10, fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 14 },
  retryButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 14 },
  retryText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cancelButton: { minHeight: 42, alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelText: { color: "#D9363E", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
