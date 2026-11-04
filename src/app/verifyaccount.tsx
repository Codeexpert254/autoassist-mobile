import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requireSupabase } from "@/lib/supabase";

export default function VerifyAccount() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "your email address";
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resend = async () => {
    if (!email.includes("@") || resending) return;
    setResending(true);
    setMessage("");
    setError("");
    try {
      const { error: resendError } = await requireSupabase().auth.resend({
        type: "signup",
        email,
      });
      if (resendError) throw resendError;
      setMessage("A new verification email has been sent.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to resend the email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable style={styles.back} onPress={() => router.replace("/login")}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.iconWrap}>
          <Text style={styles.icon}>✉</Text>
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent an AutoAssist verification link to
        </Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Finish setting up your account</Text>
          <Text style={styles.infoText}>
            Open the verification email and tap the confirmation link. After Supabase confirms your address, return to AutoAssist and log in with your email and password.
          </Text>
        </View>

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={() => router.replace("/login")}>
          <Text style={styles.primaryText}>I’ve verified my email — Log in</Text>
        </Pressable>

        <Pressable disabled={resending || !email.includes("@")} style={styles.secondaryButton} onPress={() => void resend()}>
          {resending ? <ActivityIndicator color="#1857A6" /> : <Text style={styles.secondaryText}>Resend verification email</Text>}
        </Pressable>

        <Text style={styles.help}>If you don’t see the email, check your spam or junk folder.</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 8, marginLeft: -10 },
  backText: { color: "#102A43", fontSize: 32, lineHeight: 34 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: "#EAF2FD", borderWidth: 1, borderColor: "#B8D2F0", alignItems: "center", justifyContent: "center", marginTop: 28, marginBottom: 24 },
  icon: { fontSize: 30, color: "#1857A6" },
  title: { color: "#102A43", fontSize: 24, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  subtitle: { color: "#667085", fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  email: { color: "#1857A6", fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4, marginBottom: 24 },
  infoCard: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, padding: 16, marginBottom: 20 },
  infoTitle: { color: "#102A43", fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 7 },
  infoText: { color: "#667085", fontSize: 12, lineHeight: 19, fontFamily: "Inter_400Regular" },
  success: { color: "#1B8A5A", backgroundColor: "#EAF7F1", borderRadius: 10, padding: 10, fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 12 },
  error: { color: "#D9363E", backgroundColor: "#FFF1F2", borderRadius: 10, padding: 10, fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 12 },
  primaryButton: { height: 50, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  secondaryButton: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryText: { color: "#1857A6", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  help: { color: "#98A2B3", fontSize: 11, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 18 },
});
