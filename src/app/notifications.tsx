import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Notifications() {
  return (
    <View style={styles.notificationsContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/left-arrow.png")}
            style={styles.backIcon}
          />
          <Text style={styles.title}>Notifications</Text>
        </View>
        <Text style={styles.subTitle}>
          Job, order, payment and verification updates.
        </Text>
        <View style={[styles.buttonContainer, styles.mechanicContainer]}>
          <Text style={styles.buttonTitle}>Mechanic accepted your request</Text>
          <Text style={styles.buttonSubTitle}>
            Nairobi Auto Care is 12 min away
          </Text>
        </View>
        <View style={[styles.buttonContainer, styles.sparepartContainer]}>
          <Text style={styles.buttonTitle}>Spare-part order dispatched</Text>
          <Text style={styles.buttonSubTitle}>
            Kevin M. is delivering order AAR-48219
          </Text>
        </View>
        <View style={[styles.buttonContainer, styles.verificationContainer]}>
          <Text style={styles.buttonTitle}>Verification approved</Text>
          <Text style={styles.buttonSubTitle}>
            Your provider account can now go online
          </Text>
        </View>
        <View style={[styles.buttonContainer, styles.paymentContainer]}>
          <Text style={styles.buttonTitle}>Payment received</Text>
          <Text style={styles.buttonSubTitle}>
            KSh 3,500 was added to your wallet
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  notificationsContainer: {
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
    backgroundColor: "#EAF7F1",
    justifyContent: "center",
    gap: 4,
    padding: 14,
  },

  mechanicContainer: {
    marginBottom: 16,
  },

  sparepartContainer: {
    marginBottom: 16,
  },

  verificationContainer: {
    marginBottom: 16,
  },

  paymentContainer: {
    marginBottom: 16,
    backgroundColor: "#FFF7E8",
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
});
