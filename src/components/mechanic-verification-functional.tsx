import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import {
  getMechanicVerification,
  registerMechanicIdentityNumber,
  saveMechanicVerificationDraft,
  submitMechanicVerification,
  uploadMechanicVerificationImage,
  type MechanicVerificationChecklist,
  type MechanicVerificationEvidence,
  type VerificationImageKind,
} from "@/services/mechanic-verification-backend";

type EvidenceKey =
  | "nationalIdFront"
  | "nationalIdBack"
  | "identitySelfie"
  | "businessPermit"
  | "certificates"
  | "profilePhoto";
type VerificationStatus = "not-submitted" | "draft" | "pending" | "approved" | "rejected";

const emptyEvidence: MechanicVerificationEvidence = {
  nationalIdFrontPath: null,
  nationalIdBackPath: null,
  selfiePath: null,
  businessPermitPath: null,
  certificatePaths: [],
  profilePhotoPath: null,
};

const emptyChecklist: MechanicVerificationChecklist = {
  identityClaimed: false,
  nationalIdFront: false,
  nationalIdBack: false,
  identitySelfie: false,
  businessPermit: false,
  certificates: false,
  profilePhoto: false,
};

export default function MechanicVerificationFunctional() {
  const router = useRouter();
  const { backendEnabled, user, profile } = useAuth();
  const { state, submitVerification, refreshBackend } = useRepairFlow();
  const providerType = profile?.provider_type === "garage" ? "garage" : "individual";
  const isGarage = providerType === "garage";

  const [checklist, setChecklist] = useState<MechanicVerificationChecklist>(emptyChecklist);
  const [evidence, setEvidence] = useState<MechanicVerificationEvidence>(emptyEvidence);
  const [identityNumber, setIdentityNumber] = useState("");
  const [registeringIdentity, setRegisteringIdentity] = useState(false);
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
        setChecklist(emptyChecklist);
        setEvidence(emptyEvidence);
        return;
      }

      const record = data as any;
      const frontPath = record.national_id_front_path ?? record.national_id_path ?? null;
      const backPath = record.national_id_back_path ?? null;
      const selfiePath = record.selfie_path ?? null;

      setChecklist({
        identityClaimed: Boolean(record.identity_claimed),
        nationalIdFront: Boolean(frontPath),
        nationalIdBack: Boolean(backPath),
        identitySelfie: Boolean(selfiePath),
        businessPermit: Boolean(record.business_permit_confirmed && record.business_permit_path),
        certificates: Boolean(record.certificates_confirmed && (record.certificate_paths?.length ?? 0) > 0),
        profilePhoto: Boolean(record.profile_photo_confirmed && record.profile_photo_path),
      });
      setEvidence({
        nationalIdFrontPath: frontPath,
        nationalIdBackPath: backPath,
        selfiePath,
        businessPermitPath: record.business_permit_path,
        certificatePaths: record.certificate_paths ?? [],
        profilePhotoPath: record.profile_photo_path,
      });
      setReviewNote(record.review_note);
      setStatus(
        record.status === "approved"
          ? "approved"
          : record.status === "rejected"
            ? "rejected"
            : record.status === "pending"
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

  const registerIdentity = async () => {
    if (!identityNumber.trim() || registeringIdentity || status === "pending" || status === "approved") return;
    if (!backendEnabled) {
      setChecklist((current) => ({ ...current, identityClaimed: true }));
      setIdentityNumber("");
      setStatus("draft");
      return;
    }

    setRegisteringIdentity(true);
    setError("");
    try {
      await registerMechanicIdentityNumber(identityNumber);
      setChecklist((current) => ({ ...current, identityClaimed: true }));
      setIdentityNumber("");
      setStatus("draft");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to register this identity number.");
    } finally {
      setRegisteringIdentity(false);
    }
  };

  const uploadKindFor = (key: EvidenceKey): VerificationImageKind => {
    switch (key) {
      case "nationalIdFront":
        return "national-id-front";
      case "nationalIdBack":
        return "national-id-back";
      case "identitySelfie":
        return "identity-selfie";
      case "businessPermit":
        return "business-permit";
      case "certificates":
        return "certificate";
      default:
        return "profile-photo";
    }
  };

  const validateAsset = (key: EvidenceKey, asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) throw new Error("The selected image could not be read.");
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      throw new Error("Verification images must be smaller than 10 MB.");
    }
    if (["nationalIdFront", "nationalIdBack", "businessPermit"].includes(key)) {
      if ((asset.width ?? 0) < 500 || (asset.height ?? 0) < 300) {
        throw new Error("The document image is too small to review clearly. Move closer and retake it in good light.");
      }
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
        validateAsset(key, asset);
        const { data, error: uploadError } = await uploadMechanicVerificationImage({
          userId: user.id,
          kind: uploadKindFor(key),
          uri: asset.uri,
          mimeType: asset.mimeType,
        });
        if (uploadError) throw uploadError;

        if (key === "nationalIdFront") nextEvidence.nationalIdFrontPath = data.path;
        if (key === "nationalIdBack") nextEvidence.nationalIdBackPath = data.path;
        if (key === "identitySelfie") nextEvidence.selfiePath = data.path;
        if (key === "businessPermit") nextEvidence.businessPermitPath = data.path;
        if (key === "profilePhoto") nextEvidence.profilePhotoPath = data.path;
        if (key === "certificates" && !nextEvidence.certificatePaths.includes(data.path)) {
          nextEvidence.certificatePaths.push(data.path);
        }
      }

      const nextChecklist: MechanicVerificationChecklist = {
        identityClaimed: checklist.identityClaimed,
        nationalIdFront: Boolean(nextEvidence.nationalIdFrontPath),
        nationalIdBack: Boolean(nextEvidence.nationalIdBackPath),
        identitySelfie: Boolean(nextEvidence.selfiePath),
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
    if (uploadingKey || key === "identitySelfie") return;

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
        quality: 0.9,
        exif: false,
      });

      if (result.canceled || !result.assets?.length) return;
      await persistImages(key, result.assets);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open photos on this device.");
    }
  };

  const offerUploadFallback = (key: EvidenceKey, message: string) => {
    if (key === "identitySelfie") {
      Alert.alert(
        "Live selfie required",
        `${message} Identity verification requires a new selfie taken with the front camera. Please use a device with a working camera or contact AutoAssist support for manual verification.`,
        [{ text: "OK" }],
      );
      return;
    }

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

      const isFrontCamera = key === "identitySelfie" || (key === "profilePhoto" && !isGarage);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        cameraType: isFrontCamera ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
        allowsEditing: key === "profilePhoto",
        quality: 0.9,
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

  const allReady =
    checklist.identityClaimed &&
    checklist.nationalIdFront &&
    checklist.nationalIdBack &&
    checklist.identitySelfie &&
    (!isGarage || checklist.businessPermit) &&
    checklist.certificates &&
    checklist.profilePhoto;

  const submit = async () => {
    if (!allReady || loading || uploadingKey || registeringIdentity) return;

    const providerChecklist: MechanicVerificationChecklist = {
      identityClaimed: checklist.identityClaimed,
      nationalIdFront: checklist.nationalIdFront,
      nationalIdBack: checklist.nationalIdBack,
      identitySelfie: checklist.identitySelfie,
      businessPermit: isGarage ? checklist.businessPermit : false,
      certificates: checklist.certificates,
      profilePhoto: checklist.profilePhoto,
    };

    const providerEvidence: MechanicVerificationEvidence = {
      nationalIdFrontPath: evidence.nationalIdFrontPath,
      nationalIdBackPath: evidence.nationalIdBackPath,
      selfiePath: evidence.selfiePath,
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
      setStatus((data as any).status === "rejected" ? "rejected" : "pending");
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
  const accountName = profile?.full_name?.trim() || "your AutoAssist account name";

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{isGarage ? "Garage verification" : "Individual mechanic verification"}</Text>
            <Text style={styles.subtitle}>Identity evidence is reviewed before a provider can receive motorists.</Text>
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
                <Text style={styles.statusText}>A reviewer will check document validity, the account-name match, the live selfie against the ID portrait, certificates, and {isGarage ? "the business permit." : "the submitted identity evidence."}</Text>
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
              <Text style={styles.introTitle}>{isGarage ? "Verify the business and contact person" : "Verify your identity"}</Text>
              <Text style={styles.introText}>Use clear, uncropped documents in good light. A random image can be uploaded, but it will not pass review: the document and person must match the account.</Text>
            </View>
          )}

          {!locked ? (
            <View style={styles.identityCard}>
              <Text style={styles.identityTitle}>{isGarage ? "Contact person's National ID number" : "National ID number"}</Text>
              <Text style={styles.identityHelp}>The number is used only to prevent duplicate mechanic identities. AutoAssist stores a one-way server fingerprint, not the plaintext number.</Text>
              {checklist.identityClaimed ? (
                <View style={styles.identityReadyRow}>
                  <SymbolView name="checkmark.shield.fill" size={19} tintColor="#1B8A5A" />
                  <Text style={styles.identityReadyText}>Identity number registered securely</Text>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.identityInput}
                    value={identityNumber}
                    onChangeText={setIdentityNumber}
                    placeholder="Enter National ID number"
                    placeholderTextColor="#98A2B3"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!registeringIdentity}
                  />
                  <Pressable
                    style={[styles.identityButton, (!identityNumber.trim() || registeringIdentity) && styles.disabled]}
                    disabled={!identityNumber.trim() || registeringIdentity}
                    onPress={() => void registerIdentity()}
                  >
                    {registeringIdentity ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.identityButtonText}>Register identity number</Text>}
                  </Pressable>
                </>
              )}
              <Text style={styles.nameMatchText}>The name printed on the ID should match: {accountName}</Text>
            </View>
          ) : null}

          <View style={styles.list}>
            {isGarage ? (
              <ChecklistCard
                title="Business permit"
                subtitle={checklist.businessPermit ? "Business permit image saved securely" : "Capture the valid permit showing the registered business details"}
                checked={checklist.businessPermit}
                uploading={uploadingKey === "businessPermit"}
                onPress={() => void captureWithCamera("businessPermit")}
                onUpload={() => void chooseFromLibrary("businessPermit")}
                disabled={locked || Boolean(uploadingKey)}
              />
            ) : null}

            <ChecklistCard
              title={isGarage ? "Contact person ID — front" : "National ID — front"}
              subtitle={checklist.nationalIdFront ? "Front of ID saved securely" : "Capture the full front side with the portrait and printed details visible"}
              checked={checklist.nationalIdFront}
              uploading={uploadingKey === "nationalIdFront"}
              onPress={() => void captureWithCamera("nationalIdFront")}
              onUpload={() => void chooseFromLibrary("nationalIdFront")}
              disabled={locked || Boolean(uploadingKey)}
            />

            <ChecklistCard
              title={isGarage ? "Contact person ID — back" : "National ID — back"}
              subtitle={checklist.nationalIdBack ? "Back of ID saved securely" : "Capture the entire back side clearly; do not crop the document edges"}
              checked={checklist.nationalIdBack}
              uploading={uploadingKey === "nationalIdBack"}
              onPress={() => void captureWithCamera("nationalIdBack")}
              onUpload={() => void chooseFromLibrary("nationalIdBack")}
              disabled={locked || Boolean(uploadingKey)}
            />

            <ChecklistCard
              title="Live identity selfie"
              subtitle={checklist.identitySelfie ? "Fresh front-camera selfie saved securely" : "Take a new selfie now. Gallery upload is disabled for identity selfies."}
              checked={checklist.identitySelfie}
              uploading={uploadingKey === "identitySelfie"}
              onPress={() => void captureWithCamera("identitySelfie")}
              onUpload={() => {}}
              disabled={locked || Boolean(uploadingKey)}
              allowUpload={false}
            />

            <ChecklistCard
              title="Skill certificates"
              subtitle={
                evidence.certificatePaths.length > 0
                  ? `${evidence.certificatePaths.length} certificate image${evidence.certificatePaths.length === 1 ? "" : "s"} saved • Tap again to add another`
                  : "Photograph a certificate or upload up to 5 clear certificate images"
              }
              checked={checklist.certificates}
              uploading={uploadingKey === "certificates"}
              onPress={() => void captureWithCamera("certificates")}
              onUpload={() => void chooseFromLibrary("certificates")}
              disabled={locked || Boolean(uploadingKey)}
            />

            <ChecklistCard
              title={isGarage ? "Garage / business profile photo" : "Professional profile photo"}
              subtitle={
                checklist.profilePhoto
                  ? "Profile image saved securely"
                  : isGarage
                    ? "Photograph the garage or business frontage/profile"
                    : "Take a clear professional profile photo"
              }
              checked={checklist.profilePhoto}
              uploading={uploadingKey === "profilePhoto"}
              onPress={() => void captureWithCamera("profilePhoto")}
              onUpload={() => void chooseFromLibrary("profilePhoto")}
              disabled={locked || Boolean(uploadingKey)}
            />
          </View>

          {!locked ? (
            <View style={styles.reviewInfoCard}>
              <Text style={styles.reviewInfoTitle}>What AutoAssist will verify</Text>
              <Text style={styles.reviewInfoText}>• The submission looks like a valid identity document, not a random photo.</Text>
              <Text style={styles.reviewInfoText}>• The ID name matches the mechanic account name.</Text>
              <Text style={styles.reviewInfoText}>• The fresh selfie visually matches the portrait on the ID.</Text>
              <Text style={styles.reviewInfoText}>• Skill certificates appear relevant and authentic.</Text>
              {isGarage ? <Text style={styles.reviewInfoText}>• The business permit matches the garage/business details.</Text> : null}
            </View>
          ) : null}

          {!locked ? (
            <Text style={styles.privacyNote}>Verification images are private and stored under your AutoAssist account for review. A document upload alone never verifies a provider.</Text>
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
            <Pressable
              disabled={!allReady || loading || Boolean(uploadingKey) || registeringIdentity}
              style={[styles.primaryButton, (!allReady || loading || Boolean(uploadingKey) || registeringIdentity) && styles.disabled]}
              onPress={() => void submit()}
            >
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
  allowUpload = true,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  uploading: boolean;
  onPress: () => void;
  onUpload: () => void;
  disabled: boolean;
  allowUpload?: boolean;
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
      {allowUpload && !disabled && !uploading ? (
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
  introCard: { padding: 15, borderRadius: 14, backgroundColor: "#EAF2FD", borderWidth: 1, borderColor: "#B8D2F0", marginBottom: 14 },
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
  identityCard: { borderRadius: 14, borderWidth: 1, borderColor: "#D6E4F5", backgroundColor: "#F8FBFF", padding: 14, marginBottom: 14 },
  identityTitle: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  identityHelp: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 4 },
  identityInput: { minHeight: 46, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 12, color: "#102A43", fontSize: 13, fontFamily: "Inter_400Regular", backgroundColor: "#FFFFFF", marginTop: 12 },
  identityButton: { minHeight: 43, borderRadius: 10, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 8 },
  identityButtonText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  identityReadyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: "#EAF7F1" },
  identityReadyText: { color: "#1B8A5A", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  nameMatchText: { color: "#475467", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 9 },
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
  reviewInfoCard: { marginTop: 14, borderRadius: 13, borderWidth: 1, borderColor: "#E4E7EC", padding: 13, backgroundColor: "#FCFCFD" },
  reviewInfoTitle: { color: "#102A43", fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 5 },
  reviewInfoText: { color: "#667085", fontSize: 10, lineHeight: 16, fontFamily: "Inter_400Regular" },
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