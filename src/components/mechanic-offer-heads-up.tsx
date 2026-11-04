import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { getPendingMechanicOffer, subscribeToMechanicOffers } from "@/services/dispatch-backend";

/**
 * Foreground heads-up card for a newly matched mechanic request.
 *
 * Supabase Realtime provides fast updates; polling and AppState refresh are
 * fallbacks for development builds without EAS/FCM push credentials.
 * This reads only offers visible to the authenticated mechanic through RLS.
 * Customer phone and private contact information are never shown here.
 */
export function MechanicOfferHeadsUp() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { backendEnabled, user, profile } = useAuth();

  const [offer, setOffer] = useState<any>(null);
  const [dismissedOfferId, setDismissedOfferId] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  // Only the mechanic dashboard owns this UI. Other routes must never
  // receive a floating React Native offer card (including motorist routes).
  const onMechanicDashboard = pathname === "/mechanic/dashboard";

  const mechanicId = backendEnabled && profile?.role === "mechanic" && onMechanicDashboard ? user?.id : undefined;

  const refresh = useCallback(async () => {
    if (!mechanicId) {
      setOffer(null);
      return;
    }
    const result = await getPendingMechanicOffer(mechanicId);
    if (result.error) {
      // Polling is a fallback: avoid interrupting the app on transient failures.
      return;
    }
    setOffer(result.data ?? null);
    setClock(Date.now());
  }, [mechanicId]);

  useEffect(() => {
    if (!mechanicId) {
      setOffer(null);
      setDismissedOfferId(null);
      return;
    }

    void refresh();
    const unsubscribe = subscribeToMechanicOffers(mechanicId, () => void refresh());
    const timer = setInterval(() => {
      setClock(Date.now());
      void refresh();
    }, 5000);
    const appState = AppState.addEventListener("change", (nextState) => {
      setForeground(nextState === "active");
      if (nextState === "active") void refresh();
    });

    return () => {
      unsubscribe();
      clearInterval(timer);
      appState.remove();
    };
  }, [mechanicId, refresh]);

  // The server already sends a job notification to the intended mechanic.
  // Do not create a second local notification from foreground polling.
  // That caused duplicate alerts and unnecessary navigation noise.

  const request = Array.isArray(offer?.repair_requests)
    ? offer.repair_requests[0]
    : offer?.repair_requests;
  const stillValid = Boolean(
    offer?.id && offer.status === "offered" && new Date(offer.expires_at).getTime() > clock,
  );
  const routeIsOffer = pathname?.startsWith("/mechanic/job-offer");
  if (!mechanicId || !foreground || !stillValid || !request || routeIsOffer || dismissedOfferId === offer.id) {
    return null;
  }

  const remaining = Math.max(0, Math.ceil((new Date(offer.expires_at).getTime() - clock) / 1000));
  const openOffer = () => {
    setDismissedOfferId(offer.id);
    router.push({ pathname: "/mechanic/job-offer", params: { offerId: offer.id } });
  };

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}>
      <View style={styles.card} accessibilityLiveRegion="polite">
        <View style={styles.header}>
          <View style={styles.pulse} />
          <Text style={styles.heading}>New service request for you</Text>
          <Text style={styles.timer}>{remaining}s left</Text>
        </View>
        <Text style={styles.problem}>{String(request.symptom || "Service request")}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {String(request.description || "Motorist requests roadside assistance")}
        </Text>
        <Text style={styles.detail} numberOfLines={2}>
          📍 {String(request.location_text || "Location unavailable")}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          🕒 {String(request.preferred_time || "As soon as possible")}
          {offer.distance_km != null ? `  •  ${Number(offer.distance_km).toFixed(1)} km away` : ""}
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.dismiss} onPress={() => setDismissedOfferId(offer.id)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
          <Pressable style={styles.review} onPress={openOffer}>
            <Text style={styles.reviewText}>View & respond</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#AECDF6",
    borderLeftWidth: 5,
    borderLeftColor: "#1857A6",
    padding: 14,
    shadowColor: "#102A43",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 7 },
  pulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#1B8A5A" },
  heading: { flex: 1, color: "#123D76", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  timer: { color: "#8A5200", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  problem: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  description: { color: "#344054", fontSize: 11, lineHeight: 16, marginTop: 4, fontFamily: "Inter_400Regular" },
  detail: { color: "#475467", fontSize: 10, lineHeight: 15, marginTop: 5, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 9, marginTop: 12 },
  dismiss: { flex: 1, minHeight: 39, borderRadius: 9, borderWidth: 1, borderColor: "#D0D5DD", alignItems: "center", justifyContent: "center" },
  dismissText: { color: "#475467", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  review: { flex: 2, minHeight: 39, borderRadius: 9, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center" },
  reviewText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
