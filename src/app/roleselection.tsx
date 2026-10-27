import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RoleSelection() {
  return (
    <View style={styles.roleSelectionContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/left-arrow.png")}
            style={styles.backIcon}
          />
          <Text style={styles.title}>How will you use AutoAssist?</Text>
        </View>
        <Text style={styles.subTitle}>
          Choose the account that best matches what you need today.
        </Text>
        <View style={[styles.buttonContainer, styles.motoristContainer]}>
          <View style={styles.imageBorder}>
            <Image
              style={styles.motoristIcon}
              source={require("../../assets/images/motorist.png")}
            />
          </View>
          <View style={styles.motoristContent}>
            <Text style={styles.buttonTitle}>MOTORIST</Text>
            <Text style={styles.buttonSubTitle}>
              Request repairs, parts and towing
            </Text>
          </View>
          <View style={[styles.selectIndicator, styles.active]}></View>
        </View>

        <View style={[styles.buttonContainer, styles.mechanicContainer]}>
          <View style={styles.imageBorder}>
            <Image
              style={styles.mechanicIcon}
              source={require("../../assets/images/mechanic.png")}
            />
          </View>
          <View style={styles.mechanicContent}>
            <Text style={styles.buttonTitle}>MECHANIC</Text>
            <Text style={styles.buttonSubTitle}>
              Receive and manage repair jobs{" "}
            </Text>
          </View>
          <View style={[styles.selectIndicator, styles.inactive]}></View>
        </View>

        <View style={[styles.buttonContainer, styles.partsDealerContainer]}>
          <View style={styles.imageBorder}>
            <Image
              style={styles.partsDealerIcon}
              source={require("../../assets/images/partsdealer.png")}
            />
          </View>
          <View style={styles.partsDealerContent}>
            <Text style={styles.buttonTitle}>PARTS DEALER</Text>
            <Text style={styles.buttonSubTitle}>
              List stock and fulfil part requests{" "}
            </Text>
          </View>
          <View style={[styles.selectIndicator, styles.inactive]}></View>
        </View>

        <View style={[styles.buttonContainer, styles.towingAgentContainer]}>
          <View style={styles.imageBorder}>
            <Image
              style={styles.towingAgentIcon}
              source={require("../../assets/images/towingagent.png")}
            />
          </View>
          <View style={styles.towingAgentContent}>
            <Text style={styles.buttonTitle}>TOWING AGENT</Text>
            <Text style={styles.buttonSubTitle}>
              Receive nearby towing requests{" "}
            </Text>
          </View>
          <View style={[styles.selectIndicator, styles.inactive]}></View>
        </View>

        <View style={[styles.buttonContainer, styles.riderContainer]}>
          <View style={styles.imageBorder}>
            <Image
              style={styles.riderIcon}
              source={require("../../assets/images/rider.png")}
            />
          </View>
          <View style={styles.riderContent}>
            <Text style={styles.buttonTitle}>RIDER</Text>
            <Text style={styles.buttonSubTitle}>
              Accept delivery jobs and deliver spare parts{" "}
            </Text>
          </View>
          <View style={[styles.selectIndicator, styles.inactive]}></View>
        </View>
        <Pressable style={styles.continueButton}>
          <Text style={styles.continueText}>Continue as motorist</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  roleSelectionContainer: {
    flex: 1,
    backgroundColor: "#fff",
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
    marginBottom: 28,
  },

  backIcon: {
    width: 14,
    height: 14,
  },

  title: {
    color: "#102A43",
    fontSize: 19,
    fontFamily: "Inter_600SemiBold",
    // marginBottom: 28,
    // textAlign: "center",
    // alignSelf: "center",
  },

  subTitle: {
    color: "#667085",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  imageBorder: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#F4F7FB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonContainer: {
    height: 92,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E4E7EC",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingTop: 18,
  },

  motoristContainer: {
    backgroundColor: "#EAF2FD",
    borderColor: "#1857A6",
    marginTop: 20,
    marginBottom: 20,
  },

  motoristContent: {
    flex: 1,
    gap: 5,
  },

  motoristIcon: {
    width: 24,
    height: 24,
  },

  mechanicContainer: {
    marginBottom: 20,
  },

  mechanicContent: {
    flex: 1,
    gap: 5,
  },

  mechanicIcon: {
    width: 24,
    height: 24,
  },

  partsDealerContainer: {
    marginBottom: 20,
  },

  partsDealerContent: {
    flex: 1,
    gap: 5,
  },

  partsDealerIcon: {
    width: 24,
    height: 24,
  },

  towingAgentContainer: {
    marginBottom: 20,
  },

  towingAgentContent: {
    flex: 1,
    gap: 5,
  },

  towingAgentIcon: {
    width: 24,
    height: 24,
  },

  riderContainer: {
    marginBottom: 28,
  },

  riderContent: {
    flex: 1,
    gap: 5,
  },

  riderIcon: {
    width: 24,
    height: 24,
  },

  buttonTitle: {
    color: "#102A43",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  buttonSubTitle: {
    color: "#667085",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  selectIndicator: {
    width: 18,
    height: 18,
  },

  active: {
    backgroundColor: "#1857A6",
    borderRadius: 9,
  },

  inactive: {
    backgroundColor: "#D0D5DD",
    borderRadius: 9,
    opacity: 0.2,
  },

  continueButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1857A6",
    backgroundColor: "#1857A6",
    justifyContent: "center",
  },

  continueText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    color: "#FFFFFF",
  },
});
