import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StaticScreen } from "@/components/autoassist-ui";
import { useAuth } from "@/context/auth-context";
import { mechanicScreens } from "@/data/autoassist-screens";
import { getMechanicProfile } from "@/services/repair-backend";
import { getMechanicVerification } from "@/services/mechanic-verification-backend";
import type { MechanicProfileRow } from "@/types/database";

export default function Dashboard() {
  const router = useRouter();
  const { backendEnabled, user, profile } = useAuth();
  const [mechanicProfile, setMechanicProfile] = useState<MechanicProfileRow | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"not-submitted" | "pending" | "approved" | "rejected">("not-submitted");
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState("");

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
      setMechanicProfile(mechanicResult.data);

      if (mechanicResult.data?.verified) {
        setVerificationStatus("approved");
        return;
      }

      if (!mechanicResult.data) {
        setVerificationStatus("not-submitted");
        return;
      }

      const verificationResult = await getMechanicVerification(user.id);
      if (verificationResult.error) throw verificationResult.error;
      const status = verificationResult.data?.status;
      setVerificationStatus(status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "pending" ? "pending" : "not-submitted");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load mechanic dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProviderState();
  }, [backendEnabled, user?.id, profile?.role]);

  if (loading) {
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

  if (mechanicProfile?.verified || verificationStatus === "approved") {
    return <StaticScreen {...mechanicScreens.dashboard} />;
  }

  const providerType = profile?.provider_type === "garage" ? "garage" : "individual";
  const isGarage = providerType === "garage";
  const hasProfile = Boolean(mechanicProfile);
  const firstName = (profile?.full_name || "Mechanic").split(" ")[0];

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>MECHANIC DASHBOARD</Text>
          <Text style={styles.title}>Welcome, {firstName}</Text>
          <Text style={styles.subtitle}>
            {isGarage ? "Garage / business account" : "Individual mechanic account"}
          </Text>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>ACCOUNT STATUS</Text>
            <Text style={styles.statusTitle}>
              {!hasProfile
                ? "Complete your mechanic profile"
                : verificationStatus === "pending"
                  ? "Verification under review"
                  : verificationStatus === "rejected"
                    ? "Verification needs attention"
                    : "Complete verification"}
            </Text>
            <Text style={styles.statusText}>
              {!hasProfile
                ? isGarage
                  ? "Add your garage details, service location and specialties before verification."
                  : "Add your service location and specialties before identity verification."
                : verificationStatus === "pending"
                  ? "Your documents have been submitted. You can use the dashboard while AutoAssist reviews them, but live jobs remain disabled."
                  : verificationStatus === "rejected"
                    ? "Review the verification feedback and resubmit your required documents."
                    : isGarage
                      ? "Verify this garage using its business permit before receiving live jobs."
                      : "Verify your identity using your National ID before receiving live jobs."}
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
                      : "Start verification"}
              </Text>
            </Pressable>
          </View>

          {hasProfile ? (
            <View style={styles.profileCard}>
              <Text style={styles.cardTitle}>{isGarage ? mechanicProfile?.garage_name : profile?.full_name}</Text>
              <Text style={styles.cardText}>{mechanicProfile?.location}</Text>
              <Text style={styles.cardText}>{mechanicProfile?.services.join(" • ")}</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorTextStandalone}>{error}</Text> : null}

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Live repair jobs</Text>
            <Text style={styles.noticeText}>Jobs will become available after AutoAssist approves your provider verification.</Text>
          </View>

          <Pressable style={styles.refreshButton} onPress={() => void loadProviderState()}>
            <Text style={styles.refreshText}>Refresh dashboard status</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 10 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 22 },
  loadingText: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  eyebrow: { color: "#1857A6", fontSize: 10, letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  title: { color: "#102A43", fontSize: 23, lineHeight: 29, fontFamily: "Inter_600SemiBold", marginTop: 6 },
  subtitle: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 24 },
  statusCard: { borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#F5F9FE", borderRadius: 16, padding: 18 },
  statusLabel: { color: "#667085", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  statusTitle: { color: "#102A43", fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 6 },
  statusText: { color: "#667085", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 7 },
  primaryButton: { minHeight: 46, borderRadius: 11, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 16 },
  primaryText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  profileCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, padding: 15, marginTop: 16, gap: 5 },
  cardTitle: { color: "#102A43", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardText: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  noticeCard: { borderRadius: 14, backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F5D48A", padding: 14, marginTop: 16 },
  noticeTitle: { color: "#8A5200", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  noticeText: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 5 },
  refreshButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 16 },
  refreshText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  errorCard: { backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#F3C5C9", borderRadius: 14, padding: 14, marginTop: 20 },
  errorTitle: { color: "#D9363E", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorText: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 5 },
  errorTextStandalone: { color: "#D9363E", backgroundColor: "#FFF1F2", borderRadius: 10, padding: 10, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 14 },
});
