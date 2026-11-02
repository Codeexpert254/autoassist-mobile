import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type PowerSource, useRepairFlow } from "@/context/repair-flow-context";

const powerSources: PowerSource[] = ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"];
const transmissions = ["Automatic", "Manual"];

export default function AddVehicle() {
  const router = useRouter();
  const { state, saveVehicle } = useRepairFlow();
  const [make, setMake] = useState(state.vehicle.make);
  const [model, setModel] = useState(state.vehicle.model);
  const [year, setYear] = useState(state.vehicle.year);
  const [registration, setRegistration] = useState(state.vehicle.registration);
  const [powerSource, setPowerSource] = useState<PowerSource>(state.vehicle.powerSource);
  const [transmission, setTransmission] = useState(state.vehicle.transmission);

  const canSave =
    make.trim() !== "" &&
    model.trim() !== "" &&
    /^\d{4}$/.test(year.trim()) &&
    registration.trim() !== "";

  const handleSave = () => {
    if (!canSave) return;
    saveVehicle({
      make: make.trim(),
      model: model.trim(),
      year: year.trim(),
      registration: registration.trim().toUpperCase(),
      powerSource,
      transmission,
    });
    router.replace("/motorist/home");
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image source={require("../../../assets/images/left-arrow.png")} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.title}>Add a vehicle</Text>
        </View>
        <Text style={styles.subTitle}>
          Vehicle details help us match the right specialist and compatible parts.
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
          <Text style={styles.helper}>Choose what powers this vehicle.</Text>
          <View style={styles.choiceWrap}>
            {powerSources.map((source) => (
              <Pressable
                key={source}
                onPress={() => setPowerSource(source)}
                style={[styles.choice, powerSource === source && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, powerSource === source && styles.choiceTextActive]}>{source}</Text>
              </Pressable>
            ))}
          </View>

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

          <Pressable
            disabled={!canSave}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
          >
            <Text style={styles.saveText}>Save vehicle</Text>
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
  saveButton: { height: 48, borderRadius: 12, backgroundColor: "#1857A6", justifyContent: "center", marginTop: 10 },
  saveButtonDisabled: { backgroundColor: "#A9C2DF" },
  saveText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "center" },
});
