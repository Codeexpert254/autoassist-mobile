import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import {
  type VehicleFuelType,
  type VehiclePowerSource,
  getMotoristVehicles,
  inferFuelType,
  normalizePowerSource,
  saveMotoristVehicle,
} from "@/services/vehicle-backend";

const powerSources: VehiclePowerSource[] = ["Non-hybrid", "Hybrid", "Electric"];
const fuelTypes: VehicleFuelType[] = ["Petrol", "Diesel"];
const transmissions = ["Automatic", "Manual"];

export default function AddVehicle() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditing = mode === "edit";
  const { user, profile } = useAuth();
  const { state, liveBackend, saveVehicle, refreshBackend } = useRepairFlow();

  const [make, setMake] = useState(isEditing ? state.vehicle.make : "");
  const [model, setModel] = useState(isEditing ? state.vehicle.model : "");
  const [year, setYear] = useState(isEditing ? state.vehicle.year : "");
  const [registration, setRegistration] = useState(isEditing ? state.vehicle.registration : "");
  const [powerSource, setPowerSource] = useState<VehiclePowerSource | null>(
    isEditing ? normalizePowerSource(state.vehicle.powerSource) : null,
  );
  const [fuelType, setFuelType] = useState<VehicleFuelType | null>(
    isEditing ? inferFuelType(state.vehicle.powerSource, (state.vehicle as any).fuelType) : null,
  );
  const [transmission, setTransmission] = useState(isEditing ? state.vehicle.transmission : "");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing || !liveBackend || !user || profile?.role !== "motorist") return;

    let mounted = true;

    void getMotoristVehicles(user.id).then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const vehicle = data?.[0];
      if (!vehicle) return;

      setEditingVehicleId(vehicle.id);
      setMake(vehicle.make);
      setModel(vehicle.model);
      setYear(String(vehicle.year));
      setRegistration(vehicle.registration);
      setPowerSource(normalizePowerSource(vehicle.power_source));
      setFuelType(inferFuelType(vehicle.power_source, vehicle.fuel_type));
      setTransmission(vehicle.transmission);
    });

    return () => {
      mounted = false;
    };
  }, [isEditing, liveBackend, user?.id, profile?.role]);

  const canSave =
    make.trim() !== "" &&
    model.trim() !== "" &&
    /^\d{4}$/.test(year.trim()) &&
    registration.trim() !== "" &&
    Boolean(powerSource) &&
    transmission !== "" &&
    (powerSource === "Electric" || Boolean(fuelType));

  const selectPowerSource = (source: VehiclePowerSource) => {
    setPowerSource(source);
    if (source === "Electric") setFuelType(null);
  };

  const handleSave = async () => {
    if (!canSave || !powerSource || saving) return;

    setSaving(true);
    setErrorMessage(null);

    const vehicle = {
      make: make.trim(),
      model: model.trim(),
      year: Number(year.trim()),
      registration: registration.trim().toUpperCase(),
      powerSource,
      fuelType: powerSource === "Electric" ? null : fuelType,
      transmission,
    };

    try {
      if (liveBackend && user && profile?.role === "motorist") {
        if (isEditing && !editingVehicleId) {
          throw new Error("We could not identify the vehicle to edit. Please return to Vehicle Details and try again.");
        }

        const { error } = await saveMotoristVehicle(
          user.id,
          vehicle,
          isEditing ? editingVehicleId ?? undefined : undefined,
        );
        if (error) throw error;
        await refreshBackend();
      } else {
        saveVehicle({
          make: vehicle.make,
          model: vehicle.model,
          year: String(vehicle.year),
          registration: vehicle.registration,
          powerSource: vehicle.powerSource as any,
          transmission: vehicle.transmission,
          fuelType: vehicle.fuelType,
        } as any);
      }

      router.replace("/motorist/vehicle-details");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save this vehicle.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image source={require("../../../assets/images/left-arrow.png")} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.title}>{isEditing ? "Edit vehicle" : "Add a vehicle"}</Text>
        </View>
        <Text style={styles.subTitle}>
          {isEditing
            ? "Update the vehicle details below. These changes will be used across AutoAssist."
            : "Vehicle details help us match the right specialist and compatible parts."}
        </Text>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Field label="Make" value={make} onChangeText={setMake} placeholder="Toyota" />
          <Field label="Model" value={model} onChangeText={setModel} placeholder="Fielder" />

          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="2015" />
            </View>
            <View style={styles.half}>
              <Field label="Registration" value={registration} onChangeText={setRegistration} autoCapitalize="characters" placeholder="KDA XXX X" />
            </View>
          </View>

          <Text style={styles.label}>Power source</Text>
          <Text style={styles.helper}>Choose the vehicle power system.</Text>
          <View style={styles.choiceWrap}>
            {powerSources.map((source) => (
              <Pressable
                key={source}
                onPress={() => selectPowerSource(source)}
                style={[styles.choice, powerSource === source && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, powerSource === source && styles.choiceTextActive]}>{source}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Fuel type</Text>
          {powerSource === "Electric" ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Fuel type is not required for a fully electric vehicle.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.helper}>Choose the fuel used by this vehicle.</Text>
              <View style={styles.choiceWrap}>
                {fuelTypes.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setFuelType(item)}
                    style={[styles.choice, fuelType === item && styles.choiceActive]}
                  >
                    <Text style={[styles.choiceText, fuelType === item && styles.choiceTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.label, styles.transmissionLabel]}>Transmission</Text>
          <View style={styles.choiceWrap}>
            {transmissions.map((item) => (
              <Pressable
                key={item}
                onPress={() => setTransmission(item)}
                style={[styles.choice, transmission === item && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, transmission === item && styles.choiceTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            disabled={!canSave || saving}
            style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
          >
            <Text style={styles.saveText}>
              {saving ? "Saving..." : isEditing ? "Save changes" : "Add vehicle"}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Field({ label, ...props }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={styles.input} placeholderTextColor="#98A2B3" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 20, gap: 12, flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backIcon: { width: 14, height: 14 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subTitle: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 24 },
  content: { paddingBottom: 32 },
  fieldWrap: { marginBottom: 18 },
  label: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 5 },
  helper: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 9 },
  input: { height: 52, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#FFFFFF", paddingHorizontal: 14, color: "#344054", fontFamily: "Inter_400Regular", fontSize: 14 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  choice: { minHeight: 38, borderRadius: 19, borderWidth: 1, borderColor: "#D0D5DD", paddingHorizontal: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  choiceActive: { borderColor: "#1857A6", backgroundColor: "#1857A6" },
  choiceText: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  choiceTextActive: { color: "#FFFFFF" },
  transmissionLabel: { marginTop: 2 },
  infoBox: { backgroundColor: "#F5F9FE", borderWidth: 1, borderColor: "#D5E4F7", borderRadius: 10, padding: 12, marginBottom: 20 },
  infoText: { color: "#344054", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  errorText: { color: "#B42318", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginBottom: 12 },
  saveButton: { height: 48, borderRadius: 12, backgroundColor: "#1857A6", justifyContent: "center", marginTop: 10 },
  saveButtonDisabled: { backgroundColor: "#A9C2DF" },
  saveText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "center" },
});
