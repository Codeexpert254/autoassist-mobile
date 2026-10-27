import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerifyAccount() {
  return (
    <View style={styles.verifyAccountContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/left-arrow.png")}
            style={styles.backIcon}
          />
          <Text style={styles.title}>Verify your account</Text>
        </View>
        <Text style={styles.subTitle}>
          Enter the 6-digit code sent to +254 712 ••• 678.
        </Text>
        <View style={styles.digitPlaceHoldersContainer}>
          <View style={styles.digitPlaceHolders}>
            <Text style={styles.number}>4</Text>
          </View>
          <View style={styles.digitPlaceHolders}>
            <Text style={styles.number}>5</Text>
          </View>
          <View style={styles.digitPlaceHolders}>
            <Text style={styles.number}>6</Text>
          </View>
          <View style={styles.digitPlaceHolders}>
            <Text style={styles.number}>.</Text>
          </View>
          <View style={styles.digitPlaceHolders}>
            <Text style={styles.number}>.</Text>
          </View>
          <View style={styles.digitPlaceHolders}>
            <Text style={styles.number}>.</Text>
          </View>
        </View>
        <Text style={styles.resendCode}>Resend code in 00:42</Text>
        <View style={styles.verifyButton}>
          <Text style={styles.verifyText}>Verify account</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  verifyAccountContainer: {
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

  digitPlaceHoldersContainer: {
    flexDirection: "row",
    gap: 9,
  },

  digitPlaceHolders: {
    width: 46,
    height: 52,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#FFF",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  number: {
    color: "#102A43",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },

  resendCode: {
    color: "#667085",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 24,
  },

  verifyButton: {
    height: 48,
    backgroundColor: "#1857A6",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  verifyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
