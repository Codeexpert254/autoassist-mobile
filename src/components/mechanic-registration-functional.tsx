import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import {
  saveMechanicProfile as saveMechanicProfileBackend,
  updateOwnProfile,
} from "@/services/repair-backend";

export default function MechanicRegistrationFunctional() {
  const router = useRouter();
  const { backendEnabled, user, profile, refreshProfile } = useAuth();
  const { state, saveMechanicProfile, refreshBackend } = useRepairFlow();
  const current = state.mechanicProfile;
  const providerType = profile?.provider_type === "garage" ? "garage" : "individual";
  const isGarage = providerType === "garage";

  const [fullName, setFullName] = useState(profile?.full_name || current.fullName);
  const [phone, setPhone] = useState(profile?.phone || current.phone);
  const [garageName, setGarageName] = useState(isGarage ? current.garageName : "");
  const [location, setLocation] = useState(current.location);
  const [services, setServices] = useState(current.services);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valid =
    fullName.trim().length >= 2 &&
    phone.trim().length >= 2 &&
    location.trim().length >= 2 &&
    services.trim().length >= 2 &&
    (!isGarage || garageName.trim().length >= 2);

  const continueToVerification = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError("");

    const providerDisplayName = isGarage ? garageName.trim() : fullName.trim();
    const localProfile = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      nationalId: current.nationalId,
      garageName: providerDisplayName,
      location: location.trim(),
      services: services.trim(),
    };

    try {
      if (backendEnabled) {
        if (!user || profile?.role !== "mechanic") {
          throw new Error("Sign in with a Mechanic account before creating a provider profile.");
        }

        const profileResult = await updateOwnProfile(user.id, {
          fullName: localProfile.fullName,
          phone: localProfile.phone,
        });
        if (profileResult.error) throw profileResult.error;

        const mechanicResult = await saveMechanicProfileBackend(user.id, {
          providerType,
          garageName: localProfile.garageName,
          location: localProfile.location,
          services: localProfile.services.split(",").map((item) => item.trim()).filter(Boolean),
        });
        if (mechanicResult.error) throw mechanicResult.error;

        await refreshProfile();
      }

      saveMechanicProfile(localProfile);
      await refreshBackend();
      router.replace("/mechanic/verification");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save mechanic profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{isGarage ? "Garage registration" : "Individual mechanic profile"}</Text>
            <Text style={styles.subtitle}>
              {isGarage
                ? "Set up the repair business profile motorists will see."
                : "Set up your professional mechanic profile for motorists."}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.typeCard}>
            <Text style={styles.typeLabel}>MECHANIC TYPE</Text>
            <Text style={styles.typeValue}>{isGarage ? "Garage / business" : "Individual mechanic"}</Text>
            <Text style={styles.typeHint}>
              {isGarage
                ? "Verification will use the garage/business permit."
                : "Verification will use your National ID."}
            </Text>
          </View>

          <Field label={isGarage ? "Contact person's full name" : "Full name"} value={fullName} onChangeText={setFullName} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {isGarage ? (
            <Field label="Garage / business name" value={garageName} onChangeText={setGarageName} placeholder="e.g. Nairobi Auto Care" />
          ) : null}
          <Field label="Primary service location" value={location} onChangeText={setLocation} placeholder="e.g. Ngara, Nairobi" />
          <Field label="Services" value={services} onChangeText={setServices} placeholder="Brakes, diagnostics, suspension" />

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Verification comes next</Text>
            <Text style={styles.infoText}>
              {isGarage
                ? "After saving this profile, prepare a valid business permit, relevant certificates and a profile/business photo for review."
                : "After saving this profile, prepare your National ID, relevant certificates and a profile photo for review."}
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ height: 90 }} />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            disabled={!valid || loading}
            style={[styles.primaryButton, (!valid || loading) && styles.disabled]}
            onPress={() => void continueToVerification()}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Continue to verification</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Field({ label, ...props }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={styles.input} placeholderTextColor="#98A2B3" autoCorrect={false} />
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
  content: { padding: 20 },
  typeCard: { padding: 14, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#EAF2FD", borderRadius: 14, marginBottom: 20 },
  typeLabel: { color: "#667085", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  typeValue: { color: "#1857A6", fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  typeHint: { color: "#475467", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 5 },
  infoCard: { padding: 14, borderWidth: 1, borderColor: "#E4E7EC", backgroundColor: "#F8FAFC", borderRadius: 14, marginTop: 4 },
  infoTitle: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  infoText: { color: "#475467", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 5 },
  fieldWrap: { marginBottom: 16 },
  label: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  input: { minHeight: 52, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 14, color: "#344054", fontFamily: "Inter_400Regular", fontSize: 14, backgroundColor: "#FFFFFF" },
  error: { color: "#D9363E", backgroundColor: "#FFF1F2", padding: 10, borderRadius: 10, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: "#EAECF0" },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center" },
  disabled: { backgroundColor: "#A9C2DF" },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
