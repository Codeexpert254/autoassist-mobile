import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDemoApp } from "@/context/demo-app-context";

export default function Register() {
  const router = useRouter();
  const { register } = useDemoApp();
  const [fullname, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const compactPhone = phoneNumber.replace(/[\s-]/g, "");
  const phoneIsValid = /^(?:\+254|0)?[17]\d{8}$/.test(compactPhone);
  const passwordIsLongEnough = password.length >= 8;
  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  const formIsValid =
    fullname.trim() !== "" &&
    emailIsValid &&
    phoneIsValid &&
    passwordIsLongEnough &&
    password === confirmPassword;

  const handleCreateAccount = () => {
    setSubmitted(true);
    if (!formIsValid) return;

    register({
      name: fullname,
      email,
      phone: phoneNumber,
    });
    router.replace("/roleselection");
  };

  return (
    <View style={styles.registerContainer}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subTitle}>Create an account to continue to AutoAssist.</Text>

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
            ((password !== "" && !passwordIsLongEnough) || !passwordsMatch) && styles.errorText,
          ]}
        >
          {password !== "" && !passwordIsLongEnough
            ? "Password must be at least 8 characters."
            : !passwordsMatch
              ? "Passwords do not match."
              : submitted && !emailIsValid
                ? "Please enter a valid email address."
                : submitted && !phoneIsValid
                  ? "Use a Kenyan demo format such as +254 712 345 678."
                  : confirmPassword !== ""
                    ? "Passwords match"
                    : "Use at least 8 characters."}
        </Text>

        <Pressable
          style={[styles.createAccount, !formIsValid && styles.createAccountDisabled]}
          onPress={handleCreateAccount}
        >
          <Text style={styles.createAccountText}>Create account</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/login")}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.login}>Log in</Text>
          </Text>
        </Pressable>

        <Text style={styles.termsOfService}>
          By creating an account, you agree to the Terms of Service and Privacy Policy.
        </Text>
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
        autoCapitalize={props.keyboardType === "email-address" ? "none" : "sentences"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  registerContainer: { flex: 1, backgroundColor: "#FFF" },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  title: { color: "#102A43", fontSize: 22, fontFamily: "Inter_600SemiBold", marginTop: 20, marginBottom: 12 },
  subTitle: { color: "#667085", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 25 },
  fieldContainer: { marginBottom: 18 },
  lastField: { marginBottom: 10 },
  fieldTitle: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  input: { backgroundColor: "#fff", height: 52, width: "100%", borderColor: "#D0D5DD", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, color: "#344054", fontSize: 14, fontFamily: "Inter_400Regular" },
  errorInput: { borderColor: "#D9363E" },
  infoText: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 20 },
  errorText: { color: "#D9363E" },
  createAccount: { backgroundColor: "#1857A6", borderColor: "#1857A6", borderRadius: 12, borderWidth: 1, height: 48, width: "100%", justifyContent: "center", marginBottom: 20 },
  createAccountDisabled: { backgroundColor: "#A9C2DF", borderColor: "#A9C2DF" },
  createAccountText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  loginText: { color: "#344054", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 24, textAlign: "center" },
  login: { color: "#1857A6", fontFamily: "Inter_600SemiBold" },
  termsOfService: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", width: 310, alignSelf: "center" },
});
