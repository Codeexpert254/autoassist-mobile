import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import {
  deleteMotoristVehicle,
  getMotoristVehicles,
  inferFuelType,
  normalizePowerSource,
} from "@/services/vehicle-backend";

export default function VehicleDetails() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { state, liveBackend, refreshBackend } = useRepairFlow();
  const [liveVehicle, setLiveVehicle] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!liveBackend || !user || profile?.role !== "motorist") return;

    let mounted = true;
    void getMotoristVehicles(user.id).then(({ data }) => {
      if (!mounted) return;
      setLiveVehicle(data?.[0] ?? null);
    });

    return () => {
      mounted = false;
    };
  }, [liveBackend, user?.id, profile?.role]);

  const vehicle = useMemo(() => {
    if (liveVehicle) {
      return {
        make: liveVehicle.make,
        model: liveVehicle.model,
        year: String(liveVehicle.year),
        registration: liveVehicle.registration,
        powerSource: normalizePowerSource(liveVehicle.power_source),
        fuelType: inferFuelType(liveVehicle.power_source, liveVehicle.fuel_type),
        transmission: liveVehicle.transmission,
      };
    }

    return {
      make: state.vehicle.make,
      model: state.vehicle.model,
      year: state.vehicle.year,
      registration: state.vehicle.registration,
      powerSource: normalizePowerSource(state.vehicle.powerSource),
      fuelType: inferFuelType(state.vehicle.powerSource, (state.vehicle as any).fuelType),
      transmission: state.vehicle.transmission,
    };
  }, [liveVehicle, state.vehicle]);

  const handleDeleteVehicle = () => {
    if (!user || !liveVehicle?.id || deleting) return;

    Alert.alert(
      "Delete vehicle?",
      `Remove ${vehicle.make} ${vehicle.model} (${vehicle.registration}) from AutoAssist? If it has past repair jobs, those records will stay in your service history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete vehicle",
          style: "destructive",
          onPress: () => {
            setDeleting(true);
            setDeleteError("");
            void deleteMotoristVehicle(user.id, liveVehicle.id)
              .then(async ({ error }) => {
                if (error) throw error;
                await refreshBackend();
                router.replace("/motorist/home");
              })
              .catch((error) => {
                setDeleteError(error instanceof Error ? error.message : "Unable to delete this vehicle. Please try again.");
              })
              .finally(() => setDeleting(false));
          },
        },
      ],
    );
  };

  if (!state.vehicleSaved && !liveVehicle) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <Header title="Vehicle details" onBack={() => router.back()} />
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No vehicle added yet</Text>
            <Text style={styles.emptyText}>Add your vehicle details to get more accurate mechanic and spare-parts matching.</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push({ pathname: "/motorist/addavehicle", params: { mode: "add" } })}
            >
              <Text style={styles.primaryButtonText}>Add a vehicle</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const fuelLabel = vehicle.powerSource === "Electric" ? "Not applicable" : vehicle.fuelType ?? "Not set";

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <Header title="Vehicle details" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>CURRENT VEHICLE</Text>
            <Text style={styles.vehicleName}>{vehicle.make} {vehicle.model}</Text>
            <Text style={styles.vehicleMeta}>{vehicle.year} • {vehicle.registration}</Text>
          </View>

          <Text style={styles.sectionTitle}>Vehicle summary</Text>
          <View style={styles.detailsCard}>
            <DetailRow label="Make" value={vehicle.make} />
            <DetailRow label="Model" value={vehicle.model} />
            <DetailRow label="Year" value={vehicle.year} />
            <DetailRow label="Registration" value={vehicle.registration} />
            <DetailRow label="Power source" value={vehicle.powerSource} />
            <DetailRow label="Fuel type" value={fuelLabel} />
            <DetailRow label="Transmission" value={vehicle.transmission} last />
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push({ pathname: "/motorist/addavehicle", params: { mode: "edit" } })}
          >
            <Text style={styles.primaryButtonText}>Edit vehicle</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push({ pathname: "/motorist/addavehicle", params: { mode: "add" } })}
          >
            <Text style={styles.secondaryButtonText}>Add another vehicle</Text>
          </Pressable>

          {liveBackend && liveVehicle?.id ? (
            <Pressable
              disabled={deleting}
              style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
              onPress={handleDeleteVehicle}
            >
              {deleting ? (
                <ActivityIndicator color="#B42318" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete vehicle</Text>
              )}
            </Pressable>
          ) : null}

          {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack}>
        <Image source={require("../../../assets/images/left-arrow.png")} style={styles.backIcon} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 20, marginBottom: 22, flexDirection: "row", alignItems: "center", gap: 12 },
  backIcon: { width: 14, height: 14 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  content: { paddingBottom: 32 },
  heroCard: { backgroundColor: "#123D76", borderRadius: 16, padding: 18, marginBottom: 28 },
  eyebrow: { color: "#D9E8FA", fontSize: 10, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  vehicleName: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_600SemiBold" },
  vehicleMeta: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 7 },
  sectionTitle: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  detailsCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, paddingHorizontal: 16, marginBottom: 24 },
  detailRow: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: "#EAECF0", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  detailValue: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right", flexShrink: 1 },
  primaryButton: { height: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  secondaryButton: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#1857A6", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginTop: 12 },
  secondaryButtonText: { color: "#1857A6", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deleteButton: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginTop: 20 },
  deleteButtonDisabled: { opacity: 0.6 },
  deleteButtonText: { color: "#B42318", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deleteError: { color: "#B42318", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 8, textAlign: "center" },
  emptyState: { marginTop: 40, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 20 },
  emptyTitle: { color: "#102A43", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { color: "#667085", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 8, marginBottom: 20 },
});
