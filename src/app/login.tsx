import "expo-sqlite/localStorage/install";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

function isAccountRole(value: string | undefined): value is AccountRole {
  return Boolean(value && accountRoles.includes(value as AccountRole));
}

function getAuthErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String((error as { code?: unknown }).code ?? "");
}

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    accountCreated?: string;
    email?: string;
    role?: string;
    needsConfirmation?: string;
  }>();
  const requestedRole = Array.isArray(params.role) ? params.role[0] : params.role;
  const accountCreated = params.accountCreated === "1";
  const needsConfirmation = params.needsConfirmation === "1";
  const createdRole = isAccountRole(requestedRole) ? roleLabels[requestedRole] : "AutoAssist";

  const { backendEnabled, signIn, signOut, resendConfirmation } = useAuth();
  const { login: demoLogin, selectRole } = useDemoApp();
  const [loginRole, setLoginRole] = useState<AccountRole>(isAccountRole(requestedRole) ? requestedRole : "motorist");
  const [email, setEmail] = useState(params.email ?? "");
  useEffect(()=>{
    if(params.email)return;
    try {
      const lastEmail=globalThis.localStorage?.getItem("autoassist:lastLoginEmail");
      if(lastEmail)setEmail(current=>current||lastEmail);
    }catch{ /* Optional convenience only; never cache passwords. */ }
  },[params.email]);
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showResend, setShowResend] = useState(needsConfirmation);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordIsValid = password.length >= 6;
  const formIsValid = emailIsValid && passwordIsValid;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const routeUser = (role: AccountRole) => {
    switch (role) {
      case "mechanic":
        router.replace("/mechanic/dashboard");
        return;
      case "partsdealer":
        router.replace("/partsdealer/registration");
        return;
      case "towing":
        router.replace("/towing/registration");
        return;
      case "rider":
        router.replace("/rider/registration");
        return;
      default:
        router.replace("/motorist/home");
    }
  };

  const handleLogin = async () => {
    setSubmitted(true);
    setServerError("");
    setResendMessage("");
    if (!formIsValid || loading) return;

    setLoading(true);
    try {
      if (!backendEnabled) {
        selectRole(loginRole);
        demoLogin(email);
        routeUser(loginRole);
        return;
      }

      const profile = await signIn(email, password);
      const actualRole = profile.role as AccountRole;

      if (actualRole !== loginRole) {
        await signOut();
        throw new Error(
          `This account is registered as ${roleLabels[actualRole] ?? "a different role"}. Select ${roleLabels[actualRole] ?? "the correct role"} under “Log in as”, or use a ${roleLabels[loginRole]} account.`,
        );
      }

      try{globalThis.localStorage?.setItem("autoassist:lastLoginEmail",email.trim().toLowerCase());}
      catch{ /* Email convenience must not block sign-in. */ }
      selectRole(loginRole);
      demoLogin(email);
      routeUser(loginRole);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to log in. Please try again.";
      const code = getAuthErrorCode(error);
      const emailNotConfirmed = code === "email_not_confirmed" || message.toLowerCase().includes("email not confirmed");

      if (emailNotConfirmed) {
        setShowResend(true);
        setServerError("Your email is not confirmed yet. Use the button below to resend the AutoAssist confirmation email.");
      } else {
        setServerError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setSubmitted(true);
    setServerError("");
    setResendMessage("");

    if (!emailIsValid) {
      setServerError("Enter the email address you used to create the account first.");
      return;
    }
    if (resendLoading || resendCooldown > 0) return;

    setResendLoading(true);
    try {
      if (!backendEnabled) {
        setResendMessage("Developer Preview does not send confirmation emails.");
        return;
      }

      await resendConfirmation(email);
      setResendMessage("Confirmation email sent. Check your inbox and spam/junk folder, then confirm before logging in.");
      setResendCooldown(60);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to resend the confirmation email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subTitle}>Choose the account type you want to access, then log in.</Text>

          <Text style={styles.roleLabel}>Log in as</Text>
          <View style={styles.roleWrap}>
            {accountRoles.map((role) => (
              <Pressable
                key={role}
                onPress={() => {
                  setLoginRole(role);
                  setServerError("");
                  setResendMessage("");
                }}
                style={[styles.roleChip, loginRole === role && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, loginRole === role && styles.roleChipTextActive]}>
                  {roleLabels[role]}
                </Text>
              </Pressable>
            ))}
          </View>

          {accountCreated ? (
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>Account created successfully</Text>
              <Text style={styles.successText}>
                {needsConfirmation
                  ? `Your ${createdRole} account is ready. Confirm your email, then log in below.`
                  : `Your ${createdRole} account is ready. Log in below to continue.`}
              </Text>
            </View>
          ) : null}

          <View style={styles.emailContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, submitted && !emailIsValid && styles.errorInput]}
              placeholder="name@example.com"
              placeholderTextColor="#667085"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              // Let Android/Samsung and Google Password Manager identify the username.
              autoComplete="email"
              importantForAutofill="yes"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setResendMessage("");
              }}
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
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              importantForAutofill="yes"
              value={password}
              onChangeText={setPassword}
            />
            {submitted && !passwordIsValid ? (
              <Text style={styles.errorText}>Enter your password (at least 6 characters).</Text>
            ) : null}
          </View>

          {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

          {showResend ? (
            <View style={styles.resendCard}>
              <Text style={styles.resendTitle}>Didn't receive the confirmation email?</Text>
              <Text style={styles.resendText}>
                We can send a new AutoAssist confirmation email to the address above. Also check Spam or Junk.
              </Text>
              {resendMessage ? <Text style={styles.resendSuccess}>{resendMessage}</Text> : null}
              <Pressable
                disabled={!emailIsValid || resendLoading || resendCooldown > 0}
                style={[
                  styles.resendButton,
                  (!emailIsValid || resendLoading || resendCooldown > 0) && styles.resendButtonDisabled,
                ]}
                onPress={() => void handleResendConfirmation()}
              >
                {resendLoading ? (
                  <ActivityIndicator color="#1857A6" />
                ) : (
                  <Text style={styles.resendButtonText}>
                    {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend confirmation email"}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.autofillHint}>Tap the email or password field to use saved credentials from your phone’s password manager.</Text>
          <Pressable onPress={() => router.push("/forgotpassword")}>
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </Pressable>

          <Pressable
            disabled={!formIsValid || loading}
            style={[styles.loginButton, (!formIsValid || loading) && styles.loginButtonDisabled]}
            onPress={() => void handleLogin()}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Log in as {roleLabels[loginRole]}</Text>}
          </Pressable>

          {!backendEnabled ? (
            <Text style={styles.demoHint}>
              Live backend variables are not configured on this device, so login will use Developer Preview mode.
            </Text>
          ) : (
            <Text style={styles.liveHint}>Secure login powered by AutoAssist cloud services.</Text>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={[styles.input, styles.createAccountButton]} onPress={() => router.push("/roleselection")}>
            <Text style={styles.createAccount}>Create account</Text>
          </Pressable>

          <Text style={styles.termsOfService}>
            By continuing, you agree to the Terms of Service and Privacy Policy.
          </Text>

          <Pressable style={styles.devPreviewButton} onPress={() => router.push("/preview")}>
            <Text style={styles.devPreviewText}>Developer Preview</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 22, marginTop: 20, marginBottom: 8 },
  subTitle: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 18 },
  roleLabel: { color: "#344054", fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 8 },
  roleWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  roleChip: { minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: "#D0D5DD", paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  roleChipActive: { borderColor: "#1857A6", backgroundColor: "#EAF2FD" },
  roleChipText: { color: "#667085", fontFamily: "Inter_600SemiBold", fontSize: 10 },
  roleChipTextActive: { color: "#1857A6" },
  successBanner: { backgroundColor: "#ECFDF3", borderColor: "#ABEFC6", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 20 },
  successTitle: { color: "#067647", fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 4 },
  successText: { color: "#344054", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  emailContainer: { marginBottom: 18 },
  passwordContainer: { marginBottom: 10 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#344054", marginBottom: 6 },
  input: { backgroundColor: "#FFFFFF", width: "100%", minHeight: 52, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", justifyContent: "center", paddingHorizontal: 14, color: "#344054", fontFamily: "Inter_400Regular", fontSize: 14 },
  errorInput: { borderColor: "#D9363E" },
  errorText: { color: "#D9363E", fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 5 },
  serverError: { color: "#D9363E", backgroundColor: "#FFF1F2", borderRadius: 10, padding: 10, fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 12 },
  resendCard: { backgroundColor: "#F5F9FE", borderWidth: 1, borderColor: "#B8D2F0", borderRadius: 12, padding: 12, marginBottom: 16 },
  resendTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 4 },
  resendText: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 },
  resendSuccess: { color: "#067647", fontFamily: "Inter_600SemiBold", fontSize: 10, lineHeight: 15, marginTop: 8 },
  resendButton: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#1857A6", alignItems: "center", justifyContent: "center", marginTop: 10, backgroundColor: "#FFFFFF" },
  resendButtonDisabled: { borderColor: "#B8D2F0", backgroundColor: "#F2F4F7" },
  resendButtonText: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  autofillHint:{fontSize:11,lineHeight:17,color:"#667085",marginTop:8,marginBottom:12},
  forgotPassword: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#344054", alignSelf: "flex-end", marginBottom: 25 },
  loginButton: { width: "100%", height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#1857A6" },
  loginButtonDisabled: { backgroundColor: "#A9C2DF" },
  buttonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "center" },
  demoHint: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center", marginTop: 8, marginBottom: 18 },
  liveHint: { color: "#1B8A5A", fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center", marginTop: 8, marginBottom: 18 },
  dividerRow: { flexDirection: "row", marginBottom: 20, alignItems: "center" },
  dividerLine: { backgroundColor: "#D0D5DD", flex: 1, height: 1 },
  orText: { marginHorizontal: 12, fontFamily: "Inter_400Regular", fontSize: 12, color: "#667085" },
  createAccountButton: { alignItems: "center", marginBottom: 24 },
  createAccount: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "center" },
  termsOfService: { width: 310, alignSelf: "center", textAlign: "center", fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#667085" },
  devPreviewButton: { alignSelf: "center", marginTop: 20, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#EAF2FD" },
  devPreviewText: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 11 },
});