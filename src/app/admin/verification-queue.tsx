import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  listAdminVerifications,
  type AdminVerificationListItem,
  type AdminVerificationStatus,
} from "@/services/admin-verification-backend";

type Filter = AdminVerificationStatus | "all";

const filters: Array<{ label: string; value: Filter }> = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Needs attention", value: "rejected" },
  { label: "All", value: "all" },
];

function submittedLabel(value: string | null) {
  if (!value) return "Not submitted";
  return new Date(value).toLocaleString();
}

export default function VerificationQueue() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AdminVerificationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (nextFilter: Filter, refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const result = await listAdminVerifications(nextFilter);
      setItems(result.items);
    } catch (caught) {
      setItems([]);
      setError(caught instanceof Error ? caught.message : "Unable to load verification requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>AUTOASSIST ADMIN</Text>
            <Text style={styles.title}>Mechanic verification</Text>
            <Text style={styles.subtitle}>Review real provider applications before they enter live dispatch.</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => void load(filter, true)}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.filters}>
          {filters.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setFilter(item.value)}
              style={[styles.filterButton, filter === item.value && styles.filterButtonActive]}
            >
              <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#1857A6" />
            <Text style={styles.muted}>Loading verification requests…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Admin access unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(filter, true)} />}
          >
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{items.length}</Text>
              <Text style={styles.summaryLabel}>{filter === "all" ? "applications" : `${filter} applications`}</Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nothing to review</Text>
                <Text style={styles.muted}>There are no applications in this queue right now.</Text>
              </View>
            ) : null}

            {items.map((item) => {
              const name = item.profile?.full_name?.trim() || "Unnamed mechanic";
              const provider = item.profile?.provider_type === "garage" ? "Garage / business" : "Individual mechanic";
              return (
                <Pressable
                  key={item.user_id}
                  style={styles.applicationCard}
                  onPress={() =>
                    router.push({
                      pathname: "/admin/verification-detail",
                      params: { userId: item.user_id },
                    } as never)
                  }
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardCopy}>
                      <Text style={styles.name}>{name}</Text>
                      <Text style={styles.meta}>{provider}</Text>
                    </View>
                    <View style={[styles.statusPill, item.status === "pending" ? styles.pending : item.status === "approved" ? styles.approved : styles.rejected]}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={styles.checkRow}>
                    <Text style={styles.checkText}>{item.identity_claimed ? "✓ ID pre-check" : "○ ID pre-check"}</Text>
                    <Text style={styles.checkText}>{item.profile_photo_confirmed ? "✓ Profile photo" : "○ Profile photo"}</Text>
                  </View>
                  <Text style={styles.submitted}>Submitted: {submittedLabel(item.submitted_at)}</Text>
                  {item.review_note ? <Text style={styles.note}>Review note: {item.review_note}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F9FC" },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", gap: 16, alignItems: "flex-start" },
  eyebrow: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  title: { color: "#101828", fontSize: 26, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  subtitle: { color: "#667085", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 5, maxWidth: 520 },
  refreshButton: { borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  refreshText: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 12, flexWrap: "wrap" },
  filterButton: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#FFFFFF" },
  filterButtonActive: { backgroundColor: "#1857A6", borderColor: "#1857A6" },
  filterText: { color: "#475467", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterTextActive: { color: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  list: { padding: 20, gap: 12, paddingBottom: 40 },
  summaryCard: { backgroundColor: "#EAF2FF", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "baseline", gap: 7 },
  summaryNumber: { color: "#1857A6", fontSize: 28, fontFamily: "Inter_600SemiBold" },
  summaryLabel: { color: "#344054", fontSize: 13, fontFamily: "Inter_400Regular" },
  applicationCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EAECF0", gap: 11 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EAF2FF", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#1857A6", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  cardCopy: { flex: 1 },
  name: { color: "#101828", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  meta: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pending: { backgroundColor: "#FFF4E5" },
  approved: { backgroundColor: "#E9F8EF" },
  rejected: { backgroundColor: "#FEECEC" },
  statusText: { color: "#344054", fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  checkRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  checkText: { color: "#475467", fontSize: 12, fontFamily: "Inter_400Regular" },
  submitted: { color: "#98A2B3", fontSize: 11, fontFamily: "Inter_400Regular" },
  note: { color: "#B54708", fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyCard: { backgroundColor: "#FFFFFF", padding: 24, borderRadius: 16, borderWidth: 1, borderColor: "#EAECF0", alignItems: "center", gap: 5 },
  emptyTitle: { color: "#101828", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  muted: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  errorCard: { margin: 20, padding: 18, borderRadius: 14, backgroundColor: "#FEECEC", borderWidth: 1, borderColor: "#FECACA", gap: 6 },
  errorTitle: { color: "#B42318", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  errorText: { color: "#7A271A", fontSize: 12, fontFamily: "Inter_400Regular" },
});
