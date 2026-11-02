import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type AccountRole, useAuth } from "@/context/auth-context";
import { useDemoApp } from "@/context/demo-app-context";

export default function Register() {
  const router = useRouter();
  const { backendEnabled, signUp } = useAuth();
  const { register: demoRegister } = useDemoApp();
  const [fullname, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<AccountRole>("motorist");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const compactPhone = phoneNumber.replace(/[\s-]/g, "");
  const phoneIsValid = /^(?:\+254|0)?[17]\d{8}$/.test(compactPhone);
  const passwordIsLongEnough = password.length >= 8;
  const passwordsMatch = password === confirmPassword;

  const formIsValid =
    fullname.trim() !== "" &&
    emailIsValid &&
    phoneIsValid &&
    passwordIsLongEnough &&
    passwordsMatch;

  const handleCreateAccount = async () => {
    setSubmitted(true);
    setServerError("");
    if (!formIsValid || loading) return;

    setLoading(true);
    try {
      if (!backendEnabled) {
        demoRegister({ name: fullname, email, phone: phoneNumber });
        router.replace("/roleselection");
        return;
      }

      const result = await signUp({
        fullName: fullname,
        email,
        phone: phoneNumber,
        password,
        role,
      });

      demoRegister({ name: fullname, email, phone: phoneNumber });

      if (result.requiresEmailConfirmation) {
        router.replace({ pathname: "/verifyaccount", params: { email: email.trim() } });
        return;
      }

      router.replace(role === "mechanic" ? "/mechanic/registration" : "/motorist/home");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.registerContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subTitle}>Choose how you will use AutoAssist, then create your secure account.</Text>

          <Text style={styles.sectionLabel}>I am joining as</Text>
          <View style={styles.roleRow}>
            <RoleCard
              title="Motorist"
              subtitle="Get vehicle help"
              selected={role === "motorist"}
              onPress={() => setRole("motorist")}
            />
            <RoleCard
              title="Mechanic"
              subtitle="Receive repair jobs"
              selected={role === "mechanic"}
              onPress={() => setRole("mechanic")}
            />
          </View>

          <Field label="Full name" value={fullname} onChangeText={setFullName} placeholder="Abraham Masai" />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            error={submitted && !emailIsValid}
          />
          <Field
            label="Phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+254 712 345 678"
            keyboardType="phone-pad"
            error={submitted && !phoneIsValid}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={submitted && !passwordIsLongEnough}
          />
          <Field
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry
            error={submitted && !passwordsMatch}
            last
          />

          <Text
            style={[
              styles.infoText,
              ((password !== "" && !passwordIsLongEnough) || (confirmPassword !== "" && !passwordsMatch)) && styles.errorText,
            ]}
          >
            {password !== "" && !passwordIsLongEnough
              ? "Password must be at least 8 characters."
              : confirmPassword !== "" && !passwordsMatch
                ? "Passwords do not match."
                : submitted && !emailIsValid
                  ? "Please enter a valid email address."
                  : submitted && !phoneIsValid
                    ? "Use a Kenyan number such as +254 712 345 678."
                    : "Use at least 8 characters."}
          </Text>

          {role === "mechanic" ? (
            <View style={styles.roleNote}>
              <Text style={styles.roleNoteTitle}>Mechanic verification</Text>
              <Text style={styles.roleNoteText}>After account creation, you’ll complete your garage profile and submit verification details before receiving live jobs.</Text>
            </View>
          ) : null}

          {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

          <Pressable
            disabled={!formIsValid || loading}
            style={[styles.createAccount, (!formIsValid || loading) && styles.createAccountDisabled]}
            onPress={() => void handleCreateAccount()}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createAccountText}>Create account</Text>}
          </Pressable>

          <Pressable onPress={() => router.replace("/login")}>
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.login}>Log in</Text>
            </Text>
          </Pressable>

          <Text style={styles.termsOfService}>
            By creating an account, you agree to the Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function RoleCard({ title, subtitle, selected, onPress }: { title: string; subtitle: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.roleCard, selected && styles.roleCardSelected]} onPress={onPress}>
      <View style={[styles.roleIndicator, selected && styles.roleIndicatorSelected]} />
      <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>{title}</Text>
      <Text style={styles.roleSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function Field({ label, error, last, ...props }: any) {
  return (
    <View style={[styles.fieldContainer, last && styles.lastField]}>
      <Text style={styles.fieldTitle}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, error && styles.errorInput]}
        placeholderTextColor="#667085"
        autoCapitalize={props.keyboardType === "email-address" || props.secureTextEntry ? "none" : "sentences"}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  registerContainer: { flex: 1, backgroundColor: "#FFF" },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  title: { color: "#102A43", fontSize: 22, fontFamily: "Inter_600SemiBold", marginTop: 20, marginBottom: 10 },
  subTitle: { color: "#667085", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginBottom: 22 },
  sectionLabel: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  roleCard: { flex: 1, minHeight: 82, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 12, padding: 12, backgroundColor: "#FFFFFF" },
  roleCardSelected: { borderColor: "#1857A6", backgroundColor: "#EAF2FD" },
  roleIndicator: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: "#98A2B3", marginBottom: 8 },
  roleIndicatorSelected: { borderColor: "#1857A6", backgroundColor: "#1857A6" },
  roleTitle: { color: "#344054", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  roleTitleSelected: { color: "#1857A6" },
  roleSubtitle: { color: "#667085", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 3 },
  fieldContainer: { marginBottom: 16 },
  lastField: { marginBottom: 8 },
  fieldTitle: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 5 },
  input: { backgroundColor: "#fff", height: 52, width: "100%", borderColor: "#D0D5DD", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, color: "#344054", fontSize: 14, fontFamily: "Inter_400Regular" },
  errorInput: { borderColor: "#D9363E" },
  infoText: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 14 },
  errorText: { color: "#D9363E" },
  roleNote: { backgroundColor: "#EAF2FD", borderWidth: 1, borderColor: "#B8D2F0", borderRadius: 10, padding: 12, marginBottom: 14 },
  roleNoteTitle: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 11, marginBottom: 4 },
  roleNoteText: { color: "#344054", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 },
  serverError: { color: "#D9363E", backgroundColor: "#FFF1F2", borderRadius: 10, padding: 10, fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 12 },
  createAccount: { backgroundColor: "#1857A6", borderRadius: 12, height: 48, width: "100%", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  createAccountDisabled: { backgroundColor: "#A9C2DF" },
  createAccountText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  loginText: { color: "#344054", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 24, textAlign: "center" },
  login: { color: "#1857A6", fontFamily: "Inter_600SemiBold" },
  termsOfService: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 310, alignSelf: "center" },
});
