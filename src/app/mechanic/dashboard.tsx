import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import {
  getConnectionPayment,
  getMechanicActiveRepairs,
  getPendingMechanicOffer,
  subscribeToMechanicOffers,
  updateMechanicAvailability,
} from "@/services/dispatch-backend";
import { getMechanicProfile } from "@/services/repair-backend";
import { getMechanicVerification } from "@/services/mechanic-verification-backend";
import { ensureJobNotifications } from "@/services/push-notifications";

export default function Dashboard() {
  const router = useRouter();
  const { backendEnabled, user, profile, signOut } = useAuth();
  const [mechanicProfile, setMechanicProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<"not-submitted" | "draft" | "pending" | "approved" | "rejected">("not-submitted");
  const [pendingOffer, setPendingOffer] = useState<any>(null);
  const [activeRepair, setActiveRepair] = useState<any>(null);
  const [connectionPayment, setConnectionPayment] = useState<any>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [checkingNotifications, setCheckingNotifications] = useState(false);

  const loadProviderState = async () => {
    if (!backendEnabled) {
      setLoading(false);
      return;
    }

    if (!user || profile?.role !== "mechanic") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const mechanicResult = await getMechanicProfile(user.id);
      if (mechanicResult.error) throw mechanicResult.error;
      const mechanic = mechanicResult.data as any;
      setMechanicProfile(mechanic);

      if (!mechanic) {
        setVerificationStatus("not-submitted");
        setPendingOffer(null);
        setActiveRepair(null);
        setConnectionPayment(null);
        return;
      }

      if (mechanic.verified) {
        setVerificationStatus("approved");

        const [offerResult, repairsResult] = await Promise.all([
          getPendingMechanicOffer(user.id),
          getMechanicActiveRepairs(user.id),
        ]);
        if (offerResult.error) throw offerResult.error;
        if (repairsResult.error) throw repairsResult.error;

        const offer = offerResult.data;
        setPendingOffer(offer && new Date(offer.expires_at).getTime() > Date.now() ? offer : null);

        const repair = repairsResult.data?.[0] ?? null;
        setActiveRepair(repair);
        if (repair?.id) {
          const paymentResult = await getConnectionPayment(repair.id);
          if (paymentResult.error) throw paymentResult.error;
          setConnectionPayment(paymentResult.data);
        } else {
          setConnectionPayment(null);
        }
        return;
      }

      const verificationResult = await getMechanicVerification(user.id);
      if (verificationResult.error) throw verificationResult.error;
      const status = verificationResult.data?.status;
      setVerificationStatus(
        status === "approved"
          ? "approved"
          : status === "rejected"
            ? "rejected"
            : status === "pending"
              ? "pending"
              : status === "draft"
                ? "draft"
                : "not-submitted",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load mechanic dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProviderState();
  }, [backendEnabled, user?.id, profile?.role]);

  useEffect(() => {
    if (!backendEnabled || !user || profile?.role !== "mechanic" || !mechanicProfile?.verified) return;

    const unsubscribe = subscribeToMechanicOffers(user.id, () => {
      void loadProviderState();
    });
    const timer = setInterval(() => void loadProviderState(), 15000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [backendEnabled, user?.id, profile?.role, mechanicProfile?.verified]);

  const setAvailability = async (available: boolean) => {
    if (!user || availabilityLoading) return;
    setAvailabilityLoading(true);
    setError("");
    setNotificationMessage("");

    try {
      if (!available) {
        const result = await updateMechanicAvailability(user.id, false);
        if (result.error) throw result.error;
        setMechanicProfile(result.data);
        setNotificationMessage("You are offline. AutoAssist will not offer new requests until you go online again.");
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Location access is required to go online because AutoAssist matches motorists to nearby mechanics.");
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = await updateMechanicAvailability(user.id, true, {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      if (result.error) throw result.error;
      setMechanicProfile(result.data);

      const push = await ensureJobNotifications(user.id);
      setNotificationMessage(
        push.registered
          ? "You are online. New nearby requests will also pop up above the current screen while AutoAssist is open."
          : `You are online for matching. New requests will appear inside AutoAssist. ${push.message}`,
      );
      await loadProviderState();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update availability.");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const checkPhoneAlerts = async () => {
    if (!user || checkingNotifications) return;
    setCheckingNotifications(true);
    setNotificationMessage("Checking phone notification permissions and registration…");
    try {
      const result = await ensureJobNotifications(user.id);
      setNotificationMessage(result.registered
        ? "Phone alerts registered. AutoAssist can notify you even when the app is in the background."
        : result.message);
    } catch (caught) {
      setNotificationMessage(caught instanceof Error
        ? caught.message : "Unable to configure phone notifications.");
    } finally {
      setCheckingNotifications(false);
    }
  };

  const logout = async () => {
    try {
      if (user && mechanicProfile?.verified && mechanicProfile?.is_available) {
        await updateMechanicAvailability(user.id, false);
      }
    } catch {
      // Signing out is more important than an availability cleanup failure.
    }
    await signOut();
    router.replace({ pathname: "/login", params: { role: "mechanic" } });
  };

  if (loading && !mechanicProfile) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ActivityIndicator color="#1857A6" />
          <Text style={styles.loadingText}>Loading mechanic dashboard…</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (backendEnabled && profile?.role !== "mechanic") {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <Text style={styles.title}>Mechanic dashboard</Text>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Mechanic account required</Text>
              <Text style={styles.errorText}>This session is not registered as a Mechanic account.</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={() => router.replace({ pathname: "/login", params: { role: "mechanic" } })}>
              <Text style={styles.primaryText}>Return to Mechanic login</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const providerType = profile?.provider_type === "garage" ? "garage" : "individual";
  const isGarage = providerType === "garage";
  const hasProfile = Boolean(mechanicProfile);
  const verified = Boolean(mechanicProfile?.verified || verificationStatus === "approved");
  const firstName = (profile?.full_name || "Mechanic").split(" ")[0];

  if (!verified) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>MECHANIC DASHBOARD</Text>
                <Text style={styles.title}>Welcome, {firstName}</Text>
              </View>
              <Pressable onPress={() => void logout()} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>{isGarage ? "Garage / business account" : "Individual mechanic account"}</Text>

            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>ACCOUNT STATUS</Text>
              <Text style={styles.statusTitle}>
                {!hasProfile
                  ? "Complete your mechanic profile"
                  : verificationStatus === "pending"
                    ? "Verification under review"
                    : verificationStatus === "rejected"
                      ? "Verification needs attention"
                      : verificationStatus === "draft"
                        ? "Finish your verification"
                        : "Complete verification"}
              </Text>
              <Text style={styles.statusText}>
                {!hasProfile
                  ? isGarage
                    ? "Add your garage details, service location and specialties before verification."
                    : "Add your service location and specialties before identity verification."
                  : verificationStatus === "pending"
                    ? "Your documents have been submitted. Live customer matching will activate after AutoAssist approves them."
                    : verificationStatus === "rejected"
                      ? "Review the verification feedback and resubmit your required documents."
                      : isGarage
                        ? "Verify this garage using its business permit before AutoAssist can dispatch customer requests to it."
                        : "Verify your identity using your National ID before AutoAssist can dispatch customer requests to you."}
              </Text>

              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push(hasProfile ? "/mechanic/verification" : "/mechanic/registration")}
              >
                <Text style={styles.primaryText}>
                  {!hasProfile
                    ? "Complete profile"
                    : verificationStatus === "pending"
                      ? "View verification status"
                      : verificationStatus === "rejected"
                        ? "Fix verification"
                        : "Continue verification"}
                </Text>
              </Pressable>
            </View>

            {hasProfile ? (
              <View style={styles.profileCard}>
                <Text style={styles.cardTitle}>{isGarage ? mechanicProfile?.garage_name : profile?.full_name}</Text>
                <Text style={styles.cardText}>{mechanicProfile?.location}</Text>
                <Text style={styles.cardText}>{mechanicProfile?.services?.join(" • ")}</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorTextStandalone}>{error}</Text> : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const isAvailable = Boolean(mechanicProfile?.is_available);
  const rating = Number(mechanicProfile?.rating ?? 0);
  const acceptedOffers = Number(mechanicProfile?.accepted_offers ?? 0);
  const declinedOffers = Number(mechanicProfile?.declined_offers ?? 0);
  const expiredOffers = Number(mechanicProfile?.expired_offers ?? 0);
  const totalOffers = acceptedOffers + declinedOffers + expiredOffers;
  const responseRate = totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : null;
  const activeStatus = String(activeRepair?.status ?? "");
  const paymentPaid = connectionPayment?.status === "paid";

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>MECHANIC DASHBOARD</Text>
              <Text style={styles.title}>Welcome, {firstName}</Text>
            </View>
            <Pressable onPress={() => void logout()} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{isGarage ? "Verified garage / business" : "Verified individual mechanic"}</Text>

          <View style={[styles.availabilityCard, isAvailable && styles.availabilityCardActive]}>
            <View style={styles.availabilityTop}>
              <View style={[styles.statusDot, isAvailable && styles.statusDotActive]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.availabilityTitle}>{isAvailable ? "You are online" : "You are offline"}</Text>
                <Text style={styles.availabilityText}>
                  {isAvailable
                    ? "You do not need to keep AutoAssist open. Suitable nearby requests can be sent to you when notifications are configured."
                    : "Go online when you are ready to receive automatically matched customer requests."}
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.availabilityButton, isAvailable && styles.offlineButton]}
              disabled={availabilityLoading}
              onPress={() => activeRepair
                ? router.push({ pathname: "/mechanic/job-details", params: { requestId: activeRepair.id } })
                : void setAvailability(!isAvailable)}
            >
              {availabilityLoading ? (
                <ActivityIndicator color={isAvailable ? "#1857A6" : "#FFFFFF"} />
              ) : (
                <Text style={[styles.availabilityButtonText, isAvailable && styles.offlineButtonText]}>
                  {activeRepair ? (activeStatus === "repair-complete" ? "Open job • awaiting customer rating" : "Finish current job first") : isAvailable ? "Go Offline" : "Go Online"}
                </Text>
              )}
            </Pressable>
          </View>

          <Pressable style={styles.refreshButton} disabled={checkingNotifications} onPress={() => void checkPhoneAlerts()}>
            {checkingNotifications
              ? <ActivityIndicator color="#1857A6" />
              : <Text style={styles.refreshText}>Check phone notification setup</Text>}
          </Pressable>
          {notificationMessage ? <Text style={styles.successNotice}>{notificationMessage}</Text> : null}
          {error ? <Text style={styles.errorTextStandalone}>{error}</Text> : null}

          <View style={styles.metricsRow}>
            <Metric label="Rating" value={rating > 0 ? rating.toFixed(1) : "New"} />
            <Metric label="Completed" value={String(mechanicProfile?.completed_jobs ?? 0)} />
            <Metric label="Acceptance" value={responseRate == null ? "New" : `${responseRate}%`} />
          </View>

          {pendingOffer ? (
            <View style={styles.offerCard}>
              <View style={styles.offerHeading}>
                <SymbolView name="bell.badge.fill" size={22} tintColor="#1857A6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.offerTitle}>New matched request</Text>
                  <Text style={styles.offerText}>AutoAssist matched this request to you based on location, service fit, rating and reliability.</Text>
                </View>
              </View>
              <Text style={styles.offerMeta}>
                {pendingOffer.distance_km == null ? "Nearby customer" : `${Number(pendingOffer.distance_km).toFixed(1)} km away`} • Match {Math.round(Number(pendingOffer.match_score ?? 0))}%
              </Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push({ pathname: "/mechanic/job-offer", params: { offerId: pendingOffer.id } })}
              >
                <Text style={styles.primaryText}>Review request</Text>
              </Pressable>
            </View>
          ) : null}

          {activeRepair ? (
            <View style={styles.activeCard}>
              <Text style={styles.statusLabel}>CURRENT ASSIGNMENT</Text>
              <Text style={styles.activeTitle}>{activeRepair.symptom} request</Text>
              <Text style={styles.activeText}>{activeRepair.description}</Text>
              <Text style={styles.cardText}>{activeRepair.location_text}</Text>

              {activeStatus === "accepted" && !paymentPaid ? (
                <View style={styles.waitingPaymentCard}>
                  <Text style={styles.waitingTitle}>Waiting for connection fee</Text>
                  <Text style={styles.waitingText}>You accepted the request. AutoAssist has asked the motorist to pay the KES 500 connection fee. Customer contact details stay locked until payment is confirmed.</Text>
                </View>
              ) : null}

              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push({ pathname: "/mechanic/job-details", params: { requestId: activeRepair.id } })}
              >
                <Text style={styles.primaryText}>{paymentPaid || activeStatus !== "accepted" ? "Open current assignment" : "View connection status"}</Text>
              </Pressable>
            </View>
          ) : !pendingOffer ? (
            <View style={styles.emptyCard}>
              <SymbolView name="bell" size={28} tintColor="#1857A6" />
              <Text style={styles.emptyTitle}>No request assigned right now</Text>
              <Text style={styles.emptyText}>
                AutoAssist does the searching for you. Stay online and suitable customer requests will pop up automatically.
              </Text>
            </View>
          ) : null}

          <View style={styles.profileCard}>
            <Text style={styles.cardTitle}>{isGarage ? mechanicProfile?.garage_name : profile?.full_name}</Text>
            <Text style={styles.cardText}>{mechanicProfile?.location}</Text>
            <Text style={styles.cardText}>{mechanicProfile?.services?.join(" • ")}</Text>
          </View>

          <Pressable style={styles.refreshButton} onPress={() => void loadProviderState()}>
            <Text style={styles.refreshText}>Refresh dashboard</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 10 },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30 },
  loadingText: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eyebrow: { color: "#1857A6", fontSize: 10, letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  title: { color: "#102A43", fontSize: 23, lineHeight: 29, fontFamily: "Inter_600SemiBold", marginTop: 6 },
  subtitle: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 22 },
  logoutButton: { borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { color: "#475467", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  statusCard: { borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#F5F9FE", borderRadius: 16, padding: 18 },
  statusLabel: { color: "#667085", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  statusTitle: { color: "#102A43", fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 6 },
  statusText: { color: "#667085", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 7 },
  primaryButton: { minHeight: 46, borderRadius: 11, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 16, paddingHorizontal: 14 },
  primaryText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  availabilityCard: { borderWidth: 1, borderColor: "#E4E7EC", backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16 },
  availabilityCardActive: { borderColor: "#B7E4CB", backgroundColor: "#F4FBF7" },
  availabilityTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#98A2B3", marginTop: 4 },
  statusDotActive: { backgroundColor: "#1B8A5A" },
  availabilityTitle: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  availabilityText: { color: "#667085", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 5 },
  availabilityButton: { minHeight: 45, borderRadius: 11, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 14 },
  availabilityButtonText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  offlineButton: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#1857A6" },
  offlineButtonText: { color: "#1857A6" },
  successNotice: { color: "#176B45", backgroundColor: "#EFFAF4", borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 12 },
  metricsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  metricCard: { flex: 1, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 12, paddingVertical: 13, alignItems: "center", backgroundColor: "#FFFFFF" },
  metricValue: { color: "#102A43", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  metricLabel: { color: "#667085", fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 3 },
  offerCard: { borderWidth: 1, borderColor: "#B8D2F0", borderRadius: 16, padding: 16, marginTop: 16, backgroundColor: "#F5F9FE" },
  offerHeading: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  offerTitle: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  offerText: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  offerMeta: { color: "#1857A6", fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  activeCard: { borderWidth: 1, borderColor: "#D5E4F7", borderRadius: 16, padding: 16, marginTop: 16 },
  activeTitle: { color: "#102A43", fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 5 },
  activeText: { color: "#475467", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 6 },
  waitingPaymentCard: { backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F5D48A", borderRadius: 11, padding: 12, marginTop: 14 },
  waitingTitle: { color: "#8A5200", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  waitingText: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 4 },
  emptyCard: { alignItems: "center", borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 22, marginTop: 16 },
  emptyTitle: { color: "#102A43", fontSize: 14, textAlign: "center", fontFamily: "Inter_600SemiBold", marginTop: 10 },
  emptyText: { color: "#667085", fontSize: 11, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 6 },
  profileCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, padding: 15, marginTop: 16, gap: 5 },
  cardTitle: { color: "#102A43", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardText: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  refreshButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 16 },
  refreshText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  errorCard: { backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#F3C5C9", borderRadius: 14, padding: 14, marginTop: 20 },
  errorTitle: { color: "#D9363E", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorText: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 5 },
  errorTextStandalone: { color: "#D9363E", backgroundColor: "#FFF1F2", borderRadius: 10, padding: 10, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 14 },
});
