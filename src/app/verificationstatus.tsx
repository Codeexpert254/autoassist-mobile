import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerificationStatus() {
  return (
    <View style={styles.verificationStatusContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/left-arrow.png")}
            style={styles.backIcon}
          />
          <Text style={styles.title}>Verification status</Text>
        </View>
        <Text style={styles.subTitle}>
          We review provider documents before jobs or deliveries can be
          accepted.
        </Text>
        <View style={styles.underreview}>
          <Text style={styles.reviewTitle}>UNDER REVIEW</Text>
          <Text style={styles.reviewSubTitle}>
            Your documents are being reviewed
          </Text>
          <Text style={styles.reviewText}>
            Typical review time: within 24 hours. We will notify you when your
            account is verified.
          </Text>
        </View>
        <View style={[styles.buttonContainer, styles.identityContainer]}>
          <Text style={styles.buttonTitle}>Identity document</Text>
          <Text style={styles.buttonSubTitle}>Received </Text>
        </View>
        <View style={[styles.buttonContainer, styles.licenseContainer]}>
          <Text style={styles.buttonTitle}>Licence / business document</Text>
          <Text style={styles.buttonSubTitle}>Received </Text>
        </View>
        <View style={styles.submittedButton}>
          <Text style={styles.submittedText}>View submitted documents</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  verificationStatusContainer: {
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

  underreview: {
    height: 150,
    borderRadius: 14,
    borderColor: "#F5B942",
    backgroundColor: "#FFF7E8",
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },

  reviewTitle: {
    color: "#D98200",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 24,
  },

  reviewSubTitle: {
    color: "#102A43",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
  },

  reviewText: {
    color: "#667085",
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
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

  identityContainer: {
    marginBottom: 14,
  },

  licenseContainer: {
    marginBottom: 32,
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
