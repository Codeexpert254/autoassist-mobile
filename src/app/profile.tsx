import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  return (
    <View style={styles.profileContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/left-arrow.png")}
            style={styles.backIcon}
          />
          <Text style={styles.title}>Profile & settings</Text>
        </View>
        <Text style={styles.subTitle}>
          Manage identity, contact, security and role information.
        </Text>

        <View style={[styles.buttonContainer, styles.personalContainer]}>
          <Text style={styles.buttonTitle}>Personal information</Text>
          <Text style={styles.buttonSubTitle}>Abraham Masai</Text>
        </View>
        <View style={[styles.buttonContainer, styles.savedContainer]}>
          <Text style={styles.buttonTitle}>Saved locations</Text>
          <Text style={styles.buttonSubTitle}>Home, Work</Text>
        </View>
        <View style={[styles.buttonContainer, styles.paymentContainer]}>
          <Text style={styles.buttonTitle}>Payment methods</Text>
          <Text style={styles.buttonSubTitle}>M-PESA •••• 2481</Text>
        </View>
        <View style={[styles.buttonContainer, styles.phoneContainer]}>
          <Text style={styles.buttonTitle}>Phone & email</Text>
          <Text style={styles.buttonSubTitle}>Verified</Text>
        </View>
        <View style={[styles.buttonContainer, styles.securityContainer]}>
          <Text style={styles.buttonTitle}>Security</Text>
          <Text style={styles.buttonSubTitle}>Password & device access</Text>
        </View>
        <View style={[styles.buttonContainer, styles.helpContainer]}>
          <Text style={styles.buttonTitle}>Help & supportl</Text>
          <Text style={styles.buttonSubTitle}>FAQs, report a problem</Text>
        </View>
        <View style={styles.submittedButton}>
          <Text style={styles.submittedText}>Log out</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },

  header: {
    marginTop: 20,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  backIcon: {
    width: 14,
    height: 14,
  },

  title: {
    color: "#102A43",
    fontSize: 19,
    fontFamily: "Inter_600SemiBold",
  },

  subTitle: {
    color: "#667085",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },

  buttonContainer: {
    height: 78,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#FFF",
    justifyContent: "center",
    gap: 4,
    padding: 14,
  },

  personalContainer: {
    marginBottom: 4,
  },

  phoneContainer: {
    marginBottom: 4,
  },
  savedContainer: {
    marginBottom: 4,
  },

  paymentContainer: {
    marginBottom: 4,
  },

  securityContainer: {
    marginBottom: 4,
  },

  helpContainer: {
    marginBottom: 42,
  },

  buttonTitle: {
    color: "#102A43",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },

  buttonSubTitle: {
    color: "#667085",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },

  submittedButton: {
    height: 48,
    borderColor: "#1857A6",
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#FFF",
    justifyContent: "center",
  },

  submittedText: {
    color: "#1857A6",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
    textAlign: "center",
  },
});
