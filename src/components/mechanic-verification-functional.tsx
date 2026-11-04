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
import { verifyNationalIdImageMatchesNumber } from "@/services/id-ocr";
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

type EvidenceKey = "nationalId" | "businessPermit" | "certificates" | "profilePhoto";
type VerificationStatus = "not-submitted" | "draft" | "pending" | "approved" | "rejected";

const emptyEvidence: MechanicVerificationEvidence = {
  nationalIdPath: null,
  businessPermitPath: null,
  certificatePaths: [],
  profilePhotoPath: null,
};

const emptyChecklist: MechanicVerificationChecklist = {
  identityClaimed: false,
  nationalId: false,
  businessPermit: false,
  certificates: false,
  profilePhoto: false,
};

export default function MechanicVerificationFunctional() {
  const router = useRouter();
  const { backendEnabled, user, profile } = useAuth();
  const { state, submitVerification, refreshBackend } = useRepairFlow();
  const isGarage = profile?.provider_type === "garage";

  const [checklist, setChecklist] = useState<MechanicVerificationChecklist>(emptyChecklist);
  const [evidence, setEvidence] = useState<MechanicVerificationEvidence>(emptyEvidence);
  const [identityNumber, setIdentityNumber] = useState("");
  const [status, setStatus] = useState<VerificationStatus>(
    state.mechanicProfile.verified ? "approved" : "not-submitted",
  );
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const [registeringIdentity, setRegisteringIdentity] = useState(false);
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
      const nationalIdPath = record.national_id_path ?? record.national_id_front_path ?? null;

      setChecklist({
        identityClaimed: Boolean(record.identity_claimed),
        nationalId: Boolean(record.national_id_confirmed && nationalIdPath),
        businessPermit: Boolean(record.business_permit_confirmed && record.business_permit_path),
        certificates: Boolean(record.certificates_confirmed && (record.certificate_paths?.length ?? 0) > 0),
        profilePhoto: Boolean(record.profile_photo_confirmed && record.profile_photo_path),
      });
      setEvidence({
        nationalIdPath,
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

  const uploadKindFor = (key: EvidenceKey): VerificationImageKind => {
    if (key === "nationalId") return "national-id";
    if (key === "businessPermit") return "business-permit";
    if (key === "certificates") return "certificate";
    return "profile-photo";
  };

  const validateAsset = (key: EvidenceKey, asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) throw new Error("The selected image could not be read.");
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      throw new Error("Verification images must be smaller than 10 MB.");
    }
    if (key === "nationalId" || key === "businessPermit") {
      if ((asset.width ?? 0) < 500 || (asset.height ?? 0) < 300) {
        throw new Error("The document image is too small to read clearly. Move closer and retake it in good light.");
      }
    }
  };

  const requireIdNumberBeforeIdImage = () => {
    if (identityNumber.trim().length < 6) {
      setError(
        checklist.identityClaimed
          ? "Enter the National ID number again before replacing the saved ID image. AutoAssist must match the new image to the number."
          : "Enter your National ID number first, then take or upload the ID photo so AutoAssist can match them.",
      );
      return false;
    }
    return true;
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
      let identityClaimed = checklist.identityClaimed;

      for (const asset of assets) {
        validateAsset(key, asset);

        if (key === "nationalId" && !isGarage) {
          const enteredNumber = identityNumber.trim();
          if (enteredNumber.length < 6) {
            throw new Error("Enter your National ID number before taking or uploading the ID photo.");
          }

          setRegisteringIdentity(true);
          await verifyNationalIdImageMatchesNumber(asset.uri, enteredNumber);
          await registerMechanicIdentityNumber(enteredNumber);
          identityClaimed = true;
        }

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
        identityClaimed,
        nationalId: Boolean(nextEvidence.nationalIdPath),
        businessPermit: Boolean(nextEvidence.businessPermitPath),
        certificates: nextEvidence.certificatePaths.length > 0,
        profilePhoto: Boolean(nextEvidence.profilePhotoPath),
      };

      const { error: draftError } = await saveMechanicVerificationDraft(user.id, nextChecklist, nextEvidence);
      if (draftError) throw draftError;

      setEvidence(nextEvidence);
      setChecklist(nextChecklist);
      if (key === "nationalId" && identityClaimed) setIdentityNumber("");
      setStatus((current) => (current === "rejected" ? "rejected" : "draft"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this verification image.");
    } finally {
      setRegisteringIdentity(false);
      setUploadingKey(null);
    }
  };

  const chooseFromLibrary = async (key: EvidenceKey) => {
    if (uploadingKey) return;
    if (key === "nationalId" && !isGarage && !requireIdNumberBeforeIdImage()) return;

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
    if (key === "nationalId" && !isGarage && !requireIdNumberBeforeIdImage()) return;

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

  const individualIdentityReady = checklist.identityClaimed && identityNumber.trim().length === 0;
  const requiredEvidenceReady = isGarage
    ? checklist.businessPermit && checklist.profilePhoto
    : individualIdentityReady && checklist.nationalId && checklist.profilePhoto;

  const submit = async () => {
    if (!requiredEvidenceReady || loading || uploadingKey || registeringIdentity) return;

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
      if (!isGarage && identityNumber.trim()) {
        throw new Error(
          "You changed the ID number. Retake or upload the National ID so AutoAssist can match the new number before submitting.",
        );
      }
      if (!isGarage && !checklist.identityClaimed) {
        throw new Error("Enter your National ID number, then take or upload the ID photo so AutoAssist can match them.");
      }

      const providerChecklist: MechanicVerificationChecklist = {
        identityClaimed: isGarage ? false : checklist.identityClaimed,
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

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{isGarage ? "Garage verification" : "Individual mechanic verification"}</Text>
            <Text style={styles.subtitle}>Submit only the evidence needed to verify this provider account.</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {approved ? (
            <StatusCard tone="approved" title="AutoAssist verified" text="Your mechanic profile is approved and can receive live repair requests." />
          ) : status === "pending" ? (
            <StatusCard
              tone="pending"
              title="Verification under review"
              text={isGarage
                ? "AutoAssist will review the business permit and provider profile before approval."
                : "AutoAssist will review the submitted National ID before final approval."}
            />
          ) : status === "rejected" ? (
            <StatusCard tone="rejected" title="Verification needs attention" text={reviewNote || "Correct the requested evidence and submit again."} />
          ) : (
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>{isGarage ? "Verify the garage/business" : "Verify your National ID"}</Text>
              <Text style={styles.introText}>
                {isGarage
                  ? "Provide a clear business permit and a garage/business profile photo. Skill certificates can be added later."
                  : "Enter your ID number first. AutoAssist reads the ID photo on your device and will only accept it when the detected number matches. Skill certificates can be added later."}
              </Text>
            </View>
          )}

          {!locked && !isGarage ? (
            <View style={styles.identityCard}>
              <Text style={styles.identityTitle}>National ID number</Text>
              <Text style={styles.identityHelp}>
                {checklist.identityClaimed
                  ? "The saved ID image has been matched to an ID number. To correct it, enter the new number and capture or upload the ID again."
                  : "Enter the number exactly as printed on your National ID, then capture or upload the ID. The image is checked on-device before it is saved."}
              </Text>
              <TextInput
                style={styles.identityInput}
                value={identityNumber}
                onChangeText={setIdentityNumber}
                placeholder={checklist.identityClaimed ? "Enter a new number only to correct it" : "Enter National ID number"}
                placeholderTextColor="#98A2B3"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading && !registeringIdentity}
              />
              {checklist.identityClaimed && !identityNumber.trim() ? (
                <View style={styles.identityReadyRow}>
                  <SymbolView name="checkmark.shield.fill" size={18} tintColor="#1B8A5A" />
                  <Text style={styles.identityReadyText}>ID number matched to the saved document</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.list}>
            {isGarage ? (
              <ChecklistCard
                title="Business permit"
                subtitle={checklist.businessPermit ? "Business permit saved securely" : "Capture the full valid business permit clearly"}
                checked={checklist.businessPermit}
                uploading={uploadingKey === "businessPermit"}
                onPress={() => void captureWithCamera("businessPermit")}
                onUpload={() => void chooseFromLibrary("businessPermit")}
                disabled={locked || Boolean(uploadingKey)}
              />
            ) : (
              <ChecklistCard
                title="National ID"
                subtitle={
                  checklist.nationalId && checklist.identityClaimed
                    ? "ID number matched and image saved securely"
                    : "Enter the ID number above, then capture the side where that number is clearly visible"
                }
                checked={checklist.nationalId && checklist.identityClaimed}
                uploading={uploadingKey === "nationalId"}
                onPress={() => void captureWithCamera("nationalId")}
                onUpload={() => void chooseFromLibrary("nationalId")}
                disabled={locked || Boolean(uploadingKey)}
              />
            )}

            <ChecklistCard
              title={isGarage ? "Garage / business profile photo" : "Professional profile photo"}
              subtitle={
                checklist.profilePhoto
                  ? "Profile image saved securely"
                  : isGarage
                    ? "Take a clear photo of the garage/business profile or frontage"
                    : "Take a clear professional profile photo"
              }
              checked={checklist.profilePhoto}
              uploading={uploadingKey === "profilePhoto"}
              onPress={() => void captureWithCamera("profilePhoto")}
              onUpload={() => void chooseFromLibrary("profilePhoto")}
              disabled={locked || Boolean(uploadingKey)}
            />

            {!locked ? (
              <ChecklistCard
                title="Skill certificates · Optional"
                subtitle={
                  evidence.certificatePaths.length > 0
                    ? `${evidence.certificatePaths.length} certificate image${evidence.certificatePaths.length === 1 ? "" : "s"} saved`
                    : "You can upload certificates now or add them later from your mechanic profile"
                }
                checked={checklist.certificates}
                uploading={uploadingKey === "certificates"}
                onPress={() => void captureWithCamera("certificates")}
                onUpload={() => void chooseFromLibrary("certificates")}
                disabled={Boolean(uploadingKey)}
              />
            ) : null}
          </View>

          {!locked ? (
            <View style={styles.reviewInfoCard}>
              <Text style={styles.reviewInfoTitle}>What AutoAssist checks</Text>
              {isGarage ? (
                <>
                  <Text style={styles.reviewInfoText}>• The uploaded document appears to be a valid business permit.</Text>
                  <Text style={styles.reviewInfoText}>• The permit details correspond to the garage/business being registered.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.reviewInfoText}>• On-device OCR must detect the same ID number you entered before the image is accepted.</Text>
                  <Text style={styles.reviewInfoText}>• A reviewer still checks that the document appears genuine before final approval.</Text>
                </>
              )}
              <Text style={styles.reviewInfoText}>• Skill certificates do not block initial verification and can be added later.</Text>
            </View>
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
              disabled={!requiredEvidenceReady || loading || Boolean(uploadingKey) || registeringIdentity}
              style={[
                styles.primaryButton,
                (!requiredEvidenceReady || loading || Boolean(uploadingKey) || registeringIdentity) && styles.disabled,
              ]}
              onPress={() => void submit()}
            >
              {loading || registeringIdentity ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>{status === "rejected" ? "Resubmit verification" : "Submit verification"}</Text>
              )}
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

function StatusCard({ tone, title, text }: { tone: "approved" | "pending" | "rejected"; title: string; text: string }) {
  const tint = tone === "approved" ? "#1B8A5A" : tone === "pending" ? "#D98200" : "#D9363E";
  return (
    <View style={[styles.statusCard, tone === "approved" ? styles.approvedCard : tone === "pending" ? styles.pendingCard : styles.rejectedCard]}>
      <SymbolView name={tone === "approved" ? "checkmark.seal.fill" : tone === "pending" ? "clock.fill" : "exclamationmark.triangle.fill"} size={27} tintColor={tint} />
      <View style={styles.statusCopy}>
        <Text style={[styles.statusTitle, { color: tint }]}>{title}</Text>
        <Text style={styles.statusText}>{text}</Text>
      </View>
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
          <Text style={styles.checkSubtitle}>{uploading ? "Checking and saving securely…" : subtitle}</Text>
        </View>
        <Text style={[styles.checkStatus, checked && styles.checkStatusReady]}>{uploading ? "CHECKING" : checked ? "READY" : "CAMERA"}</Text>
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
  statusTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusText: { color: "#475467", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 4 },
  identityCard: { borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 14, padding: 14, marginBottom: 14, backgroundColor: "#FFFFFF" },
  identityTitle: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  identityHelp: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 10 },
  identityInput: { height: 46, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 12, color: "#102A43", fontSize: 13, fontFamily: "Inter_400Regular", backgroundColor: "#FFFFFF" },
  identityReadyRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10 },
  identityReadyText: { color: "#1B8A5A", fontSize: 10, fontFamily: "Inter_600SemiBold" },
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
  reviewInfoCard: { marginTop: 16, padding: 14, borderRadius: 13, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E4E7EC" },
  reviewInfoTitle: { color: "#102A43", fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  reviewInfoText: { color: "#667085", fontSize: 10, lineHeight: 16, fontFamily: "Inter_400Regular" },
  error: { color: "#D9363E", backgroundColor: "#FFF1F2", padding: 10, borderRadius: 10, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 14 },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { backgroundColor: "#A9C2DF" },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  secondaryButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 20 },
  secondaryText: { color: "#1857A6", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dashboardLink: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  dashboardLinkText: { color: "#667085", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
