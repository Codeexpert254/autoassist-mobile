import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  return (
    <View style={styles.loginContainer}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subTitle}>Log in to continue to AutoAssist.</Text>
        <View style={styles.emailContainer}>
          <Text style={styles.email}>Email</Text>
          <View style={styles.buttonContainer}>
            <Text style={styles.emailText}>name@example.com</Text>
          </View>
        </View>
        <View style={styles.passwordContainer}>
          <Text style={styles.password}>Password</Text>
          <View style={styles.buttonContainer}>
            <Text style={styles.passwordText}>••••••••</Text>
          </View>
        </View>
        <Text style={styles.forgotPassword}>Forgot password?</Text>
        <Pressable style={styles.loginButton}>
          <Text style={styles.buttonText}>Log in</Text>
        </Pressable>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>
        <Pressable style={[styles.buttonContainer, styles.createAccountButton]}>
          <Text style={styles.createAccount}>Create a new account</Text>
        </Pressable>
        <Text style={styles.termsOfService}>
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },

  title: {
    color: "#102A43",
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    marginTop: 20,
    marginBottom: 12,
  },

  subTitle: {
    color: "#667085",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 35,
  },

  emailContainer: {
    marginBottom: 21,
  },

  email: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#344054",
    marginBottom: 6,
  },

  emailText: {
    color: "#344054",
    paddingLeft: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },

  buttonContainer: {
    backgroundColor: "#fff",
    width: "100%",
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    justifyContent: "center",
  },

  passwordContainer: {
    marginBottom: 13,
  },

  password: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#344054",
    marginBottom: 6,
  },

  passwordText: {
    color: "#344054",
    paddingLeft: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },

  forgotPassword: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#344054",
    alignSelf: "flex-end",
    marginBottom: 25,
  },

  loginButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    backgroundColor: "#1857A6",
    marginBottom: 25,
  },

  buttonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  createAccountButton: {
    marginBottom: 42,
  },

  createAccount: {
    color: "#102A43",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  dividerRow: {
    flexDirection: "row",
    marginBottom: 25,
    alignItems: "center",
  },

  dividerLine: {
    backgroundColor: "#D0D5DD",
    flex: 1,
    height: 1,
  },

  orText: {
    marginHorizontal: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#667085",
  },

  termsOfService: {
    width: 310,
    alignSelf: "center",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#667085",
  },
});
