import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type AccountRole, useAuth } from "@/context/auth-context";
import { useDemoApp } from "@/context/demo-app-context";

const accountRoles: AccountRole[] = ["motorist", "mechanic", "partsdealer", "towing", "rider"];

const roleLabels: Record<AccountRole, string> = {
  motorist: "Motorist",
  mechanic: "Mechanic",
  partsdealer: "Parts Dealer",
  towing: "Towing Agent",
  rider: "Rider",
};

const providerNotes: Partial<Record<AccountRole, string>> = {
  mechanic: "After login, you’ll complete your mechanic profile and submit verification details before receiving jobs.",
  partsdealer: "After login, you’ll complete your store profile and verification before fulfilling live orders.",
  towing: "After login, you’ll complete your provider profile and verification before receiving towing requests.",
  rider: "After login, you’ll complete your rider profile and verification before accepting delivery jobs.",
};

function isAccountRole(value: string | undefined): value is AccountRole {
  return Boolean(value && accountRoles.includes(value as AccountRole));
}

export default function Register() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const requestedRole = Array.isArray(params.role) ? params.role[0] : params.role;
  const role: AccountRole = isAccountRole(requestedRole) ? requestedRole : "motorist";

  const { backendEnabled, signOut, signUp } = useAuth();
  const { register: demoRegister } = useDemoApp();
  const [fullname, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const goToLogin = (requiresEmailConfirmation: boolean) => {
    router.replace({
      pathname: "/login",
      params: {
        accountCreated: "1",
        email: email.trim(),
        role,
        needsConfirmation: requiresEmailConfirmation ? "1" : "0",
      },
    });
  };

  const handleCreateAccount = async () => {
    setSubmitted(true);
    setServerError("");
    if (!formIsValid || loading) return;

    setLoading(true);
    try {
      demoRegister({ name: fullname, email, phone: phoneNumber });

      if (!backendEnabled) {
        goToLogin(false);
        return;
      }

      const result = await signUp({
        fullName: fullname,
        email,
        phone: phoneNumber,
        password,
        role,
      });

      if (!result.requiresEmailConfirmation) {
        try {
          await signOut();
        } catch (signOutError) {
          console.warn("Account created but automatic sign-out failed", signOutError);
        }
      }

      goToLogin(result.requiresEmailConfirmation);
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
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>Create your {roleLabels[role]} account</Text>
              <Text style={styles.subTitle}>A few details and your account is ready.</Text>
            </View>
            <Pressable onPress={() => router.replace("/roleselection")}>
              <Text style={styles.changeRole}>Change role</Text>
            </Pressable>
          </View>

          <View style={styles.roleSummary}>
            <Text style={styles.roleSummaryLabel}>ACCOUNT TYPE</Text>
            <Text style={styles.roleSummaryValue}>{roleLabels[role]}</Text>
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

          {providerNotes[role] ? (
            <View style={styles.roleNote}>
              <Text style={styles.roleNoteTitle}>What happens after login?</Text>
              <Text style={styles.roleNoteText}>{providerNotes[role]}</Text>
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
  headingRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 20, marginBottom: 16 },
  headingCopy: { flex: 1 },
  title: { color: "#102A43", fontSize: 22, lineHeight: 28, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  subTitle: { color: "#667085", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  changeRole: { color: "#1857A6", fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 5 },
  roleSummary: { borderRadius: 12, backgroundColor: "#EAF2FD", borderWidth: 1, borderColor: "#D5E4F7", paddingHorizontal: 14, paddingVertical: 11, marginBottom: 22 },
  roleSummaryLabel: { color: "#667085", fontSize: 9, letterSpacing: 0.7, fontFamily: "Inter_600SemiBold" },
  roleSummaryValue: { color: "#1857A6", fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 3 },
  fieldContainer: { marginBottom: 16 },
  lastField: { marginBottom: 8 },
  fieldTitle: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 5 },
  input: { backgroundColor: "#fff", height: 52, width: "100%", borderColor: "#D0D5DD", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, color: "#344054", fontSize: 14, fontFamily: "Inter_400Regular" },
  errorInput: { borderColor: "#D9363E" },
  infoText: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 14 },
  errorText: { color: "#D9363E" },
  roleNote: { backgroundColor: "#F5F9FE", borderWidth: 1, borderColor: "#DCE9F8", borderRadius: 10, padding: 12, marginBottom: 14 },
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
