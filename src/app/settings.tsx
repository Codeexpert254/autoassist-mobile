import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { requireSupabase } from "@/lib/supabase";
import { getMechanicProfile } from "@/services/repair-backend";
import { ensureJobNotifications } from "@/services/push-notifications";
import {
  disableFloatingOffers,
  enableFloatingOffersForMechanic,
  getFloatingOfferDiagnostics,
  getFloatingOfferStatus,
  openFloatingOfferPermissionSettings,
  setFloatingOffersOnline,
} from "@/services/floating-offers";

export default function Settings() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const isMechanic = Boolean(user && profile?.role === "mechanic");
  const [mechanic, setMechanic] = useState<any>(null);
  const [loadingMechanic, setLoadingMechanic] = useState(isMechanic);
  const [floating, setFloating] = useState(getFloatingOfferStatus);
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [debug, setDebug] = useState("");
  const [admin, setAdmin] = useState(false);
  const askedForOverlay = useRef(false);
  const mechRef = useRef<any>(null);
  mechRef.current = mechanic;

  const refreshPermissions = async () => {
    setFloating(getFloatingOfferStatus());
    try {
      const permissions = await Notifications.getPermissionsAsync();
      setPushGranted(permissions.granted);
    } catch {
      setPushGranted(null);
    }
  };

  useEffect(() => {
    void refreshPermissions();
    if (!isMechanic || !user) {
      setLoadingMechanic(false);
      return;
    }
    let mounted = true;
    void getMechanicProfile(user.id).then((result) => {
      if (!mounted) return;
      setMechanic(result.data ?? null);
      setLoadingMechanic(false);
      if (result.error) setMessage("Unable to verify your mechanic profile. Check your connection.");
    }).catch(() => {
      if (!mounted) return;
      setLoadingMechanic(false);
      setMessage("Unable to load your mechanic profile.");
    });
    return () => { mounted = false; };
  }, [user?.id, isMechanic]);

  useEffect(() => {
    if (Platform.OS !== "android" || !isMechanic || !user) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const current = getFloatingOfferStatus();
      // The mechanic explicitly tapped Enable before Android's settings
      // page opened. On permission grant, enable automatically: no second
      // tap and no permission-bypass or repeated permission nagging.
      if (askedForOverlay.current && current.hasPermission && mechRef.current?.verified) {
        try {
          enableFloatingOffersForMechanic(user.id);
          setFloatingOffersOnline(user.id, Boolean(mechRef.current.is_available));
          setMessage("Floating job alerts are on. They appear when you are online.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Unable to enable floating alerts.");
        }
      }
      askedForOverlay.current = false;
      void refreshPermissions();
    });
    return () => sub.remove();
  }, [isMechanic, user?.id]);

  const toggleFloating = (on: boolean) => {
    if (!isMechanic || !user || busy || loadingMechanic) return;
    setBusy(true);
    setMessage("");
    try {
      if (!on) {
        // This is a persistent opt-out; never turn it back on at next launch.
        askedForOverlay.current = false;
        disableFloatingOffers();
        setMessage("Floating job alerts are off. Standard push notifications can still arrive.");
      } else if (!mechanic?.verified) {
        setMessage("Complete mechanic verification before enabling floating job alerts.");
      } else if (!floating.supported) {
        setMessage("Floating alerts require the AutoAssist Android build.");
      } else if (!floating.hasPermission) {
        askedForOverlay.current = true;
        setMessage("Allow AutoAssist to appear on top in Android Settings. Alerts will be enabled when you return.");
        openFloatingOfferPermissionSettings();
      } else {
        enableFloatingOffersForMechanic(user.id);
        setFloatingOffersOnline(user.id, Boolean(mechanic.is_available));
        setMessage("Floating job alerts are on. They appear when you are online.");
      }
      setFloating(getFloatingOfferStatus());
    } catch (error) {
      askedForOverlay.current = false;
      setMessage(error instanceof Error ? error.message : "Unable to update floating job alerts.");
    } finally {
      setBusy(false);
    }
  };

  const setupPush = async () => {
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await ensureJobNotifications(user.id);
      setMessage(result.message);
      await refreshPermissions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to configure notifications.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    void requireSupabase().rpc("is_autoassist_admin" as never, {
      p_user_id: user.id, p_required_role: null,
    } as never).then(({ data }) => {
      if (active) setAdmin(Boolean(data));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [user?.id]);

  const floatingActive = floating.enabled && floating.hasPermission;
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Notifications and app preferences</Text>
          </View>
          <SymbolView name={{ ios: "gearshape.fill", android: "settings", web: "settings" } as never}
            size={22} tintColor="#1857A6" />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {isMechanic && Platform.OS === "android" ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Floating job alerts</Text>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Show over other apps</Text>
                  <Text style={styles.helper}>Display incoming job requests while using other applications. Works when your verified mechanic account is online.</Text>
                </View>
                <Switch
                  accessibilityLabel="Show floating job alerts over other apps"
                  value={floatingActive}
                  disabled={busy || loadingMechanic || !floating.supported || (!mechanic?.verified && !floatingActive)}
                  onValueChange={toggleFloating}
                  trackColor={{ false: "#D0D5DD", true: "#A9C2DF" }}
                  thumbColor={floatingActive ? "#1857A6" : "#F4F4F4"}
                />
              </View>
              <Text style={styles.status}>
                {!floating.supported ? "Requires the Android native build" :
                  floatingActive ? "Enabled" :
                  !floating.hasPermission ? "Android permission required" :
                  "Off"}
              </Text>
              <Text style={styles.helper}>Android requires you to approve "Appear on top" once. After approval, AutoAssist will finish enabling alerts automatically. You can turn them off here anytime.</Text>
              {floating.enabled && !floating.hasPermission ? (
                <Pressable style={styles.secondaryButton} onPress={openFloatingOfferPermissionSettings}>
                  <Text style={styles.secondaryText}>Review Android overlay permission</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Check background popup diagnostics"
                style={styles.secondaryButton}
                onPress={() => {
                  const d = getFloatingOfferDiagnostics();
                  const last = Number(d.lastFcmAt);
                  setDebug("Permission: " + d.permission + " • Enabled: " + d.enabled + " • Online: " + d.online +
                    "\nLast alert: " + (last > 0 ? new Date(last).toLocaleString() : "none") +
                    "\nLast result: " + d.lastDecision);
                }}
              >
                <Text style={styles.secondaryText}>Check background popup diagnostics</Text>
              </Pressable>
              {debug ? <Text style={styles.helper}>{debug}</Text> : null}
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Push notifications</Text>
            <Text style={styles.helper}>Get new job and service updates even while AutoAssist is not open. You control notification permissions in Android settings.</Text>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{pushGranted ? "Phone notifications allowed" : pushGranted === false ? "Notifications not allowed" : "Checking notifications"}</Text>
              </View>
              <Pressable style={styles.primaryButton} disabled={busy || !user} onPress={() => void setupPush()}>
                {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryText}>Set up</Text>}
              </Pressable>
            </View>
            {pushGranted === false ? (
              <Pressable style={styles.secondaryButton} onPress={() => void Linking.openSettings()}>
                <Text style={styles.secondaryText}>Open phone settings</Text>
              </Pressable>
            ) : null}
          </View>

          {admin ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Marketplace administration</Text>
              <Text style={styles.helper}>Verify shops and delivery riders, and manage the parts commission.</Text>
              <Pressable style={styles.secondaryButton} onPress={() => router.push("/admin/parts-marketplace")}>
                <Text style={styles.secondaryText}>Review parts shops and riders</Text>
              </Pressable>
            </View>
          ) : null}

          {message ? <Text style={styles.notice}>{message}</Text> : null}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#EAECF0" },
  backButton: { minWidth: 35, minHeight: 40, justifyContent: "center" },
  backText: { fontSize: 29, lineHeight: 33, color: "#102A43" },
  title: { color: "#102A43", fontSize: 21, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 11, marginTop: 3, fontFamily: "Inter_400Regular" },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  card: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 16, backgroundColor: "#FFFFFF", gap: 13 },
  sectionTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  settingTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 4 },
  helper: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 },
  status: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  primaryButton: { minHeight: 40, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#1857A6", justifyContent: "center", alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  secondaryButton: { minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  secondaryText: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  notice: { borderRadius: 12, padding: 13, color: "#1857A6", backgroundColor: "#F0F7FF", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 },
});
