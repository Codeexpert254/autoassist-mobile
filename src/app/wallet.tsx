import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Wallet() {
  return (
    <View style={styles.walletContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/left-arrow.png")}
            style={styles.backIcon}
          />
          <Text style={styles.title}>Wallet & transactions</Text>
        </View>
        <Text style={styles.subTitle}>
          Payments, earnings and refunds across AutoAssist.
        </Text>

        <View
          style={[styles.buttonContainer, styles.availableBalanceContainer]}
        >
          <Text style={styles.buttonTitle}>AVAILABLE BALANCE</Text>
          <Text style={styles.buttonAmount}>KSh 18,420</Text>
          <Text style={styles.buttonSubTitle}>View payout settings</Text>
        </View>
        <View style={styles.mechanicContainer}>
          <View style={styles.lineDividerContainer}>
            <Text style={styles.lineTitle}>Mechanic service</Text>
            <Text style={[styles.lineSubTitle, styles.negative]}>
              - KSh 12,500
            </Text>
          </View>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.riderContainer}>
          <View style={styles.lineDividerContainer}>
            <Text style={styles.lineTitle}>Rider payout</Text>
            <Text style={[styles.lineSubTitle, styles.positive]}>
              + KSh 420
            </Text>
          </View>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.partsContainer}>
          <View style={styles.lineDividerContainer}>
            <Text style={styles.lineTitle}>Parts order refund</Text>
            <Text style={[styles.lineSubTitle, styles.positive]}>
              + KSh 1,450
            </Text>
          </View>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.managePaymentButton}>
          <Text style={styles.managePaymentText}>Manage payment methods</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  walletContainer: {
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
    height: 132,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#123D76",
    justifyContent: "center",
    gap: 10,
    padding: 14,
  },

  availableBalanceContainer: {
    marginBottom: 52,
  },

  licenseContainer: {
    marginBottom: 32,
  },

  buttonTitle: {
    color: "#DCE9F8",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 15,
  },

  buttonAmount: {
    color: "#FFF",
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
  },

  buttonSubTitle: {
    color: "#DCE9F8",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 15,
  },

  mechanicContainer: {
    flexDirection: "column",
    marginBottom: 33,
  },

  riderContainer: {
    flexDirection: "column",
    marginBottom: 33,
  },

  partsContainer: {
    flexDirection: "column",
    marginBottom: 83,
  },

  lineDividerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  dividerLine: {
    height: 1,
    width: "100%",
    backgroundColor: "#E4E7EC",
  },

  lineTitle: {
    color: "#344054",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 16,
    marginBottom: 4,
  },

  lineSubTitle: {
    color: "#344054",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 16,
    marginBottom: 4,
  },

  positive: {
    color: "#1B8A5A",
  },

  negative: {
    color: "#D9363E",
  },

  managePaymentButton: {
    height: 48,
    borderColor: "#1857A6",
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#FFF",
    justifyContent: "center",
  },

  managePaymentText: {
    color: "#1857A6",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
    textAlign: "center",
  },
});
