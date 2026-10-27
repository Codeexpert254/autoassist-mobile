import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Messages() {
  return (
    <View style={styles.orderchatContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/left-arrow.png")}
            style={styles.backIcon}
          />
          <Text style={styles.title}>Nairobi Auto Care</Text>
        </View>
        <Text style={styles.subTitle}>Job #REP-1028 • verified mechanic </Text>
        <View style={styles.chatContainer}>
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonTitle}>
              I have arrived at your location.
            </Text>
          </View>
          <View style={[styles.buttonContainer, styles.replyContainer]}>
            <Text style={styles.buttonTitle}>Great, I am coming outside.</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  orderchatContainer: {
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
    width: 240,
    height: 66,
    borderRadius: 14,
    backgroundColor: "#F4F7FB",
    justifyContent: "center",
    gap: 4,
    padding: 14,
    marginBottom: 20,
  },

  chatContainer: {
    flexDirection: "column",
  },

  replyContainer: {
    alignSelf: "flex-end",
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
