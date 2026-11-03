import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getAdminVerificationDetail,
  reviewAdminVerification,
  type AdminVerificationDetail,
} from "@/services/admin-verification-backend";

function CheckRow({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.checkRow} onPress={onPress}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

function EvidenceCard({ title, url }: { title: string; url: string | null }) {
  return (
    <View style={styles.evidenceCard}>
      <Text style={styles.evidenceTitle}>{title}</Text>
      {url ? (
        <Image source={{ uri: url }} style={styles.evidenceImage} resizeMode="contain" />
      ) : (
        <View style={styles.missingEvidence}>
          <Text style={styles.muted}>No image available.</Text>
        </View>
      )}
    </View>
  );
}

export default function VerificationDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

  const [detail, setDetail] = useState<AdminVerificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [documentChecked, setDocumentChecked] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setError("Verification applicant was not specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await getAdminVerificationDetail(userId);
      setDetail(result);
    } catch (caught) {
      setDetail(null);
      setError(caught instanceof Error ? caught.message : "Unable to load verification details.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isGarage = detail?.profile.provider_type === "garage";
  const canApprove = useMemo(() => {
    if (!detail || detail.submission.status !== "pending") return false;
    if (!documentChecked || !identityChecked) return false;
    if (!isGarage && !detail.identityNumberStored) return false;
    return true;
  }, [detail, documentChecked, identityChecked, isGarage]);

  const decide = async (decision: "approve" | "reject" | "resubmit") => {
    if (!detail || !userId || reviewing) return;
    if ((decision === "reject" || decision === "resubmit") && !note.trim()) {
      setError("Add a review note explaining what the mechanic needs to correct.");
      return;
    }
    if (decision === "approve" && !canApprove) {
      setError("Complete both manual review checks before approving this mechanic.");
      return;
    }

    const run = async () => {
      setReviewing(true);
      setError("");
      try {
        await reviewAdminVerification({ userId, decision, note: note.trim() || null });
        setDocumentChecked(false);
        setIdentityChecked(false);
        setNote("");
        await load();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to save the review decision.");
      } finally {
        setReviewing(false);
      }
    };

    if (decision === "approve") {
      Alert.alert(
        "Approve mechanic?",
        "This will mark the provider as AutoAssist verified and allow them into live mechanic dispatch.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Approve", onPress: () => void run() },
        ],
      );
      return;
    }

    await run();
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ActivityIndicator color="#1857A6" />
          <Text style={styles.muted}>Loading secure verification evidence…</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (error && !detail) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Back</Text></Pressable>
          <View style={styles.errorCard}><Text style={styles.errorTitle}>Unable to open verification</Text><Text style={styles.errorText}>{error}</Text></View>
        </SafeAreaView>
      </View>
    );
  }

  if (!detail) return null;

  const name = detail.profile.full_name?.trim() || "Unnamed mechanic";
  const status = String(detail.submission.status ?? "unknown");
  const legacyIdentity = !isGarage && !detail.identityNumberStored;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Back</Text></Pressable>
          <Pressable onPress={() => void load()} style={styles.refreshButton}><Text style={styles.refreshText}>Refresh links</Text></Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>VERIFICATION REVIEW</Text>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.subtitle}>{isGarage ? "Garage / business mechanic" : "Individual mechanic"}</Text>
            <View style={styles.statusPill}><Text style={styles.statusText}>{status}</Text></View>
          </View>

          {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Identity pre-check</Text>
            {isGarage ? (
              <Text style={styles.bodyText}>Garage accounts are verified using the business permit and provider profile photo.</Text>
            ) : detail.identityNumberStored ? (
              <>
                <View style={styles.successCard}>
                  <Text style={styles.successTitle}>✓ ID number/image pre-check passed</Text>
                  <Text style={styles.successText}>The mechanic's device detected the same ID number on the submitted National ID before the application was accepted.</Text>
                </View>
                <Text style={styles.fieldLabel}>Saved National ID number</Text>
                <Text selectable style={styles.identityNumber}>{detail.identityNumber}</Text>
                <Text style={styles.securityText}>This number is returned only through the protected admin verification service. It is not stored in the public verification table.</Text>
              </>
            ) : (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Readable ID number unavailable</Text>
                <Text style={styles.warningText}>This application was submitted before readable ID storage was enabled. The old fingerprint cannot be reversed. Request resubmission before approval so the mechanic re-enters and rematches the ID number.</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Provider details</Text>
            <Text style={styles.detailLine}>Phone: {detail.profile.phone || "Not provided"}</Text>
            <Text style={styles.detailLine}>Location: {detail.mechanic?.location || "Not provided"}</Text>
            <Text style={styles.detailLine}>Services: {detail.mechanic?.services?.join(", ") || "Not provided"}</Text>
            <Text style={styles.detailLine}>Current verified status: {detail.mechanic?.verified ? "Verified" : "Not verified"}</Text>
          </View>

          {!isGarage ? <EvidenceCard title="National ID" url={detail.evidence.nationalIdUrl} /> : null}
          {isGarage ? <EvidenceCard title="Business permit" url={detail.evidence.businessPermitUrl} /> : null}
          <EvidenceCard title={isGarage ? "Garage / business profile photo" : "Mechanic profile photo"} url={detail.evidence.profilePhotoUrl} />

          {detail.evidence.certificateUrls.length ? (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Optional skill certificates</Text>
              {detail.evidence.certificateUrls.map((url, index) => (
                <Image key={`${url}-${index}`} source={{ uri: url }} style={styles.certificateImage} resizeMode="contain" />
              ))}
            </View>
          ) : null}

          <View style={styles.reviewCard}>
            <Text style={styles.sectionTitle}>Manual admin review</Text>
            <Text style={styles.bodyText}>Do not approve until you personally inspect the submitted evidence. The automatic OCR match is only a pre-check.</Text>

            <CheckRow
              checked={documentChecked}
              onPress={() => setDocumentChecked((value) => !value)}
              label={isGarage ? "I inspected the business permit and it appears clear and valid." : "I inspected the National ID and it appears clear and genuine."}
            />
            <CheckRow
              checked={identityChecked}
              onPress={() => setIdentityChecked((value) => !value)}
              label={isGarage ? "The business permit is consistent with this garage/business application." : "The saved ID number matches the number visible on the National ID image."}
            />

            <Text style={styles.fieldLabel}>Review note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Required for rejection or resubmission; optional for approval"
              multiline
              style={styles.noteInput}
              textAlignVertical="top"
            />

            {status === "pending" ? (
              <View style={styles.actions}>
                <Pressable disabled={!canApprove || reviewing} style={[styles.approveButton, (!canApprove || reviewing) && styles.disabledButton]} onPress={() => void decide("approve")}>
                  <Text style={styles.approveText}>{reviewing ? "Saving…" : "Approve mechanic"}</Text>
                </Pressable>
                <Pressable disabled={reviewing} style={styles.resubmitButton} onPress={() => void decide("resubmit")}>
                  <Text style={styles.resubmitText}>{legacyIdentity ? "Request ID resubmission" : "Request resubmission"}</Text>
                </Pressable>
                <Pressable disabled={reviewing} style={styles.rejectButton} onPress={() => void decide("reject")}>
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.bodyText}>This application is no longer pending. Refresh the queue to review another submission.</Text>
            )}
          </View>

          <Text style={styles.expiryText}>Document links expire after {Math.round(detail.evidence.expiresInSeconds / 60)} minutes. Use “Refresh links” if an image expires while reviewing.</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F9FC" },
  safeArea: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center", gap: 10 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backButton: { paddingVertical: 8, paddingRight: 12 },
  backText: { color: "#1857A6", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  refreshButton: { borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  refreshText: { color: "#344054", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 14, paddingBottom: 50 },
  hero: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: "#EAECF0", gap: 4 },
  eyebrow: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  title: { color: "#101828", fontSize: 26, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 13, fontFamily: "Inter_400Regular" },
  statusPill: { alignSelf: "flex-start", marginTop: 8, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#FFF4E5" },
  statusText: { color: "#93370D", fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EAECF0", gap: 9 },
  sectionTitle: { color: "#101828", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  bodyText: { color: "#667085", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  detailLine: { color: "#475467", fontSize: 12, fontFamily: "Inter_400Regular" },
  successCard: { backgroundColor: "#ECFDF3", borderRadius: 12, padding: 13, gap: 4 },
  successTitle: { color: "#067647", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  successText: { color: "#067647", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular" },
  warningCard: { backgroundColor: "#FFFAEB", borderRadius: 12, padding: 13, gap: 4 },
  warningTitle: { color: "#B54708", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  warningText: { color: "#93370D", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular" },
  fieldLabel: { color: "#344054", fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  identityNumber: { color: "#101828", fontSize: 22, letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  securityText: { color: "#98A2B3", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular" },
  evidenceCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EAECF0", gap: 10 },
  evidenceTitle: { color: "#101828", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  evidenceImage: { width: "100%", height: 260, backgroundColor: "#F2F4F7", borderRadius: 12 },
  missingEvidence: { height: 110, borderRadius: 12, backgroundColor: "#F2F4F7", alignItems: "center", justifyContent: "center" },
  certificateImage: { width: "100%", height: 220, backgroundColor: "#F2F4F7", borderRadius: 12, marginTop: 8 },
  reviewCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EAECF0", gap: 12 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#98A2B3", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxChecked: { borderColor: "#1857A6", backgroundColor: "#1857A6" },
  checkmark: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  checkLabel: { flex: 1, color: "#344054", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  noteInput: { minHeight: 90, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 12, backgroundColor: "#FFFFFF", padding: 12, color: "#101828", fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { gap: 8, marginTop: 4 },
  approveButton: { backgroundColor: "#067647", minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  approveText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resubmitButton: { backgroundColor: "#FFF4E5", minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FEC84B" },
  resubmitText: { color: "#B54708", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rejectButton: { backgroundColor: "#FFFFFF", minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FDA29B" },
  rejectText: { color: "#B42318", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  disabledButton: { opacity: 0.45 },
  errorCard: { backgroundColor: "#FEECEC", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { color: "#B42318", fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  errorText: { color: "#7A271A", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  muted: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  expiryText: { color: "#98A2B3", fontSize: 10, textAlign: "center", fontFamily: "Inter_400Regular" },
});
