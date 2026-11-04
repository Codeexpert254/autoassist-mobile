import * as Location from "expo-location";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import { getConnectionContact, getConnectionPayment, getDispatchRequest, getMechanicActiveRepairs } from "@/services/dispatch-backend";
import { readTripPosition, publishTripPosition, subscribeToTripPosition, type TripPosition } from "@/services/mechanic-trip";
import { startBackgroundTripTracking, stopBackgroundTripTracking } from "@/services/trip-background";
import { updateRepairStatus } from "@/services/repair-backend";

type TripRole = "mechanic" | "motorist";
const mapKeyConfigured = Boolean(Constants.expoConfig?.extra?.googleMapsConfigured);
const validPoint = (latitude: unknown, longitude: unknown): LatLng | null => {
  const lat = Number(latitude), lon = Number(longitude);
  if (latitude == null || longitude == null || !Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
};

function directKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => d * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function cleanPhone(number: string): string {
  return number.replace(/[^0-9+]/g, "");
}

export function LiveTripMap({ role }: { role: TripRole }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const { user, profile } = useAuth();
  const { refreshBackend } = useRepairFlow();
  const providedId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const [requestId, setRequestId] = useState<string | null>(providedId ?? null);
  const [request, setRequest] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [position, setPosition] = useState<TripPosition | null>(null);
  const [ownGPS, setOwnGPS] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [backgroundOn, setBackgroundOn] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const mapRef = useRef<MapView>(null);
  const lastSentAt = useRef(0);
  const mounted = useRef(true);
  const fitted = useRef(false);
  const previousRequestId = useRef(requestId);

  const authorized = role === profile?.role && Boolean(user);
  const destination = validPoint(request?.latitude, request?.longitude);
  const mechanicPoint = role === "mechanic"
    ? ownGPS ?? validPoint(position?.latitude, position?.longitude)
    : validPoint(position?.latitude, position?.longitude);
  const status = String(request?.status ?? "");
  const tripActive = status === "en-route";
  const tripEnded = ["arrived", "repair-complete", "completed", "cancelled"].includes(status);
  const lastUpdate = position?.updated_at ? Date.parse(position.updated_at) : NaN;
  const isFresh = Number.isFinite(lastUpdate) && Date.now() - lastUpdate < 35000;

  const refresh = async (id: string) => {
    if (!user || !authorized) return;
    try {
      const [r, p] = await Promise.all([getDispatchRequest(id), getConnectionPayment(id)]);
      if (r.error) throw r.error;
      if (p.error) throw p.error;
      if (!r.data || (role === "mechanic" ? r.data.mechanic_id : r.data.motorist_id) !== user.id) {
        throw new Error("This journey is not assigned to your account.");
      }
      if (p.data?.status !== "paid" || !r.data.contact_unlocked_at) {
        throw new Error("Tracking is available only after the AutoAssist connection is confirmed.");
      }
      if (!mounted.current) return;
      setRequest(r.data);
      if (role === "mechanic" && !contact) {
        const c = await getConnectionContact(id);
        if (mounted.current) setContact(c?.contact ?? null);
      }
      const gps = await readTripPosition(id);
      if (mounted.current) setPosition(gps);
      if (role === "mechanic" && r.data.status !== "en-route") {
        void stopBackgroundTripTracking();
        setBackgroundOn(false);
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Unable to load this trip.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (previousRequestId.current !== requestId) {
      fitted.current = false;
      previousRequestId.current = requestId;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    let unsub: (() => void) | undefined;
    const start = async () => {
      if (!authorized || !user) {
        setError("Sign in to the correct account to view this journey.");
        setLoading(false);
        return;
      }
      let id = requestId;
      if (!id && role === "mechanic") {
        const active = await getMechanicActiveRepairs(user.id);
        if (active.error) {
          setError(active.error.message);
          setLoading(false);
          return;
        }
        id = active.data?.[0]?.id ?? null;
        if (id) setRequestId(id);
      }
      if (!id) {
        setError("No active trip was found.");
        setLoading(false);
        return;
      }
      await refresh(id);
      // Supabase realtime moves the motorist's marker whenever the mechanic
      // publishes a new GPS fix. A slow poll recovers missed socket events.
      unsub = subscribeToTripPosition(id, () => {
        void readTripPosition(id!).then((pos) => {
          if (mounted.current) setPosition(pos);
        }).catch(() => undefined);
      });
      timer = setInterval(() => void refresh(id!), 9000);
    };
    void start().catch((e) => {
      setError(e instanceof Error ? e.message : "Unable to load this trip.");
      setLoading(false);
    });
    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
      unsub?.();
    };
  }, [requestId, user?.id, role, authorized]);

  useEffect(() => {
    if (role !== "mechanic" || !tripActive || !requestId || !user) return;
    let disposed = false;
    let subscription: Location.LocationSubscription | null = null;
    const onLocation = (fix: Location.LocationObject) => {
      if (disposed) return;
      const coords = validPoint(fix.coords.latitude, fix.coords.longitude);
      if (!coords) return;
      setOwnGPS(coords);
      if (Date.now() - lastSentAt.current < 4500) return;
      lastSentAt.current = Date.now();
      void publishTripPosition(requestId, user.id, fix.coords).catch((e) => {
        if (!disposed) setNotice(e instanceof Error ? e.message : "Position sharing unavailable.");
      });
    };
    void (async () => {
      const grant = await Location.requestForegroundPermissionsAsync();
      if (!grant.granted) {
        if (!disposed) setNotice("Allow precise location in Android Settings to share your position while navigating.");
        return;
      }
      try {
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        onLocation(first);
        if (!disposed) {
          subscription = await Location.watchPositionAsync({
            accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10,
          }, onLocation, (e) => { if (!disposed) setNotice(e); });
        }
        if (disposed) subscription?.remove();
      } catch (e) {
        if (!disposed) setNotice(e instanceof Error ? e.message : "Unable to start live GPS.");
      }
    })();
    return () => { disposed = true; subscription?.remove(); };
  }, [role, tripActive, requestId, user?.id]);

  const focusMap = () => {
    if (!destination) return;
    const points: LatLng[] = mechanicPoint ? [mechanicPoint, destination] : [destination];
    if (points.length === 2) {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 95, bottom: 110, left: 65, right: 65 }, animated: true,
      });
    } else {
      mapRef.current?.animateToRegion({
        ...destination, latitudeDelta: 0.02, longitudeDelta: 0.02,
      }, 500);
    }
  };

  useEffect(() => {
    if (fitted.current || !destination || !mechanicPoint || (Platform.OS === "android" && !mapKeyConfigured)) return;
    fitted.current = true;
    const wait = setTimeout(focusMap, 500);
    return () => clearTimeout(wait);
  }, [destination?.latitude, destination?.longitude, mechanicPoint?.latitude != null]);

  const beginJourney = async () => {
    if (!requestId || !user || working) return;
    setWorking(true);
    setError("");
    try {
      const grant = await Location.requestForegroundPermissionsAsync();
      if (!grant.granted) throw new Error("Allow location access before starting your journey.");
      const result = await updateRepairStatus(requestId, "en-route");
      if (result.error) throw result.error;
      await refreshBackend();
      setRequest(result.data);
      setNotice("Journey started. The customer can track your position while AutoAssist is open. You can optionally enable background tracking.");
      try {
        const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setOwnGPS({ latitude: fix.coords.latitude, longitude: fix.coords.longitude });
        await publishTripPosition(requestId, user.id, fix.coords);
      } catch {
        setNotice("Journey started. Waiting for the first precise GPS fix.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start navigation.");
    } finally {
      setWorking(false);
    }
  };

  const allowBackground = () => {
    if (!requestId || !user) return;
    Alert.alert(
      "Keep sharing during this journey?",
      "AutoAssist will share your GPS position with this customer while the job is en route, even when the app is in the background. Android shows an ongoing location notification. Tracking ends when you arrive, cancel, or sign out.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Enable background tracking", onPress: () => {
          void (async () => {
            setWorking(true);
            try {
              const permission = await Location.requestBackgroundPermissionsAsync();
              if (!permission.granted) {
                setNotice("Background location was not allowed. Tracking continues while the map is open.");
                return;
              }
              const enabled = await startBackgroundTripTracking(requestId, user.id);
              setBackgroundOn(enabled);
              setNotice(enabled ? "Background tracking is on. The customer sees updates even if you switch apps." : "Background location permission is required.");
            } catch (e) {
              setNotice(e instanceof Error ? e.message : "Unable to start background tracking.");
            } finally {
              setWorking(false);
            }
          })();
        } },
      ],
    );
  };

  const arrived = async () => {
    if (!requestId || working) return;
    setWorking(true);
    setError("");
    try {
      const result = await updateRepairStatus(requestId, "arrived");
      if (result.error) throw result.error;
      await stopBackgroundTripTracking();
      await refreshBackend();
      router.replace({ pathname: "/mechanic/job-details", params: { requestId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to mark your arrival.");
    } finally {
      setWorking(false);
    }
  };

  const goBack = () => {
    router.replace(role === "mechanic"
      ? { pathname: "/mechanic/job-details", params: { requestId: requestId ?? "" } }
      : { pathname: "/motorist/mechanic-assigned", params: { requestId: requestId ?? "" } });
  };

  const phone = role === "mechanic" ? cleanPhone(String(contact?.phone ?? "")) : "";
  const distance = destination && mechanicPoint ? directKm(mechanicPoint, destination) : null;
  const validMap = Platform.OS !== "android" || mapKeyConfigured;
  const subtitle = role === "mechanic" ? "Live journey to the motorist" : "Mechanic's live journey to you";

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <SymbolView name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" } as never} size={21} tintColor="#102A43" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{role === "mechanic" ? "Navigate to customer" : "Track your mechanic"}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={[styles.dot, tripActive && isFresh && styles.liveDot]} />
            <Text style={styles.statusText}>{tripEnded ? "Arrived" : tripActive && isFresh ? "LIVE" : tripActive ? "Updating" : "Ready"}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#1857A6" size="large" />
            <Text style={styles.muted}>Preparing the journey…</Text>
          </View>
        ) : !destination || error && !request ? (
          <View style={styles.center}>
            <SymbolView name={{ ios: "mappin.slash", android: "location_off", web: "location_off" } as never} size={37} tintColor="#667085" />
            <Text style={styles.emptyTitle}>Customer's precise location is unavailable</Text>
            <Text style={styles.muted}>{error || "Ask the customer to create a request with location enabled to use in-app navigation."}</Text>
            <Pressable style={styles.primary} onPress={goBack}><Text style={styles.primaryText}>Back to assignment</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={styles.mapContainer}>
              {validMap ? (
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFill}
                  initialRegion={{
                    ...destination, latitudeDelta: 0.035, longitudeDelta: 0.035,
                  }}
                  showsCompass
                  showsScale={false}
                  toolbarEnabled={false}
                  showsUserLocation={role === "mechanic"}
                  onMapReady={focusMap}
                >
                  <Marker coordinate={destination} title="Customer" description={String(request?.location_text ?? "")}
                    pinColor="#E44747" />
                  {mechanicPoint ? (
                    <>
                      <Marker coordinate={mechanicPoint} title={role === "mechanic" ? "You" : "Your mechanic"}
                        description="Latest shared GPS position" pinColor="#1857A6" />
                      <Polyline coordinates={[mechanicPoint, destination]}
                        strokeColor="#1857A6" strokeWidth={3} lineDashPattern={[9, 8]} />
                    </>
                  ) : null}
                </MapView>
              ) : (
                <View style={styles.mapUnavailable}>
                  <SymbolView name={{ ios: "map.fill", android: "map", web: "map" } as never} size={44} tintColor="#1857A6" />
                  <Text style={styles.emptyTitle}>Google Maps setup needed</Text>
                  <Text style={styles.muted}>Configure a Maps SDK for Android key and rebuild the development app to display map tiles.</Text>
                </View>
              )}
              {validMap ? (
                <Pressable style={styles.recenter} accessibilityRole="button" accessibilityLabel="Recenter map"
                  onPress={focusMap}>
                  <SymbolView name={{ ios: "location.north.line.fill", android: "my_location", web: "my_location" } as never}
                    size={22} tintColor="#1857A6" />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.tripInfo}>
              <View style={styles.topLine}>
                <View style={styles.infoIcon}>
                  <SymbolView name={{ ios: "mappin.circle.fill", android: "place", web: "place" } as never}
                    size={22} tintColor="#1857A6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>CUSTOMER DESTINATION</Text>
                  <Text style={styles.address} numberOfLines={2}>{request.location_text || "Pinned customer location"}</Text>
                </View>
                <View style={styles.distanceBox}>
                  <Text style={styles.distance}>{distance == null ? "—" : distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</Text>
                  <Text style={styles.label}>DIRECT DISTANCE</Text>
                </View>
              </View>
              <Text style={styles.helper}>
                {tripEnded ? "The mechanic has arrived. Live sharing has ended." :
                  role === "mechanic"
                    ? tripActive ? (backgroundOn ? "Sharing GPS while navigating and in the background." : "Sharing GPS while this screen is open.")
                      : "Start the journey to share your location with the customer."
                    : tripActive ? (isFresh ? "Mechanic location is updating live." : "Waiting for a recent GPS update from your mechanic.")
                      : "Tracking begins when your mechanic starts their journey."}
              </Text>
              {position && !isFresh && tripActive ? (
                <Text style={styles.stale}>Last position: {new Date(position.updated_at).toLocaleTimeString()} • May be out of date</Text>
              ) : null}
              {mechanicPoint && <Text style={styles.routeNote}>Dashed line shows direct distance, not a road route. Drive using road signs and safe navigation guidance.</Text>}
              {role === "mechanic" && phone ? (
                <View style={styles.contactRow}>
                  <Pressable style={[styles.contactButton, styles.callButton]} accessibilityRole="button"
                    accessibilityLabel="Call customer" onPress={() => void Linking.openURL(`tel:${phone}`)}>
                    <SymbolView name={{ ios: "phone.fill", android: "call", web: "call" } as never} size={18} tintColor="#FFFFFF" />
                    <Text style={styles.callText}>Call</Text>
                  </Pressable>
                  <Pressable style={[styles.contactButton, styles.messageButton]} accessibilityRole="button"
                    accessibilityLabel="Message customer" onPress={() => void Linking.openURL(`sms:${phone}`)}>
                    <SymbolView name={{ ios: "message.fill", android: "sms", web: "sms" } as never} size={18} tintColor="#1857A6" />
                    <Text style={styles.messageText}>Message</Text>
                  </Pressable>
                </View>
              ) : null}
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {role === "mechanic" && status === "connected" ? (
                <Pressable style={styles.primary} disabled={working} onPress={() => void beginJourney()}>
                  {working ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <SymbolView name={{ ios: "arrow.triangle.turn.up.right.diamond.fill", android: "navigation", web: "navigation" } as never} size={18} tintColor="#FFFFFF" />
                      <Text style={styles.primaryText}>Start journey</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
              {role === "mechanic" && tripActive ? (
                <>
                  <Pressable style={styles.primary} disabled={working} onPress={() => void arrived()}>
                    {working ? <ActivityIndicator color="#FFFFFF" /> : (
                      <>
                        <SymbolView name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" } as never} size={19} tintColor="#FFFFFF" />
                        <Text style={styles.primaryText}>I have arrived</Text>
                      </>
                    )}
                  </Pressable>
                  {Platform.OS === "android" && !backgroundOn ? (
                    <Pressable style={styles.backgroundAction} disabled={working} onPress={allowBackground}>
                      <Text style={styles.backgroundText}>Enable background GPS tracking</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              {tripEnded && <Pressable style={styles.primary} onPress={goBack}><Text style={styles.primaryText}>Back to assignment</Text></Pressable>}
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#EAECF0" },
  back: { width: 36, height: 42, justifyContent: "center", alignItems: "center" },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: "#102A43" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 3, color: "#667085" },
  statusPill: { borderRadius: 15, backgroundColor: "#F0F7FF", flexDirection: "row", paddingHorizontal: 10, paddingVertical: 7, gap: 5, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 5, backgroundColor: "#98A2B3" },
  liveDot: { backgroundColor: "#16A568" },
  statusText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#1857A6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: "#102A43", textAlign: "center" },
  muted: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 19, color: "#667085", textAlign: "center" },
  mapContainer: { flex: 1, minHeight: 240, position: "relative", backgroundColor: "#EAF2FD" },
  mapUnavailable: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 12 },
  recenter: { position: "absolute", right: 16, bottom: 18, width: 46, height: 46, borderRadius: 15, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF", elevation: 3 },
  tripInfo: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "#EAECF0", backgroundColor: "#FFFFFF" },
  topLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon: { width: 39, height: 39, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#F0F7FF" },
  label: { color: "#667085", fontFamily: "Inter_600SemiBold", fontSize: 8, letterSpacing: 0.6 },
  address: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 3, lineHeight: 17 },
  distanceBox: { minWidth: 65, alignItems: "flex-end" },
  distance: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 17 },
  helper: { marginTop: 9, color: "#475467", fontSize: 10, fontFamily: "Inter_400Regular" },
  stale: { marginTop: 5, color: "#A35F00", fontSize: 10, fontFamily: "Inter_400Regular" },
  routeNote: { color: "#667085", fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 5, lineHeight: 14 },
  contactRow: { marginTop: 13, flexDirection: "row", justifyContent: "space-between", gap: 12 },
  contactButton: { flex: 1, minHeight: 46, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  callButton: { backgroundColor: "#1857A6" },
  messageButton: { borderWidth: 1, borderColor: "#1857A6", backgroundColor: "#FFFFFF" },
  callText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  messageText: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  primary: { marginTop: 13, minHeight: 49, borderRadius: 13, backgroundColor: "#1857A6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 12 },
  primaryText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  backgroundAction: { minHeight: 37, justifyContent: "center", alignItems: "center", marginTop: 7 },
  backgroundText: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  notice: { fontSize: 10, color: "#1857A6", marginTop: 9, lineHeight: 15 },
  error: { fontSize: 10, color: "#B42318", marginTop: 9, lineHeight: 15 },
});
