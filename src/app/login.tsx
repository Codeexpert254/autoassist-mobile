import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDemoApp } from "@/context/demo-app-context";

export default function Login() {
  const router = useRouter();
  const { login } = useDemoApp();
  const [email, setEmail] = useState("demo@autoassist.co.ke");
  const [password, setPassword] = useState("demo1234");
  const [submitted, setSubmitted] = useState(false);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordIsValid = password.length >= 4;
  const formIsValid = emailIsValid && passwordIsValid;

  const handleLogin = () => {
    setSubmitted(true);
    if (!formIsValid) return;
    login(email);
    router.replace("/roleselection");
  };

  return (
    <View style={styles.loginContainer}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subTitle}>Log in to continue to AutoAssist.</Text>

        <View style={styles.emailContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, submitted && !emailIsValid && styles.errorInput]}
            placeholder="name@example.com"
            placeholderTextColor="#667085"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          {submitted && !emailIsValid ? (
            <Text style={styles.errorText}>Enter a valid email address.</Text>
          ) : null}
        </View>

        <View style={styles.passwordContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, submitted && !passwordIsValid && styles.errorInput]}
            placeholder="••••••••"
            placeholderTextColor="#667085"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {submitted && !passwordIsValid ? (
            <Text style={styles.errorText}>Enter at least 4 characters for the demo.</Text>
          ) : null}
        </View>

        <Pressable onPress={() => router.push("/forgotpassword")}>
          <Text style={styles.forgotPassword}>Forgot password?</Text>
        </Pressable>

        <Pressable
          style={[styles.loginButton, !formIsValid && styles.loginButtonDisabled]}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>Log in</Text>
        </Pressable>

        <Text style={styles.demoHint}>
          Demo credentials are already filled in — just tap Log in.
        </Text>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={[styles.input, styles.createAccountButton]}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.createAccount}>Create a new account</Text>
        </Pressable>

        <Text style={styles.termsOfService}>
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </Text>

        <Pressable
          style={styles.devPreviewButton}
          onPress={() => router.push("/preview")}
        >
          <Text style={styles.devPreviewText}>Developer Preview</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 20, backgroundColor: "#FFFFFF" },
  title: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 22, marginTop: 20, marginBottom: 12 },
  subTitle: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 35 },
  emailContainer: { marginBottom: 18 },
  passwordContainer: { marginBottom: 10 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#344054", marginBottom: 6 },
  input: { backgroundColor: "#FFFFFF", width: "100%", minHeight: 52, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", justifyContent: "center", paddingHorizontal: 14, color: "#344054", fontFamily: "Inter_400Regular", fontSize: 14 },
  errorInput: { borderColor: "#D9363E" },
  errorText: { color: "#D9363E", fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 5 },
  forgotPassword: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#344054", alignSelf: "flex-end", marginBottom: 25 },
  loginButton: { width: "100%", height: 48, borderRadius: 12, justifyContent: "center", backgroundColor: "#1857A6" },
  loginButtonDisabled: { backgroundColor: "#A9C2DF" },
  buttonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "center" },
  demoHint: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center", marginTop: 8, marginBottom: 18 },
  dividerRow: { flexDirection: "row", marginBottom: 25, alignItems: "center" },
  dividerLine: { backgroundColor: "#D0D5DD", flex: 1, height: 1 },
  orText: { marginHorizontal: 12, fontFamily: "Inter_400Regular", fontSize: 12, color: "#667085" },
  createAccountButton: { alignItems: "center", marginBottom: 30 },
  createAccount: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  termsOfService: { width: 310, alignSelf: "center", textAlign: "center", fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#667085" },
  devPreviewButton: { alignSelf: "center", marginTop: "auto", marginBottom: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#EAF2FD" },
  devPreviewText: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 11 },
});
