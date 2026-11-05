import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/context/auth-context";
import { Action, PartsPage, Notice, BLUE, NAVY } from "@/components/parts-ui";
import { ensureJobNotifications } from "@/services/push-notifications";
import {
  type DeliveryLead,
  type RiderProfile,
  myRiderProfile,
  setRiderAvailable,
  availableDeliveries,
  assignedDeliveries,
} from "@/services/parts-riders";

const C = {
  navy: NAVY,
  blue: BLUE,
  blueBright: "#2679E8",
  sky: "#EAF3FF",
  mint: "#D9FAE9",
  green: "#0F8C62",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  ink: "#152D46",
  muted: "#63758B",
  stroke: "#E5EAF1",
  amber: "#B76B11",
  amberBg: "#FFF2DA",
};

type SymbolName = {
  ios: string;
  android: string;
};
type RiderOrder = {
  id: string;
  status: string;
  parts_inventory?: { title?: string | null } | null;
  parts_shops?: { shop_name?: string | null; location_text?: string | null } | null;
};

function Glyph({
  ios, android, size = 19, color = C.blue,
}: SymbolName & { size?: number; color?: string }) {
  return (
    <SymbolView
      name={{ ios, android, web: android } as never}
      size={size}
      tintColor={color}
    />
  );
}

function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

function SectionHeading({
  title, description, count,
}: { title: string; description?: string; count?: number }) {
  return (
    <View style={styles.headingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionSubtitle}>{description}</Text> : null}
      </View>
      {count !== undefined ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Metric({
  label, value, icon,
}: { label: string; value: string | number; icon: SymbolName }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Glyph {...icon} size={17} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({
  title, message, icon,
}: { title: string; message: string; icon: SymbolName }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Glyph {...icon} size={23} color={C.blue} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

function minutesLeft(expiresAt: string) {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  return Math.max(1, Math.ceil(remaining / 60000));
}

export default function RiderDashboard() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [leads, setLeads] = useState<DeliveryLead[]>([]);
  const [jobs, setJobs] = useState<RiderOrder[]>([]);
  const [newPickup, setNewPickup] = useState<DeliveryLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const seenOfferIds = useRef(new Set<string>());
  const fetching = useRef(false);
  const active = jobs.filter((job) =>
    ["rider_assigned", "picked_up"].includes(job.status),
  );
  const onDelivery = active.length > 0;
  const online = Boolean(rider?.verified && rider.is_available);
  const approved = Boolean(rider?.verified);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "Rider";

  useEffect(() => {
    seenOfferIds.current.clear();
    setNewPickup(null);
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!user || profile?.role !== "rider") {
      setLoading(false);
      return;
    }
    if (fetching.current) return;
    fetching.current = true;

    try {
      const current = await myRiderProfile(user.id);
      setRider(current);

      if (current?.verified) {
        const [offers, assigned] = await Promise.all([
          availableDeliveries(),
          assignedDeliveries(user.id),
        ]);
        setLeads(offers);
        setJobs(assigned as RiderOrder[]);

        if (current.is_available) {
          // Discard a popup whose server-side offer is no longer valid.
          setNewPickup((previous) =>
            previous && offers.some((offer) => offer.offer_id === previous.offer_id)
              ? previous
              : null,
          );
          const incoming = offers.find(
            (offer) => !seenOfferIds.current.has(offer.offer_id),
          );
          if (incoming) {
            seenOfferIds.current.add(incoming.offer_id);
            setNewPickup(incoming);
          }
        } else {
          setNewPickup(null);
        }
      } else {
        setLeads([]);
        setJobs([]);
        setNewPickup(null);
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not refresh deliveries.");
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, [user?.id, profile?.role]);

  useFocusEffect(
    useCallback(() => {
      void load();
      // The in-app feed is the fallback for devices with no push token.
      // Only poll while the Rider dashboard is visible.
      const interval = setInterval(() => {
        if (AppState.currentState === "active") void load();
      }, 5000);
      return () => clearInterval(interval);
    }, [load]),
  );

  useEffect(() => {
    if (!user || !rider?.verified || !rider.is_available) return;
    void ensureJobNotifications(user.id)
      .then((result) => {
        if (!result.registered) console.info("Rider in-app alert active:", result.message);
      })
      .catch((cause) => console.warn("Rider push setup unavailable", cause));
  }, [user?.id, rider?.verified, rider?.is_available]);

  const changeAvailability = async (next: boolean) => {
    if (!user || busy || !rider?.verified || onDelivery) return;
    setBusy(true);
    setError("");
    try {
      setRider(await setRiderAvailable(user.id, next));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update availability.");
    } finally {
      setBusy(false);
    }
  };

  const viewOffer = (orderId: string) => {
    setNewPickup(null);
    router.push({ pathname: "/rider/delivery-offer", params: { orderId } });
  };

  const viewDelivery = (orderId: string) => {
    router.push({ pathname: "/rider/active-delivery", params: { orderId } });
  };

  return (
    <PartsPage
      title="Rider home"
      subtitle="Your delivery workspace"
      settings
      refresh={() => void load()}
      loading={loading && !rider}
    >
      {profile?.role !== "rider" ? (
        <Notice tone="error">Please sign in with your Rider account.</Notice>
      ) : !rider ? (
        <View style={styles.onboardingCard}>
          <View style={styles.onboardingIcon}>
            <Glyph ios="bicycle" android="two_wheeler" color={C.white} size={30} />
          </View>
          <Text style={styles.onboardingTitle}>Start delivering with AutoAssist</Text>
          <Text style={styles.onboardingBody}>
            Set up your Rider profile, get verified, and receive pickup requests from approved parts dealers.
          </Text>
          <Action label="Set up Rider account" onPress={() => router.push("/rider/registration")} />
        </View>
      ) : (
        <>
          <View style={styles.welcomeRow}>
            <View style={{ flex: 1 }}>
              <Eyebrow>AUTOASSIST RIDER</Eyebrow>
              <Text style={styles.welcome}>Hello, {firstName}</Text>
              <Text style={styles.welcomeSubtitle}>Here's what's happening with your deliveries.</Text>
            </View>
            <View style={styles.avatar}>
              <Glyph ios="person.crop.circle.fill" android="person" size={27} color={C.blue} />
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroSymbol}>
                <Glyph ios="bicycle" android="two_wheeler" size={25} color={C.white} />
              </View>
              <View style={[
                styles.availabilityBadge,
                online ? styles.availabilityOn : styles.availabilityOff,
              ]}>
                <View style={[
                  styles.dot,
                  { backgroundColor: online ? "#36DC9C" : "#FFCA74" },
                ]} />
                <Text style={styles.availabilityText}>
                  {onDelivery ? "ON A DELIVERY" : online ? "YOU'RE ONLINE" :
                    approved ? "YOU'RE OFFLINE" : "VERIFICATION REQUIRED"}
                </Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>
              {onDelivery ? "Keep your delivery moving" :
                online ? "Ready for your next pickup?" :
                  approved ? "You're currently offline" : "Your Rider account"}
            </Text>
            <Text style={styles.heroDescription}>
              {onDelivery
                ? "Finish your current delivery before accepting another request."
                : online
                  ? "You're visible to parts dealers. New pickup offers appear here automatically."
                  : approved
                    ? "Go online when you're ready to receive delivery requests."
                    : "Verification is needed before you can receive live pickups."}
            </Text>
            {approved ? (
              <View style={styles.switchPanel}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>
                    {onDelivery ? "Delivery in progress" :
                      online ? "Accepting pickups" : "Receive pickup requests"}
                  </Text>
                  <Text style={styles.switchHint}>
                    {onDelivery ? "Available again after this delivery" :
                      online ? "Online · matching is active" : "Offline · no new offers"}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Available for deliveries"
                  value={rider.is_available}
                  onValueChange={(next) => void changeAvailability(next)}
                  disabled={busy || onDelivery}
                  trackColor={{ false: "#D7E0EB", true: "#B1E7D1" }}
                  thumbColor={rider.is_available ? C.green : C.white}
                />
              </View>
            ) : (
              <View style={styles.verifyPanel}>
                <Glyph ios="shield.lefthalf.filled" android="verified_user" color={C.blue} />
                <Text style={styles.verifyText}>
                  {rider.verification_status === "rejected"
                    ? "Your application needs corrections."
                    : "Your application is being reviewed."}
                </Text>
              </View>
            )}
          </View>

          {!approved ? (
            <View style={styles.verificationCard}>
              <View style={styles.sectionHeadingRow}>
                <Glyph ios="checkmark.shield.fill" android="verified_user" size={21} color={C.blue} />
                <Text style={styles.verificationTitle}>
                  {rider.verification_status === "rejected" ? "Verification needs attention" : "Verification pending"}
                </Text>
              </View>
              <Text style={styles.verificationText}>
                {rider.verification_status === "rejected"
                  ? rider.verification_note || "Review your profile information and submit it again."
                  : "The AutoAssist team will review your Rider details. You can start receiving offers once approved."}
              </Text>
              {rider.verification_status === "rejected" ? (
                <Action label="Correct and resubmit" onPress={() => router.push("/rider/registration")} />
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.metricsRow}>
                <Metric
                  label="Active jobs"
                  value={active.length}
                  icon={{ ios: "shippingbox.fill", android: "local_shipping" }}
                />
                <Metric
                  label="New offers"
                  value={online ? leads.length : 0}
                  icon={{ ios: "bell.badge.fill", android: "notifications_active" }}
                />
                <Metric
                  label="Completed"
                  value={rider.completed_deliveries}
                  icon={{ ios: "checkmark.seal.fill", android: "verified" }}
                />
              </View>

              {active.length > 0 ? (
                <View style={styles.sectionSpace}>
                  <SectionHeading
                    title="Current delivery"
                    description="Continue where you left off"
                    count={active.length}
                  />
                  {active.map((job) => (
                    <Pressable
                      key={job.id}
                      accessibilityRole="button"
                      accessibilityLabel="View active delivery"
                      onPress={() => viewDelivery(job.id)}
                      style={({ pressed }) => [
                        styles.activeCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.cardTop}>
                        <View style={styles.activeBadge}>
                          <Glyph ios="shippingbox.fill" android="local_shipping" color={C.blue} size={16} />
                          <Text style={styles.activeBadgeText}>
                            {job.status === "picked_up" ? "Delivering to customer" : "Ready to collect"}
                          </Text>
                        </View>
                        <Glyph ios="arrow.up.right" android="arrow_forward" size={20} color={C.blue} />
                      </View>
                      <Text style={styles.jobTitle}>
                        {job.parts_inventory?.title || "Spare-parts delivery"}
                      </Text>
                      <View style={styles.locationLine}>
                        <Glyph ios="storefront.fill" android="storefront" size={16} color={C.muted} />
                        <Text style={styles.locationText} numberOfLines={2}>
                          {job.parts_shops?.shop_name || "Pickup from parts dealer"}
                        </Text>
                      </View>
                      <View style={styles.activeFooter}>
                        <Text style={styles.actionLink}>View delivery details</Text>
                        <Glyph ios="arrow.right" android="arrow_forward" color={C.blue} size={18} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.sectionSpace}>
                <SectionHeading
                  title="Pickup requests"
                  description={online
                    ? "Offers from approved parts dealers"
                    : "Go online to receive new offers"}
                  count={online ? leads.length : 0}
                />
                {online && leads.length > 0 ? leads.map((offer) => (
                  <Pressable
                    key={offer.offer_id}
                    accessibilityRole="button"
                    accessibilityLabel={`Review pickup offer for ${offer.part_title}`}
                    onPress={() => viewOffer(offer.order_id)}
                    style={({ pressed }) => [styles.offerCard, pressed && styles.pressed]}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.newBadge}>
                        <View style={[styles.dot, { backgroundColor: C.green }]} />
                        <Text style={styles.newBadgeText}>NEW PICKUP</Text>
                      </View>
                      <View style={styles.timeBadge}>
                        <Glyph ios="clock" android="schedule" color={C.amber} size={15} />
                        <Text style={styles.timeText}>~{minutesLeft(offer.expires_at)} min left</Text>
                      </View>
                    </View>
                    <Text style={styles.jobTitle} numberOfLines={2}>{offer.part_title}</Text>
                    <View style={styles.locationLine}>
                      <Glyph ios="storefront.fill" android="storefront" color={C.muted} size={16} />
                      <Text style={styles.locationText} numberOfLines={1}>{offer.shop_name}</Text>
                    </View>
                    <View style={styles.locationLine}>
                      <Glyph ios="mappin.and.ellipse" android="place" color={C.muted} size={16} />
                      <Text style={styles.locationText} numberOfLines={2}>{offer.pickup_location}</Text>
                    </View>
                    <View style={styles.offerFooter}>
                      <Text style={styles.offerButtonText}>Review pickup</Text>
                      <Glyph ios="arrow.right" android="arrow_forward" color={C.white} size={19} />
                    </View>
                  </Pressable>
                )) : (
                  <EmptyState
                    icon={online
                      ? { ios: "shippingbox", android: "inventory_2" }
                      : { ios: "wifi.slash", android: "wifi_off" }}
                    title={online ? "Waiting for a pickup" : "You're not receiving offers"}
                    message={online
                      ? "You're online. New requests will appear here automatically when a dealer has a pickup ready."
                      : onDelivery
                        ? "Complete your active job to become available again."
                        : "Use the switch above to go online whenever you're ready to deliver."}
                  />
                )}
              </View>

              <View style={styles.accountStrip}>
                <View style={styles.accountSymbol}>
                  <Glyph ios="checkmark.shield.fill" android="verified_user" size={21} color={C.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountTitle}>Verified Rider account</Text>
                  <Text style={styles.accountSubtitle}>
                    {rider.vehicle_type.charAt(0).toUpperCase() + rider.vehicle_type.slice(1)}
                    {rider.registration_number ? ` · ${rider.registration_number}` : ""}
                    {rider.reviews_count > 0
                      ? ` · ${Number(rider.rating).toFixed(1)} rating`
                      : ""}
                  </Text>
                </View>
              </View>
            </>
          )}

          {error ? <Notice tone="error">{error}</Notice> : null}
        </>
      )}

      <Modal
        visible={Boolean(newPickup && rider?.is_available)}
        transparent
        animationType="fade"
        onRequestClose={() => setNewPickup(null)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Glyph ios="shippingbox.fill" android="local_shipping" size={28} color={C.white} />
            </View>
            <Text style={styles.modalEyebrow}>NEW DELIVERY OPPORTUNITY</Text>
            <Text style={styles.modalTitle}>Pickup request received</Text>
            <Text style={styles.modalDescription}>
              A parts dealer has an order ready for collection.
            </Text>
            <View style={styles.modalDetails}>
              <Text style={styles.modalPart}>
                {newPickup?.part_title || "Spare-parts pickup"}
              </Text>
              <Text style={styles.modalLocation}>
                {newPickup?.shop_name} · {newPickup?.pickup_location}
              </Text>
              <View style={styles.modalExpiryRow}>
                <Glyph ios="clock" android="schedule" color={C.amber} size={16} />
                <Text style={styles.modalExpiry}>Offer expires in two minutes</Text>
              </View>
            </View>
            <Action
              label="View pickup details"
              onPress={() => {
                if (newPickup) viewOffer(newPickup.order_id);
              }}
              icon={{ ios: "arrow.right", android: "arrow_forward", web: "arrow_forward" }}
            />
            <Action label="Maybe later" variant="outline" onPress={() => setNewPickup(null)} />
          </View>
        </View>
      </Modal>
    </PartsPage>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: C.blue, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.5,
  },
  welcomeRow: {
    flexDirection: "row", alignItems: "center", marginTop: 5, marginBottom: 20, gap: 12,
  },
  welcome: {
    color: C.ink, fontFamily: "Inter_600SemiBold", fontSize: 26, marginTop: 5,
  },
  welcomeSubtitle: {
    color: C.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 19, marginTop: 5,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: C.sky,
    alignItems: "center", justifyContent: "center",
  },
  hero: {
    backgroundColor: C.navy, borderRadius: 23, padding: 20, overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8,
  },
  heroSymbol: {
    width: 47, height: 47, borderRadius: 16,
    backgroundColor: "#275576", alignItems: "center", justifyContent: "center",
  },
  availabilityBadge: {
    borderRadius: 99, paddingHorizontal: 11, paddingVertical: 8,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  availabilityOn: { backgroundColor: "#164C43" },
  availabilityOff: { backgroundColor: "#31516B" },
  dot: { width: 7, height: 7, borderRadius: 99 },
  availabilityText: {
    color: C.white, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.4,
  },
  heroTitle: {
    color: C.white, fontFamily: "Inter_600SemiBold", fontSize: 21, lineHeight: 28, marginTop: 20,
  },
  heroDescription: {
    color: "#C6D8E8", fontFamily: "Inter_400Regular", fontSize: 12,
    lineHeight: 19, marginTop: 7,
  },
  switchPanel: {
    marginTop: 18, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14,
    backgroundColor: C.white, flexDirection: "row", alignItems: "center", gap: 12,
  },
  switchTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.navy,
  },
  switchHint: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: C.muted, marginTop: 4,
  },
  verifyPanel: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.white, borderRadius: 13, marginTop: 17, padding: 14,
  },
  verifyText: { color: C.navy, fontFamily: "Inter_600SemiBold", fontSize: 12, flex: 1 },
  metricsRow: {
    marginTop: 18, flexDirection: "row", gap: 10,
  },
  metricCard: {
    flex: 1, backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 15,
    borderRadius: 16, borderWidth: 1, borderColor: C.stroke,
  },
  metricIcon: {
    width: 33, height: 33, borderRadius: 11, backgroundColor: C.sky,
    alignItems: "center", justifyContent: "center",
  },
  metricValue: {
    color: C.navy, fontFamily: "Inter_600SemiBold", fontSize: 24, marginTop: 12,
  },
  metricLabel: {
    color: C.muted, fontFamily: "Inter_600SemiBold", fontSize: 11, marginTop: 5,
  },
  sectionSpace: { marginTop: 29 },
  headingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 13, gap: 10,
  },
  sectionTitle: { color: C.navy, fontFamily: "Inter_600SemiBold", fontSize: 18 },
  sectionSubtitle: {
    color: C.muted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4,
  },
  countBadge: {
    minWidth: 31, paddingHorizontal: 10, height: 31, backgroundColor: C.sky,
    borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  countText: { color: C.blue, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  offerCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: "#CEDFF4",
    borderRadius: 17, padding: 17, marginBottom: 11,
  },
  activeCard: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.stroke,
    borderLeftWidth: 4, borderLeftColor: C.blueBright,
    borderRadius: 17, padding: 17, marginBottom: 11,
  },
  cardTop: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
  },
  newBadge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: C.mint, borderRadius: 9, paddingVertical: 7, paddingHorizontal: 9,
  },
  newBadgeText: {
    color: C.green, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.amberBg, borderRadius: 9, paddingVertical: 7, paddingHorizontal: 8,
  },
  timeText: { color: C.amber, fontFamily: "Inter_600SemiBold", fontSize: 10 },
  activeBadge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: C.sky, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10,
  },
  activeBadgeText: { fontFamily: "Inter_600SemiBold", color: C.blue, fontSize: 10 },
  jobTitle: {
    fontSize: 17, color: C.navy, fontFamily: "Inter_600SemiBold",
    marginTop: 16, marginBottom: 11, lineHeight: 24,
  },
  locationLine: {
    flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 7,
  },
  locationText: {
    flex: 1, color: C.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 19,
  },
  offerFooter: {
    backgroundColor: C.blue, marginTop: 18, borderRadius: 11, minHeight: 45,
    paddingHorizontal: 15, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  offerButtonText: { color: C.white, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  activeFooter: {
    borderTopWidth: 1, borderTopColor: C.stroke,
    marginTop: 17, paddingTop: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  actionLink: { color: C.blue, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
  emptyCard: {
    alignItems: "center", justifyContent: "center", borderWidth: 1,
    borderColor: C.stroke, borderRadius: 17, backgroundColor: C.white,
    paddingHorizontal: 22, paddingVertical: 29,
  },
  emptyIcon: {
    width: 54, height: 54, borderRadius: 17, backgroundColor: C.sky,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: {
    color: C.navy, fontFamily: "Inter_600SemiBold", fontSize: 15, marginTop: 15,
    textAlign: "center",
  },
  emptyMessage: {
    color: C.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 19,
    marginTop: 7, textAlign: "center",
  },
  accountStrip: {
    flexDirection: "row", gap: 12, alignItems: "center",
    borderWidth: 1, borderColor: C.stroke, borderRadius: 15,
    backgroundColor: C.white, padding: 14, marginTop: 25,
  },
  accountSymbol: {
    width: 43, height: 43, borderRadius: 13, backgroundColor: C.mint,
    alignItems: "center", justifyContent: "center",
  },
  accountTitle: { fontFamily: "Inter_600SemiBold", color: C.navy, fontSize: 13 },
  accountSubtitle: {
    fontFamily: "Inter_400Regular", color: C.muted, fontSize: 11, marginTop: 5,
  },
  verificationCard: {
    marginTop: 19, borderWidth: 1, borderColor: C.stroke,
    backgroundColor: C.white, borderRadius: 16, padding: 18,
  },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  verificationTitle: { color: C.navy, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  verificationText: {
    color: C.muted, fontFamily: "Inter_400Regular", fontSize: 12,
    lineHeight: 20, marginTop: 11,
  },
  onboardingCard: {
    backgroundColor: C.navy, borderRadius: 21, padding: 22,
    marginTop: 10,
  },
  onboardingIcon: {
    width: 56, height: 56, borderRadius: 17, backgroundColor: "#275576",
    alignItems: "center", justifyContent: "center", marginBottom: 19,
  },
  onboardingTitle: {
    color: C.white, fontFamily: "Inter_600SemiBold", fontSize: 23,
    lineHeight: 31, marginBottom: 10,
  },
  onboardingBody: {
    color: "#D4E4F2", fontFamily: "Inter_400Regular", fontSize: 13,
    lineHeight: 21, marginBottom: 12,
  },
  modalScrim: {
    flex: 1, backgroundColor: "#091D35CC", padding: 22, justifyContent: "center",
  },
  modalCard: { backgroundColor: C.white, borderRadius: 24, padding: 22 },
  modalIcon: {
    width: 55, height: 55, borderRadius: 17, backgroundColor: C.blue,
    alignItems: "center", justifyContent: "center", marginBottom: 21,
  },
  modalEyebrow: {
    color: C.green, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1,
  },
  modalTitle: {
    color: C.navy, fontFamily: "Inter_600SemiBold", fontSize: 22, marginTop: 7,
  },
  modalDescription: {
    color: C.muted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 8,
    lineHeight: 20,
  },
  modalDetails: {
    backgroundColor: C.bg, borderRadius: 15, padding: 14, marginTop: 20,
    marginBottom: 4,
  },
  modalPart: { color: C.navy, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  modalLocation: {
    color: C.muted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 7,
    lineHeight: 19,
  },
  modalExpiryRow: {
    flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12,
  },
  modalExpiry: { color: C.amber, fontFamily: "Inter_600SemiBold", fontSize: 11 },
});
