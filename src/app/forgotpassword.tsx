import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPassword() {
  return (
    <View style={styles.forgotPasswordContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/left-arrow.png")}
            style={styles.backIcon}
          />
          <Text style={styles.title}>Reset password</Text>
        </View>
        <Text style={styles.subTitle}>
          Enter your phone or email and we will send a secure reset code.
        </Text>
        <View style={styles.emailContainer}>
          <Text style={styles.emailTitle}>Email or phone</Text>
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonText}>name@example.com</Text>
          </View>
        </View>
        <Pressable style={styles.button}>
          <Text style={styles.resetCode}>Send reset code</Text>
        </Pressable>
        <Text style={styles.rememberPassword}>
          Remembered your password? Log in
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  forgotPasswordContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },

  header: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },

  backIcon: {
    width: 14,
    height: 14,
  },

  title: {
    color: "#102A43",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },

  subTitle: {
    color: "#667085",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 32,
  },

  emailTitle: {
    color: "#344054",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },

  buttonContainer: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4E7EC",
    borderWidth: 1,
    borderRadius: 10,
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  buttonText: {
    color: "#667085",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  emailContainer: {
    marginBottom: 26,
  },

  button: {
    backgroundColor: "#1857A6",
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  resetCode: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  rememberPassword: {
    color: "#1857A6",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
