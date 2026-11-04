import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import { getConnectionContact, getConnectionPayment, getDispatchRequest, getServiceRating } from "@/services/dispatch-backend";
import { submitRating } from "@/services/repair-backend";

export default function MechanicAssigned() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const { user, profile } = useAuth();
  const { state, refreshBackend } = useRepairFlow();
  const parameterRequestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const requestId = parameterRequestId ?? state.requestId ?? undefined;

  const [request, setRequest] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  const [savedRating, setSavedRating] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState("");

  const load = async () => {
    if (!requestId || requestId.startsWith("REP-")) {
      setError("No live mechanic connection is available for this request.");
      setLoading(false);
      return;
    }

    setError("");
    try {
      const [requestResult, paymentResult] = await Promise.all([
        getDispatchRequest(requestId),
        getConnectionPayment(requestId),
      ]);
      if (requestResult.error) throw requestResult.error;
      if (paymentResult.error) throw paymentResult.error;
      setRequest(requestResult.data);
      setPayment(paymentResult.data);

      if (requestResult.data?.status === "completed") {
        const existingRating = await getServiceRating(requestId);
        if (existingRating.error) throw existingRating.error;
        setSavedRating(existingRating.data);
      } else {
        setSavedRating(null);
      }

      const result = await getConnectionContact(requestId);
      setContact(result?.contact ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load mechanic connection details.");
      setContact(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    if (!requestId) return;
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, [requestId]);

  const rateMechanic = async () => {
    if (submitting || !requestId || !user || profile?.role !== "motorist") return;
    if (request?.status !== "repair-complete") {
      setRatingError("The mechanic must mark the visit finished before you can rate it.");
      return;
    }
    if (!request.mechanic_id || stars < 1 || stars > 5) {
      setRatingError("Choose a rating from 1 to 5 stars.");
      return;
    }

    setSubmitting(true);
    setRatingError("");
    try {
      const result = await submitRating({
        requestId,
        motoristId: user.id,
        mechanicId: request.mechanic_id,
        rating: stars,
        review: review.trim().slice(0, 1000),
      });
      if (result.error) throw result.error;
      // The database atomically changes repair-complete -> completed when
      // the authenticated motorist submits the rating.
      await load();
      await refreshBackend();
    } catch (caught) {
      setRatingError(caught instanceof Error ? caught.message : "Unable to submit your rating.");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ActivityIndicator color="#1857A6" />
          <Text style={styles.helper}>Loading your mechanic connection…</Text>
        </SafeAreaView>
      </View>
    );
  }

  const locked = !contact;
  const statusLabel =
    request?.status === "repair-complete" ? "Awaiting your rating" :
    request?.status === "en-route" ? "Mechanic on the way" :
    request?.status === "arrived" ? "Mechanic has arrived" :
    request?.status === "completed" ? "Completed" :
    String(request?.status ?? "connected").replace(/-/g, " ");

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/motorist/home")}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Your mechanic connection</Text>
            <Text style={styles.subtitle}>AutoAssist keeps this connection tied to your repair request.</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {locked ? (
            <View style={styles.lockedCard}>
              <View style={styles.iconCircle}>
                <SymbolView name="lock.fill" size={28} tintColor="#1857A6" />
              </View>
              <Text style={styles.lockedTitle}>Connection details are still locked</Text>
              <Text style={styles.lockedText}>{error || "Complete the KES 500 AutoAssist connection fee to unlock your assigned mechanic’s contact details."}</Text>
              {requestId ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.replace({ pathname: "/motorist/connection-payment", params: { requestId } })}
                >
                  <Text style={styles.primaryText}>Go to connection payment</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              <View style={styles.successCard}>
                <View style={styles.iconCircleGreen}>
                  <SymbolView name="checkmark.shield.fill" size={29} tintColor="#1B8A5A" />
                </View>
                <Text style={styles.successTitle}>Connection confirmed</Text>
                <Text style={styles.successText}>
                  {payment?.provider === "sandbox_simulator"
                    ? "TEST CONNECTION — A KES 500 payment was simulated. No actual M-PESA money was collected."
                    : "The KES 500 AutoAssist connection fee is confirmed. You can now coordinate directly with the mechanic."}
                </Text>
              </View>

              {payment?.provider === "sandbox_simulator" ? (
                <View style={styles.testBanner}>
                  <Text style={styles.testBannerText}>SANDBOX TEST ONLY — No real payment was made.</Text>
                </View>
              ) : null}

              <View style={styles.mechanicCard}>
                <Text style={styles.eyebrow}>ASSIGNED MECHANIC</Text>
                <Text style={styles.mechanicName}>{contact.name || "Verified mechanic"}</Text>
                {contact.contactPerson && contact.contactPerson !== contact.name ? (
                  <Text style={styles.contactPerson}>Contact: {contact.contactPerson}</Text>
                ) : null}
                <View style={styles.ratingRow}>
                  <SymbolView name="star.fill" size={15} tintColor="#D98200" />
                  <Text style={styles.ratingText}>{Number(contact.rating ?? 0) > 0 ? Number(contact.rating).toFixed(1) : "New"}</Text>
                  {Number(contact.reviews ?? 0) > 0 ? <Text style={styles.reviewText}>• {contact.reviews} reviews</Text> : null}
                  <Text style={styles.verifiedText}>• Verified</Text>
                </View>
                <Detail label="Phone" value={contact.phone || "Not provided"} />
                <Detail label="Service base" value={contact.location || "Not provided"} />
                <Detail label="Request status" value={statusLabel} />

                {contact.phone ? (
                  <>
                    <Pressable style={styles.primaryButton} onPress={() => void Linking.openURL(`tel:${contact.phone}`)}>
                      <Text style={styles.primaryText}>Call mechanic</Text>
                    </Pressable>
                    <Pressable style={styles.outlineButton} onPress={() => void Linking.openURL(`sms:${contact.phone}`)}>
                      <Text style={styles.outlineText}>Message mechanic (SMS)</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>

              <View style={styles.noteCard}>
                <Text style={styles.noteTitle}>AutoAssist connects you with a provider</Text>
                <Text style={styles.noteText}>
                  The KES 500 fee covers the AutoAssist connection only. Any service work or separate arrangements with the provider happen directly between you and the provider, outside this app.
                </Text>
              </View>

              {request?.status === "arrived" ? (
                <View style={styles.progressCard}>
                  <Text style={styles.progressTitle}>Your mechanic has arrived</Text>
                  <Text style={styles.progressText}>The service can now take place. Once the mechanic marks the visit finished, you'll be asked to rate your experience.</Text>
                </View>
              ) : request?.status === "en-route" ? (
                <View style={styles.progressCard}>
                  <Text style={styles.progressTitle}>Mechanic is on the way</Text>
                  <Text style={styles.progressText}>You can call or message your mechanic using the contact details above.</Text>
                </View>
              ) : null}

              {request?.status === "repair-complete" ? (
                <View style={styles.rateCard}>
                  <Text style={styles.rateTitle}>Rate your mechanic</Text>
                  <Text style={styles.rateHint}>Your mechanic has finished the visit. Choose a star rating to finish and close this AutoAssist job.</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Pressable
                        key={value}
                        style={styles.starTap}
                        accessibilityRole="button"
                        accessibilityLabel={`Rate ${value} out of 5 stars`}
                        onPress={() => setStars(value)}
                        disabled={submitting}
                      >
                        <Text style={[styles.starText, value <= stars && styles.starSelected]}>★</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.rateHint}>{stars ? `${stars} of 5 stars selected` : "Tap a star to choose your rating"}</Text>
                  <TextInput
                    value={review}
                    onChangeText={setReview}
                    style={styles.reviewInput}
                    placeholder="Add a short review (optional)"
                    placeholderTextColor="#98A2B3"
                    multiline
                    numberOfLines={3}
                    maxLength={1000}
                    editable={!submitting}
                    textAlignVertical="top"
                  />
                  {ratingError ? <Text style={styles.ratingError}>{ratingError}</Text> : null}
                  <Pressable style={[styles.primaryButton, (submitting || stars === 0) && styles.disabledButton]} disabled={submitting || stars === 0} onPress={() => void rateMechanic()}>
                    {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Submit rating & complete job</Text>}
                  </Pressable>
                </View>
              ) : null}

              {request?.status === "completed" ? (
                <View style={styles.completedCard}>
                  <Text style={styles.completedTitle}>Job completed</Text>
                  <Text style={styles.progressText}>Thank you for rating your mechanic. This AutoAssist connection is now closed.</Text>
                  {savedRating?.rating ? <Text style={styles.savedStars}>{'★'.repeat(savedRating.rating)}{'☆'.repeat(5 - savedRating.rating)}</Text> : null}
                  {savedRating?.review ? <Text style={styles.progressText}>{savedRating.review}</Text> : null}
                </View>
              ) : null>
            </>
          )}

          <Pressable style={styles.refreshButton} onPress={() => void load()}>
            <Text style={styles.refreshText}>Refresh connection status</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  testBanner: { borderRadius: 10, backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F5D48A", padding: 12, marginBottom: 12 },
  testBannerText: { color: "#8A5200", fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 10 },
  helper: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular" },
  header: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#EAECF0" },
  backButton: { width: 34, minHeight: 38, justifyContent: "center" },
  backText: { color: "#102A43", fontSize: 28, lineHeight: 32, fontFamily: "Inter_600SemiBold" },
  headerCopy: { flex: 1 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  content: { padding: 20, paddingBottom: 34 },
  lockedCard: { alignItems: "center", borderRadius: 18, backgroundColor: "#F5F9FE", borderWidth: 1, borderColor: "#B8D2F0", padding: 24 },
  iconCircle: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  lockedTitle: { color: "#102A43", fontSize: 16, textAlign: "center", fontFamily: "Inter_600SemiBold", marginTop: 12 },
  lockedText: { color: "#667085", fontSize: 11, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 6 },
  successCard: { alignItems: "center", borderRadius: 16, backgroundColor: "#F4FBF7", borderWidth: 1, borderColor: "#B7E4CB", padding: 18, marginBottom: 15 },
  iconCircleGreen: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  successTitle: { color: "#176B45", fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 9 },
  successText: { color: "#667085", fontSize: 10, lineHeight: 16, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 5 },
  mechanicCard: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 16 },
  eyebrow: { color: "#1857A6", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  mechanicName: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold", marginTop: 5 },
  contactPerson: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 9, marginBottom: 10 },
  ratingText: { color: "#475467", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  reviewText: { color: "#667085", fontSize: 10, fontFamily: "Inter_400Regular" },
  verifiedText: { color: "#1B8A5A", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  detailRow: { borderTopWidth: 1, borderTopColor: "#EAECF0", paddingVertical: 10 },
  detailLabel: { color: "#667085", fontSize: 9, textTransform: "uppercase", fontFamily: "Inter_600SemiBold" },
  detailValue: { color: "#102A43", fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 3, textTransform: "capitalize" },
  primaryButton: { minHeight: 47, borderRadius: 11, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 16, alignSelf: "stretch" },
  primaryText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  noteCard: { backgroundColor: "#FFF7E8", borderWidth: 1, borderColor: "#F5D48A", borderRadius: 13, padding: 14, marginTop: 14 },
  progressCard: { borderRadius: 14, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#F5F9FE", padding: 16, marginTop: 14 },
  progressTitle: { color: "#102A43", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  progressText: { color: "#475467", fontSize: 11, lineHeight: 17, marginTop: 6, fontFamily: "Inter_400Regular" },
  rateCard: { borderRadius: 14, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#F5F9FE", padding: 16, marginTop: 14 },
  rateTitle: { color: "#102A43", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  rateHint: { color: "#475467", fontSize: 11, lineHeight: 17, marginTop: 7, fontFamily: "Inter_400Regular" },
  starsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  starTap: { padding: 6, minWidth: 42, alignItems: "center" },
  starText: { color: "#CAD3DF", fontSize: 35 },
  starSelected: { color: "#F4A100" },
  reviewInput: { borderWidth: 1, borderColor: "#D0D5DD", minHeight: 78, borderRadius: 10, backgroundColor: "#FFFFFF", padding: 12, marginTop: 12, fontSize: 12, color: "#344054", fontFamily: "Inter_400Regular" },
  ratingError: { marginTop: 10, color: "#B42318", fontSize: 11, fontFamily: "Inter_400Regular" },
  disabledButton: { opacity: 0.55 },
  completedCard: { borderRadius: 14, backgroundColor: "#F4FBF7", borderWidth: 1, borderColor: "#B7E4CB", padding: 16, marginTop: 14 },
  completedTitle: { color: "#176B45", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  savedStars: { color: "#F4A100", fontSize: 22, marginTop: 8 },
  outlineButton: { minHeight: 44, borderWidth: 1, borderColor: "#1857A6", borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 10 },
  outlineText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  noteTitle: { color: "#8A5200", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  noteText: { color: "#667085", fontSize: 10, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  refreshButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 14 },
  refreshText: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
