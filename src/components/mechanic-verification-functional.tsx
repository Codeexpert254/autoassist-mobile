import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import {
  getMechanicVerification,
  submitMechanicVerification,
  type MechanicVerificationChecklist,
} from "@/services/mechanic-verification-backend";

export default function MechanicVerificationFunctional() {
  const router = useRouter();
  const { backendEnabled, user } = useAuth();
  const { state, submitVerification, refreshBackend } = useRepairFlow();
  const [checklist, setChecklist] = useState<MechanicVerificationChecklist>({
    nationalId: state.verificationItems.nationalId,
    businessPermit: state.verificationItems.businessPermit,
    certificates: state.verificationItems.certificates,
    profilePhoto: state.verificationItems.profilePhoto,
  });
  const [status, setStatus] = useState<"not-submitted" | "pending" | "approved" | "rejected">(
    state.mechanicProfile.verified ? "approved" : "not-submitted",
  );
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    if (!backendEnabled || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await refreshBackend();
      if (state.mechanicProfile.verified) {
        setStatus("approved");
        return;
      }

      const { data, error: requestError } = await getMechanicVerification(user.id);
      if (requestError) throw requestError;
      if (!data) {
        setStatus("not-submitted");
        return;
      }

      setChecklist({
        nationalId: data.national_id_confirmed,
        businessPermit: data.business_permit_confirmed,
        certificates: data.certificates_confirmed,
        profilePhoto: data.profile_photo_confirmed,
      });
      setReviewNote(data.review_note);
      setStatus(data.status === "approved" ? "approved" : data.status === "rejected" ? "rejected" : "pending");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load verification status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [backendEnabled, user?.id]);

  const toggle = (key: keyof MechanicVerificationChecklist) => {
    if (status === "pending" || status === "approved") return;
    setChecklist((current) => ({ ...current, [key]: !current[key] }));
  };

  const allReady = Object.values(checklist).every(Boolean);

  const submit = async () => {
    if (!allReady || loading) return;

    if (!backendEnabled) {
      submitVerification();
      router.replace("/mechanic/dashboard");
      return;
    }

    if (!user) {
      setError("Sign in again before submitting verification.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data, error: submitError } = await submitMechanicVerification(user.id, checklist);
      if (submitError) throw submitError;
      setStatus(data.status === "rejected" ? "rejected" : "pending");
      submitVerification();
      await refreshBackend();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit verification.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && status === "not-submitted") {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ActivityIndicator color="#1857A6" />
          <Text style={styles.loadingText}>Checking verification status…</Text>
        </SafeAreaView>
      </View>
    );
  }

  const approved = state.mechanicProfile.verified || status === "approved";

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Mechanic verification</Text>
            <Text style={styles.subtitle}>Verification protects motorists and trusted service providers.</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {approved ? (
            <View style={[styles.statusCard, styles.approvedCard]}>
              <SymbolView name="checkmark.seal.fill" size={30} tintColor="#1B8A5A" />
              <View style={styles.statusCopy}>
                <Text style={styles.approvedTitle}>AutoAssist verified</Text>
                <Text style={styles.statusText}>Your mechanic profile is approved and can receive live repair requests.</Text>
              </View>
            </View>
          ) : status === "pending" ? (
            <View style={[styles.statusCard, styles.pendingCard]}>
              <SymbolView name="clock.fill" size={28} tintColor="#D98200" />
              <View style={styles.statusCopy}>
                <Text style={styles.pendingTitle}>Verification under review</Text>
                <Text style={styles.statusText}>Your checklist has been submitted. AutoAssist must approve the provider before live jobs become available.</Text>
              </View>
            </View>
          ) : status === "rejected" ? (
            <View style={[styles.statusCard, styles.rejectedCard]}>
              <SymbolView name="exclamationmark.triangle.fill" size={28} tintColor="#D9363E" />
              <View style={styles.statusCopy}>
                <Text style={styles.rejectedTitle}>Verification needs attention</Text>
                <Text style={styles.statusText}>{reviewNote || "Review the verification information and submit it again."}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>Complete all four checks</Text>
              <Text style={styles.introText}>Confirm that each required document is ready for provider review. The account will remain pending until an administrator approves it.</Text>
            </View>
          )}

          <View style={styles.list}>
            <ChecklistCard title="National ID" subtitle="Identity document ready for review" checked={checklist.nationalId} onPress={() => toggle("nationalId")} disabled={status === "pending" || approved} />
            <ChecklistCard title="Business permit" subtitle="Current garage/business permit" checked={checklist.businessPermit} onPress={() => toggle("businessPermit")} disabled={status === "pending" || approved} />
            <ChecklistCard title="Skill certificates" subtitle="Relevant training or trade certificates" checked={checklist.certificates} onPress={() => toggle("certificates")} disabled={status === "pending" || approved} />
            <ChecklistCard title="Profile photo" subtitle="Clear professional profile photo" checked={checklist.profilePhoto} onPress={() => toggle("profilePhoto")} disabled={status === "pending" || approved} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {approved ? (
            <Pressable style={styles.primaryButton} onPress={() => router.replace("/mechanic/dashboard")}>
              <Text style={styles.primaryText}>Open mechanic dashboard</Text>
            </Pressable>
          ) : status === "pending" ? (
            <Pressable style={styles.secondaryButton} onPress={() => void loadStatus()}>
              <Text style={styles.secondaryText}>Refresh verification status</Text>
            </Pressable>
          ) : (
            <Pressable disabled={!allReady || loading} style={[styles.primaryButton, (!allReady || loading) && styles.disabled]} onPress={() => void submit()}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{status === "rejected" ? "Resubmit verification" : "Submit verification"}</Text>}
            </Pressable>
          )}

          {!approved && status === "pending" ? (
            <Pressable style={styles.dashboardLink} onPress={() => router.replace("/mechanic/dashboard")}>
              <Text style={styles.dashboardLinkText}>View dashboard in pending mode</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ChecklistCard({ title, subtitle, checked, onPress, disabled }: { title: string; subtitle: string; checked: boolean; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.checkCard, checked && styles.checkCardReady]}>
      <View style={[styles.checkIcon, checked && styles.checkIconReady]}>
        <SymbolView name={checked ? "checkmark" : "doc"} size={18} tintColor={checked ? "#FFFFFF" : "#667085"} />
      </View>
      <View style={styles.checkCopy}>
        <Text style={styles.checkTitle}>{title}</Text>
        <Text style={styles.checkSubtitle}>{subtitle}</Text>
      </View>
      <Text style={[styles.checkStatus, checked && styles.checkStatusReady]}>{checked ? "READY" : "ADD"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#EAECF0" },
  backButton: { width: 34, minHeight: 38, justifyContent: "center" },
  backText: { color: "#102A43", fontSize: 28, lineHeight: 32, fontFamily: "Inter_600SemiBold" },
  headerCopy: { flex: 1 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  content: { padding: 20, paddingBottom: 34 },
  introCard: { padding: 15, borderRadius: 14, backgroundColor: "#EAF2FD", borderWidth: 1, borderColor: "#B8D2F0", marginBottom: 18 },
  introTitle: { color: "#1857A6", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  introText: { color: "#475467", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 5 },
  statusCard: { flexDirection: "row", gap: 12, padding: 15, borderRadius: 14, borderWidth: 1, marginBottom: 18 },
  approvedCard: { borderColor: "#B7DFC9", backgroundColor: "#EAF7F1" },
  pendingCard: { borderColor: "#F5D48A", backgroundColor: "#FFF7E8" },
  rejectedCard: { borderColor: "#F3C5C9", backgroundColor: "#FFF1F2" },
  statusCopy: { flex: 1 },
  approvedTitle: { color: "#1B8A5A", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pendingTitle: { color: "#B26B00", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rejectedTitle: { color: "#D9363E", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusText: { color: "#475467", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 4 },
  list: { gap: 10 },
  checkCard: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 13, backgroundColor: "#FFFFFF" },
  checkCardReady: { borderColor: "#B7DFC9", backgroundColor: "#F7FCF9" },
  checkIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#F2F4F7", alignItems: "center", justifyContent: "center" },
  checkIconReady: { backgroundColor: "#1B8A5A" },
  checkCopy: { flex: 1 },
  checkTitle: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  checkSubtitle: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 3 },
  checkStatus: { color: "#98A2B3", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  checkStatusReady: { color: "#1B8A5A" },
  error: { color: "#D9363E", backgroundColor: "#FFF1F2", padding: 10, borderRadius: 10, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 14 },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { backgroundColor: "#A9C2DF" },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  secondaryButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 20 },
  secondaryText: { color: "#1857A6", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dashboardLink: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  dashboardLinkText: { color: "#667085", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
