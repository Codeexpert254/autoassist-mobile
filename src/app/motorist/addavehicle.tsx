import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDemoApp } from "@/context/demo-app-context";

export default function AddVehicle() {
  const router = useRouter();
  const { state, saveVehicle } = useDemoApp();
  const [make, setMake] = useState(state.vehicle.make);
  const [model, setModel] = useState(state.vehicle.model);
  const [year, setYear] = useState(state.vehicle.year);
  const [registration, setRegistration] = useState(state.vehicle.registration);
  const [fuel, setFuel] = useState(state.vehicle.fuel);
  const [transmission, setTransmission] = useState(state.vehicle.transmission);

  const canSave =
    make.trim() !== "" &&
    model.trim() !== "" &&
    year.trim() !== "" &&
    registration.trim() !== "";

  const handleSave = () => {
    if (!canSave) return;
    saveVehicle({ make, model, year, registration, fuel, transmission });
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
          Vehicle details help us match the right specialist and parts.
        </Text>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Field label="Make" value={make} onChangeText={setMake} />
          <Field label="Model" value={model} onChangeText={setModel} />

          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" />
            </View>
            <View style={styles.half}>
              <Field label="Registration" value={registration} onChangeText={setRegistration} autoCapitalize="characters" />
            </View>
          </View>

          <Field label="Fuel type" value={fuel} onChangeText={setFuel} />
          <Field label="Transmission" value={transmission} onChangeText={setTransmission} />

          <Pressable
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
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="#98A2B3"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 20, gap: 12, flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backIcon: { width: 14, height: 14 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subTitle: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 24 },
  content: { paddingBottom: 32 },
  fieldWrap: { marginBottom: 18 },
  label: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 5 },
  input: { height: 52, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#FFFFFF", paddingHorizontal: 14, color: "#344054", fontFamily: "Inter_400Regular", fontSize: 14 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  saveButton: { height: 48, borderRadius: 12, backgroundColor: "#1857A6", justifyContent: "center", marginTop: 10 },
  saveButtonDisabled: { backgroundColor: "#A9C2DF" },
  saveText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "center" },
});
