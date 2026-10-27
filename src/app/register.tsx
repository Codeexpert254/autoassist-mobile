import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Register() {
  const [fullname, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = confirmPassword === "" || password === confirmPassword;
  const passwordIsLongEnough = password.length >= 8;

  const formIsValid =
    fullname.trim() !== "" &&
    email.trim() !== "" &&
    phoneNumber.trim() !== "" &&
    passwordIsLongEnough &&
    password === confirmPassword;

  return (
    <View style={styles.registerContainer}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subTitle}>
          Create an account to continue to AutoAssist.
        </Text>
        <View style={styles.fullnameContainer}>
          <Text style={styles.fullnameTitle}>Full name</Text>
          <TextInput
            style={styles.buttonContainer}
            value={fullname}
            onChangeText={setFullName}
            placeholder="Abraham Masai"
            placeholderTextColor="#667085"
          />
        </View>
        <View style={styles.emailContainer}>
          <Text style={styles.emailTitle}>Email</Text>
          <TextInput
            style={styles.buttonContainer}
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor="#667085"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.numberContainer}>
          <Text style={styles.numberTitle}>Phone number</Text>
          <TextInput
            style={styles.buttonContainer}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+254 712 345 678"
            placeholderTextColor="#667085"
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.passwordContainer}>
          <Text style={styles.passwordTitle}>Password</Text>
          <TextInput
            style={styles.buttonContainer}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#667085"
            secureTextEntry
          />
        </View>
        <View style={styles.confirmPasswordContainer}>
          <Text style={styles.confirmPasswordTitle}>Confirm password</Text>
          <TextInput
            style={[
              styles.buttonContainer,
              !passwordsMatch && styles.errorInput,
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder=""
            placeholderTextColor="#667085"
            secureTextEntry
          />
        </View>
        <Text
          style={[
            styles.infoText,
            (!passwordIsLongEnough || !passwordsMatch) && styles.errorText,
          ]}
        >
          {password !== "" && !passwordIsLongEnough
            ? "Password must be at least 8 characters."
            : !passwordsMatch
              ? "Passwords do not match."
              : confirmPassword !== ""
                ? "Passwords match"
                : "Use at least 8 characters."}
        </Text>
        <Pressable
          style={[
            styles.createAccount,
            !formIsValid && styles.createAccountDisabled,
          ]}
          disabled={!formIsValid}
        >
          <Text style={styles.createAccountText}>Create account</Text>
        </Pressable>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.login}>Log in</Text>
        </Text>
        <Text style={styles.termsOfService}>
          By creating an account, you agree to the Terms of Service and Privacy
          Policy.
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  registerContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },

  title: {
    color: "#102A43",
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    marginTop: 20,
    marginBottom: 12,
  },

  subTitle: {
    color: "#667085",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 25,
  },

  fullnameTitle: {
    color: "#344054",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },

  errorText: {
    color: "#D9363E",
  },

  errorInput: {
    borderColor: "#D9363E",
  },

  buttonContainer: {
    backgroundColor: "#fff",
    height: 52,
    width: "100%",
    borderColor: "#D0D5DD",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
    color: "#344054",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },

  fullnameContainer: {
    marginBottom: 22,
  },

  emailTitle: {
    color: "#344054",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },

  emailContainer: {
    marginBottom: 22,
  },

  numberTitle: {
    color: "#344054",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },

  numberContainer: {
    marginBottom: 22,
  },

  passwordTitle: {
    color: "#344054",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },

  passwordContainer: {
    marginBottom: 22,
  },

  confirmPasswordTitle: {
    color: "#344054",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },

  confirmPasswordContainer: {
    marginBottom: 10,
  },

  infoText: {
    color: "#667085",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },

  createAccount: {
    backgroundColor: "#1857A6",
    borderColor: "#1857A6",
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    width: "100%",
    justifyContent: "center",
    marginBottom: 20,
  },

  createAccountText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },

  loginText: {
    color: "#344054",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 32,
    textAlign: "center",
  },

  login: {
    color: "#1857A6",
    fontFamily: "Inter_600SemiBold",
  },

  termsOfService: {
    color: "#667085",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    width: 310,
    alignSelf: "center",
  },

  createAccountDisabled: {
    backgroundColor: "#A9C2DF",
    borderColor: "#A9C2DF",
  },
});
