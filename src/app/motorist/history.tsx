import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StaticScreen } from "@/components/autoassist-ui";
import { useAuth } from "@/context/auth-context";
import { motoristScreens } from "@/data/autoassist-screens";
import { getMotoristRepairs } from "@/services/repair-backend";

function jobLabel(status: string) {
  const labels: Record<string, string> = {
    matching: "Finding a provider",
    offered: "Waiting for provider response",
    requested: "Request sent",
    accepted: "Provider accepted",
    connected: "Contact unlocked",
    "en-route": "Mechanic on the way",
    arrived: "Mechanic arrived",
    "repair-complete": "Action required — rate your mechanic",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status.replace(/-/g, " ");
}

export default function History() {
  const { backendEnabled, user, profile } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!user || profile?.role !== "motorist") return;
    setRefreshing(true);
    try {
      const result = await getMotoristRepairs(user.id);
      if (result.error) throw result.error;
      setJobs(result.data ?? []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!backendEnabled) return;
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [backendEnabled, user?.id, profile?.role]);

  if (!backendEnabled) return <StaticScreen {...motoristScreens.history} />;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/motorist/home")} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Your service connections</Text>
            <Text style={styles.subtitle}>Track visits, rate completed services, and review past connections.</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => void load()} disabled={refreshing} style={styles.refresh}>
            <Text style={styles.refreshText}>{refreshing ? "Refreshing…" : "Refresh jobs"}</Text>
          </Pressable>
          {loading ? <ActivityIndicator color="#1857A6" style={{ marginTop: 24 }} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !jobs.length ? (
            <Text style={styles.empty}>You have no service requests yet.</Text>
          ) : null}
          {jobs.map((job) => {
            const rateRequired = job.status === "repair-complete";
            const viewable = Boolean(job.mechanic_id) && job.status !== "cancelled";
            return (
              <View style={[styles.card, rateRequired && styles.actionCard]} key={job.id}>
                <Text style={styles.symptom}>{job.symptom || "Service request"}</Text>
                <Text style={[styles.status, rateRequired && styles.actionText]}>{jobLabel(String(job.status))}</Text>
                <Text style={styles.meta}>{job.location_text || "Location not available"}</Text>
                <Text style={styles.meta}>{new Date(job.created_at).toLocaleString()}</Text>
                {viewable ? (
                  <Pressable
                    style={styles.button}
                    onPress={() => router.push({ pathname: "/motorist/mechanic-assigned", params: { requestId: job.id } })}
                  >
                    <Text style={styles.buttonText}>{rateRequired ? "Rate mechanic & complete" : "View connection"}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EAECF0", paddingHorizontal: 20, paddingVertical: 15, gap: 8 },
  back: { width: 34, minHeight: 38, justifyContent: "center" },
  backText: { color: "#102A43", fontSize: 28, fontFamily: "Inter_600SemiBold" },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 4 },
  content: { padding: 20, paddingBottom: 40 },
  refresh: { borderColor: "#1857A6", borderWidth: 1, borderRadius: 10, minHeight: 42, alignItems: "center", justifyContent: "center" },
  refreshText: { color: "#1857A6", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  error: { color: "#B42318", fontSize: 11, marginTop: 16, fontFamily: "Inter_400Regular" },
  empty: { color: "#667085", fontSize: 12, marginTop: 24, textAlign: "center", fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, marginTop: 14, padding: 16 },
  actionCard: { borderColor: "#B8D2F0", backgroundColor: "#F5F9FE" },
  symptom: { color: "#102A43", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  status: { color: "#176B45", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 6, textTransform: "capitalize" },
  actionText: { color: "#1857A6" },
  meta: { color: "#667085", fontSize: 11, lineHeight: 17, marginTop: 5, fontFamily: "Inter_400Regular" },
  button: { backgroundColor: "#1857A6", borderRadius: 10, minHeight: 43, justifyContent: "center", alignItems: "center", marginTop: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
