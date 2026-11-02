import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import {
  getMechanicVerification,
  saveMechanicVerificationDraft,
  submitMechanicVerification,
  uploadMechanicVerificationImage,
  type MechanicVerificationChecklist,
  type MechanicVerificationEvidence,
  type VerificationImageKind,
} from "@/services/mechanic-verification-backend";

type EvidenceKey = "nationalId" | "businessPermit" | "certificates" | "profilePhoto";
type VerificationStatus = "not-submitted" | "draft" | "pending" | "approved" | "rejected";

const emptyEvidence: MechanicVerificationEvidence = {
  nationalIdPath: null,
  businessPermitPath: null,
  certificatePaths: [],
  profilePhotoPath: null,
};

export default function MechanicVerificationFunctional() {
  const router = useRouter();
  const { backendEnabled, user, profile } = useAuth();
  const { state, submitVerification, refreshBackend } = useRepairFlow();
  const providerType = profile?.provider_type === "garage" ? "garage" : "individual";
  const isGarage = providerType === "garage";
  const [checklist, setChecklist] = useState<MechanicVerificationChecklist>({
    nationalId: state.verificationItems.nationalId,
    businessPermit: state.verificationItems.businessPermit,
    certificates: state.verificationItems.certificates,
    profilePhoto: state.verificationItems.profilePhoto,
  });
  const [evidence, setEvidence] = useState<MechanicVerificationEvidence>(emptyEvidence);
  const [status, setStatus] = useState<VerificationStatus>(
    state.mechanicProfile.verified ? "approved" : "not-submitted",
  );
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [uploadingKey, setUploadingKey] = useState<EvidenceKey | null>(null);
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

      const { data, error: requestError } = await getMechanicVerification(user.id);
      if (requestError) throw requestError;
      if (!data) {
        setStatus(state.mechanicProfile.verified ? "approved" : "not-submitted");
        setEvidence(emptyEvidence);
        return;
      }

      setChecklist({
        nationalId: data.national_id_confirmed,
        businessPermit: data.business_permit_confirmed,
        certificates: data.certificates_confirmed,
        profilePhoto: data.profile_photo_confirmed,
      });
      setEvidence({
        nationalIdPath: data.national_id_path,
        businessPermitPath: data.business_permit_path,
        certificatePaths: data.certificate_paths ?? [],
        profilePhotoPath: data.profile_photo_path,
      });
      setReviewNote(data.review_note);
      setStatus(
        data.status === "approved"
          ? "approved"
          : data.status === "rejected"
            ? "rejected"
            : data.status === "pending"
              ? "pending"
              : "draft",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load verification status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [backendEnabled, user?.id]);

  const uploadKindFor = (key: EvidenceKey): VerificationImageKind => {
    switch (key) {
      case "nationalId":
        return "national-id";
      case "businessPermit":
        return "business-permit";
      case "certificates":
        return "certificate";
      default:
        return "profile-photo";
    }
  };

  const persistImages = async (key: EvidenceKey, assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets.length || uploadingKey) return;

    if (!backendEnabled || !user) {
      setChecklist((current) => ({ ...current, [key]: true }));
      setStatus("draft");
      return;
    }

    setUploadingKey(key);
    setError("");

    try {
      const nextEvidence: MechanicVerificationEvidence = {
        ...evidence,
        certificatePaths: [...evidence.certificatePaths],
      };

      for (const asset of assets) {
        if (!asset.uri) continue;
        const { data, error: uploadError } = await uploadMechanicVerificationImage({
          userId: user.id,
          kind: uploadKindFor(key),
          uri: asset.uri,
          mimeType: asset.mimeType,
        });
        if (uploadError) throw uploadError;

        if (key === "nationalId") nextEvidence.nationalIdPath = data.path;
        if (key === "businessPermit") nextEvidence.businessPermitPath = data.path;
        if (key === "profilePhoto") nextEvidence.profilePhotoPath = data.path;
        if (key === "certificates" && !nextEvidence.certificatePaths.includes(data.path)) {
          nextEvidence.certificatePaths.push(data.path);
        }
      }

      const nextChecklist: MechanicVerificationChecklist = {
        nationalId: Boolean(nextEvidence.nationalIdPath),
        businessPermit: Boolean(nextEvidence.businessPermitPath),
        certificates: nextEvidence.certificatePaths.length > 0,
        profilePhoto: Boolean(nextEvidence.profilePhotoPath),
      };

      const { error: draftError } = await saveMechanicVerificationDraft(user.id, nextChecklist, nextEvidence);
      if (draftError) throw draftError;

      setEvidence(nextEvidence);
      setChecklist(nextChecklist);
      setStatus((current) => (current === "rejected" ? "rejected" : "draft"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this verification image.");
    } finally {
      setUploadingKey(null);
    }
  };

  const chooseFromLibrary = async (key: EvidenceKey) => {
    if (uploadingKey) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo access is required to upload a verification image from this device.");
        return;
      }

      const multipleCertificates = key === "certificates";
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: multipleCertificates,
        selectionLimit: multipleCertificates ? 5 : 1,
        allowsEditing: key === "profilePhoto" && !multipleCertificates,
        quality: 0.85,
        exif: false,
      });

      if (result.canceled || !result.assets?.length) return;
      await persistImages(key, result.assets);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open photos on this device.");
    }
  };

  const offerUploadFallback = (key: EvidenceKey, message: string) => {
    Alert.alert(
      "Camera unavailable",
      `${message} You can upload an existing image instead.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Upload instead", onPress: () => void chooseFromLibrary(key) },
      ],
    );
  };

  const captureWithCamera = async (key: EvidenceKey) => {
    if (uploadingKey || status === "pending" || status === "approved") return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        offerUploadFallback(key, "AutoAssist could not access the camera.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        cameraType:
          key === "profilePhoto" && !isGarage
            ? ImagePicker.CameraType.front
            : ImagePicker.CameraType.back,
        allowsEditing: key === "profilePhoto",
        quality: 0.85,
        exif: false,
      });

      if (result.canceled || !result.assets?.length) return;
      await persistImages(key, result.assets);
    } catch (caught) {
      offerUploadFallback(
        key,
        caught instanceof Error ? caught.message : "The camera could not be opened.",
      );
    }
  };

  const identityReady = isGarage ? checklist.businessPermit : checklist.nationalId;
  const allReady = identityReady && checklist.certificates && checklist.profilePhoto;

  const submit = async () => {
    if (!allReady || loading || uploadingKey) return;

    const providerChecklist: MechanicVerificationChecklist = {
      nationalId: isGarage ? false : checklist.nationalId,
      businessPermit: isGarage ? checklist.businessPermit : false,
      certificates: checklist.certificates,
      profilePhoto: checklist.profilePhoto,
    };

    const providerEvidence: MechanicVerificationEvidence = {
      nationalIdPath: isGarage ? null : evidence.nationalIdPath,
      businessPermitPath: isGarage ? evidence.businessPermitPath : null,
      certificatePaths: evidence.certificatePaths,
      profilePhotoPath: evidence.profilePhotoPath,
    };

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
      const { data, error: submitError } = await submitMechanicVerification(
        user.id,
        providerChecklist,
        providerEvidence,
      );
      if (submitError) throw submitError;
      setChecklist(providerChecklist);
      setEvidence(providerEvidence);
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
  const locked = status === "pending" || approved;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{isGarage ? "Garage verification" : "Individual mechanic verification"}</Text>
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
                <Text style={styles.statusText}>Your verification has been submitted. AutoAssist must approve the provider before live jobs become available.</Text>
              </View>
            </View>
          ) : status === "rejected" ? (
            <View style={[styles.statusCard, styles.rejectedCard]}>
              <SymbolView name="exclamationmark.triangle.fill" size={28} tintColor="#D9363E" />
              <View style={styles.statusCopy}>
                <Text style={styles.rejectedTitle}>Verification needs attention</Text>
                <Text style={styles.statusText}>{reviewNote || "Retake or replace the requested evidence, then submit it again."}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>{isGarage ? "Verify the garage/business" : "Verify your identity"}</Text>
              <Text style={styles.introText}>
                Tap each item to open the camera first. If the camera is unavailable or permission is denied, AutoAssist will offer an upload-from-device option.
              </Text>
            </View>
          )}

          <View style={styles.list}>
            {isGarage ? (
              <ChecklistCard
                title="Business permit"
                subtitle={checklist.businessPermit ? "Business permit image saved securely" : "Tap to scan or photograph the valid business permit"}
                checked={checklist.businessPermit}
                uploading={uploadingKey === "businessPermit"}
                onPress={() => void captureWithCamera("businessPermit")}
                onUpload={() => void chooseFromLibrary("businessPermit")}
                disabled={locked || Boolean(uploadingKey)}
              />
            ) : (
              <ChecklistCard
                title="National ID"
                subtitle={checklist.nationalId ? "National ID image saved securely" : "Tap to scan or photograph your National ID"}
                checked={checklist.nationalId}
                uploading={uploadingKey === "nationalId"}
                onPress={() => void captureWithCamera("nationalId")}
                onUpload={() => void chooseFromLibrary("nationalId")}
                disabled={locked || Boolean(uploadingKey)}
              />
            )}

            <ChecklistCard
              title="Skill certificates"
              subtitle={
                evidence.certificatePaths.length > 0
                  ? `${evidence.certificatePaths.length} certificate image${evidence.certificatePaths.length === 1 ? "" : "s"} saved • Tap again to add another`
                  : "Tap to photograph a certificate; upload can select up to 5 images"
              }
              checked={checklist.certificates}
              uploading={uploadingKey === "certificates"}
              onPress={() => void captureWithCamera("certificates")}
              onUpload={() => void chooseFromLibrary("certificates")}
              disabled={locked || Boolean(uploadingKey)}
            />

            <ChecklistCard
              title={isGarage ? "Business / profile photo" : "Profile photo"}
              subtitle={
                checklist.profilePhoto
                  ? "Profile image saved securely"
                  : isGarage
                    ? "Tap to photograph the garage or professional business profile"
                    : "Tap to take a clear professional profile photo"
              }
              checked={checklist.profilePhoto}
              uploading={uploadingKey === "profilePhoto"}
              onPress={() => void captureWithCamera("profilePhoto")}
              onUpload={() => void chooseFromLibrary("profilePhoto")}
              disabled={locked || Boolean(uploadingKey)}
            />
          </View>

          {!locked ? (
            <Text style={styles.privacyNote}>Verification images are private and stored under your AutoAssist account for review.</Text>
          ) : null}

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
            <Pressable disabled={!allReady || loading || Boolean(uploadingKey)} style={[styles.primaryButton, (!allReady || loading || Boolean(uploadingKey)) && styles.disabled]} onPress={() => void submit()}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{status === "rejected" ? "Resubmit verification" : "Submit verification"}</Text>}
            </Pressable>
          )}

          {!approved && status === "pending" ? (
            <Pressable style={styles.dashboardLink} onPress={() => router.replace("/mechanic/dashboard")}>
              <Text style={styles.dashboardLinkText}>Return to mechanic dashboard</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ChecklistCard({
  title,
  subtitle,
  checked,
  uploading,
  onPress,
  onUpload,
  disabled,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  uploading: boolean;
  onPress: () => void;
  onUpload: () => void;
  disabled: boolean;
}) {
  return (
    <View style={[styles.checkCard, checked && styles.checkCardReady]}>
      <Pressable disabled={disabled} onPress={onPress} style={styles.checkMainAction}>
        <View style={[styles.checkIcon, checked && styles.checkIconReady]}>
          {uploading ? (
            <ActivityIndicator size="small" color={checked ? "#FFFFFF" : "#1857A6"} />
          ) : (
            <SymbolView name={checked ? "checkmark" : "camera.fill"} size={18} tintColor={checked ? "#FFFFFF" : "#667085"} />
          )}
        </View>
        <View style={styles.checkCopy}>
          <Text style={styles.checkTitle}>{title}</Text>
          <Text style={styles.checkSubtitle}>{uploading ? "Saving securely…" : subtitle}</Text>
        </View>
        <Text style={[styles.checkStatus, checked && styles.checkStatusReady]}>{uploading ? "SAVING" : checked ? "READY" : "CAMERA"}</Text>
      </Pressable>
      {!disabled && !uploading ? (
        <Pressable onPress={onUpload} style={styles.uploadFallbackButton}>
          <SymbolView name="photo.on.rectangle" size={14} tintColor="#1857A6" />
          <Text style={styles.uploadFallbackText}>Upload instead</Text>
        </Pressable>
      ) : null}
    </View>
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
  checkCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 13, backgroundColor: "#FFFFFF", overflow: "hidden" },
  checkCardReady: { borderColor: "#B7DFC9", backgroundColor: "#F7FCF9" },
  checkMainAction: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  checkIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#F2F4F7", alignItems: "center", justifyContent: "center" },
  checkIconReady: { backgroundColor: "#1B8A5A" },
  checkCopy: { flex: 1 },
  checkTitle: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  checkSubtitle: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 3 },
  checkStatus: { color: "#98A2B3", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  checkStatusReady: { color: "#1B8A5A" },
  uploadFallbackButton: { minHeight: 36, borderTopWidth: 1, borderTopColor: "#EAECF0", flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#FAFCFF" },
  uploadFallbackText: { color: "#1857A6", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  privacyNote: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 12, textAlign: "center" },
  error: { color: "#D9363E", backgroundColor: "#FFF1F2", padding: 10, borderRadius: 10, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 14 },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { backgroundColor: "#A9C2DF" },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  secondaryButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 20 },
  secondaryText: { color: "#1857A6", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dashboardLink: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  dashboardLinkText: { color: "#667085", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
