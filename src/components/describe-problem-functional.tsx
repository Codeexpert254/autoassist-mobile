import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  type ProblemDetails,
  useRepairFlow,
} from "@/context/repair-flow-context";

type LocationState = "detecting" | "detected" | "manual" | "error";

export default function DescribeProblemFunctional() {
  const router = useRouter();
  const { state, saveProblem } = useRepairFlow();

  const [description, setDescription] = useState(state.problem.description);
  const [symptom, setSymptom] = useState<ProblemDetails["symptom"]>(
    state.problem.symptom,
  );
  const [locationText, setLocationText] = useState(state.problem.location);
  const [preferredTime, setPreferredTime] = useState(
    state.problem.preferredTime,
  );
  const [locationState, setLocationState] = useState<LocationState>("detecting");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const detectCurrentLocation = useCallback(async () => {
    setLocationState("detecting");
    setLocationError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setLocationState("manual");
        setLocationError(
          "Location permission was not granted. Enter your location manually below.",
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = current.coords;
      setCoordinates({ latitude, longitude });

      let readableLocation = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = results[0];

        if (place) {
          const parts = [
            place.name,
            place.street,
            place.district,
            place.city,
            place.region,
          ].filter((value): value is string => Boolean(value));

          const uniqueParts = [...new Set(parts)];
          if (uniqueParts.length > 0) {
            readableLocation = uniqueParts.join(", ");
          }
        }
      } catch {
        // Coordinates are still usable when reverse geocoding is unavailable.
      }

      setLocationText(readableLocation);
      setLocationState("detected");
    } catch {
      setCoordinates(null);
      setLocationState("error");
      setLocationError(
        "We could not detect your current location. Enter or edit the location manually.",
      );
    }
  }, []);

  useEffect(() => {
    void detectCurrentLocation();
  }, [detectCurrentLocation]);

  const valid =
    description.trim().length >= 10 && locationText.trim().length >= 3;

  const handleFindMechanics = () => {
    if (!valid) return;

    saveProblem({
      description: description.trim(),
      symptom,
      location: locationText.trim(),
      preferredTime: preferredTime.trim() || "As soon as possible",
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    });

    router.push("/motorist/dispatch-status");
  };

  const manualLocationEnabled =
    locationState === "manual" || locationState === "error";

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Describe the problem</Text>
            <Text style={styles.subtitle}>
              {state.vehicleSaved
                ? `${state.vehicle.make} ${state.vehicle.model} • ${state.vehicle.year} • ${state.vehicle.powerSource}`
                : "Vehicle details are optional — you can add them later."}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>What are you noticing?</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the sound, warning light or behaviour..."
            placeholderTextColor="#98A2B3"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Quick symptom</Text>
          <View style={styles.choiceWrap}>
            {(["Brakes", "Engine", "Electrical", "Other"] as const).map(
              (item) => (
                <Pressable
                  key={item}
                  onPress={() => setSymptom(item)}
                  style={[
                    styles.choice,
                    symptom === item && styles.choiceActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      symptom === item && styles.choiceTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ),
            )}
          </View>

          <View style={styles.locationHeader}>
            <View style={styles.locationTitleWrap}>
              <Text style={styles.label}>Current location</Text>
              <Text style={styles.helperText}>
                AutoAssist uses your location to dispatch a nearby verified mechanic.
              </Text>
            </View>
            {locationState === "detected" ? (
              <Pressable onPress={() => setLocationState("manual")}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            ) : null}
          </View>

          {locationState === "detecting" ? (
            <View style={styles.locationCard}>
              <ActivityIndicator size="small" color="#1857A6" />
              <View style={styles.locationCopy}>
                <Text style={styles.locationTitle}>Detecting your location…</Text>
                <Text style={styles.locationMeta}>
                  Allow location access when your phone asks.
                </Text>
              </View>
            </View>
          ) : locationState === "detected" ? (
            <View style={[styles.locationCard, styles.locationCardDetected]}>
              <View style={styles.pinCircle}>
                <Text style={styles.pinText}>●</Text>
              </View>
              <View style={styles.locationCopy}>
                <Text style={styles.locationTitle}>{locationText}</Text>
                <Text style={styles.locationMeta}>
                  GPS location detected
                  {coordinates
                    ? ` • ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
                    : ""}
                </Text>
              </View>
            </View>
          ) : (
            <>
              {locationError ? (
                <View style={styles.locationErrorCard}>
                  <Text style={styles.locationErrorText}>{locationError}</Text>
                </View>
              ) : null}
              <TextInput
                style={styles.input}
                value={locationText}
                onChangeText={(value) => {
                  setLocationText(value);
                  setCoordinates(null);
                }}
                placeholder="Enter your location, e.g. Westlands, Nairobi"
                placeholderTextColor="#98A2B3"
              />
            </>
          )}

          <View style={styles.locationActions}>
            <Pressable
              style={styles.locationButton}
              onPress={() => void detectCurrentLocation()}
            >
              <Text style={styles.locationButtonText}>Use current location</Text>
            </Pressable>
            {manualLocationEnabled ? (
              <Text style={styles.manualHint}>Manual entry is enabled.</Text>
            ) : null}
          </View>

          <Text style={[styles.label, styles.preferredTimeLabel]}>
            Preferred time
          </Text>
          <TextInput
            style={styles.input}
            value={preferredTime}
            onChangeText={setPreferredTime}
            placeholder="As soon as possible"
            placeholderTextColor="#98A2B3"
          />

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <Text style={styles.infoText}>
              AutoAssist will rank verified, available mechanics using service fit, distance, ratings and reliability, then notify the strongest match. You only pay the KES 500 connection fee after a mechanic accepts your request.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            disabled={!valid}
            onPress={handleFindMechanics}
            style={[styles.primaryButton, !valid && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>Find suitable help</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EAECF0",
  },
  backButton: { width: 34, minHeight: 38, justifyContent: "center" },
  backText: { color: "#102A43", fontSize: 28, lineHeight: 32, fontFamily: "Inter_600SemiBold" },
  headerCopy: { flex: 1 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subtitle: { marginTop: 5, color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  scroll: { flex: 1 },
  content: { padding: 20 },
  label: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: "#344054",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  multilineInput: { minHeight: 112, paddingTop: 14, paddingBottom: 14, marginBottom: 22 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  choice: {
    minHeight: 38,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  choiceActive: { borderColor: "#1857A6", backgroundColor: "#EAF2FD" },
  choiceText: { color: "#667085", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  choiceTextActive: { color: "#1857A6" },
  locationHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  locationTitleWrap: { flex: 1 },
  helperText: { marginTop: -2, marginBottom: 10, color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  editText: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  locationCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#B8D2F0",
    borderRadius: 12,
    backgroundColor: "#F7FAFE",
  },
  locationCardDetected: { borderColor: "#B7DFC9", backgroundColor: "#F2FAF6" },
  pinCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EAF7F1", alignItems: "center", justifyContent: "center" },
  pinText: { color: "#1B8A5A", fontSize: 15 },
  locationCopy: { flex: 1 },
  locationTitle: { color: "#102A43", fontSize: 13, lineHeight: 18, fontFamily: "Inter_600SemiBold" },
  locationMeta: { marginTop: 5, color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular" },
  locationErrorCard: { padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#F3C5C9", borderRadius: 10, backgroundColor: "#FFF1F2" },
  locationErrorText: { color: "#A12830", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  locationActions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10, marginBottom: 24 },
  locationButton: { minHeight: 38, paddingHorizontal: 14, borderWidth: 1, borderColor: "#1857A6", borderRadius: 9, alignItems: "center", justifyContent: "center" },
  locationButtonText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  manualHint: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular" },
  preferredTimeLabel: { marginTop: 2 },
  infoCard: { marginTop: 22, padding: 14, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E4E7EC" },
  infoTitle: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  infoText: { marginTop: 6, color: "#667085", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular" },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: "#EAECF0", backgroundColor: "#FFFFFF" },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center" },
  primaryButtonDisabled: { backgroundColor: "#A9C2DF" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
