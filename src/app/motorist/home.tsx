import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  return (
    <View style={styles.homeContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heading}>
          <Text style={styles.subTitle}>Good afternoon</Text>
          <Text style={styles.subTitle}>Nairobi</Text>
        </View>
        <Text style={styles.title}>Abraham</Text>

        <View style={styles.vehicleContainer}>
          <Text style={styles.vehicle}>MY VEHICLE</Text>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleModel}>Toyota Fielder</Text>
            <Image
              source={require("../../../assets/images/left-arrow.png")}
              style={styles.backIcon}
            />
          </View>
          <Text style={styles.vehicleReg}>2015 • KDA XXX X</Text>
        </View>

        <Text style={styles.helpTitle}>What do you need help with?</Text>

        <View style={styles.submittedButton}>
          <Text style={styles.submittedText}>Describe a car problem</Text>
        </View>

        <Text style={styles.quickServices}>Quick services</Text>
        <View style={styles.servicesContainer}>
          <View style={styles.mechanicContainer}>
            <View style={styles.iconHolders}>
              <Image
                style={styles.mechanic}
                source={require("../../../assets/images/mechanicicon.png")}
              />
            </View>
            <Text style={styles.mechanicText}>MECHANIC</Text>
          </View>
          <View style={styles.mechanicContainer}>
            <View style={styles.iconHolders}>
              <Image
                style={styles.mechanic}
                source={require("../../../assets/images/partsicon.png")}
              />
            </View>
            <Text style={styles.mechanicText}>PARTS</Text>
          </View>
          <View style={styles.mechanicContainer}>
            <View style={styles.iconHolders}>
              <Image
                style={styles.mechanic}
                source={require("../../../assets/images/towingicon.png")}
              />
            </View>
            <Text style={styles.mechanicText}>TOWING</Text>
          </View>
        </View>

        <Text style={styles.recentActivity}>Recent activity</Text>
        <View style={styles.activityContainer}>
          <Text style={styles.activity}>Brake inspection</Text>

          <Text style={styles.activityStatus}>
            Completed • Nairobi Auto Care
          </Text>

          <Text style={styles.activityDetails}>View job details</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },

  heading: {
    marginTop: 20,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backIcon: {
    width: 10,
    height: 10,
    transform: [{ scaleX: -1 }],
    tintColor: "#FFF",
  },

  vehicleContainer: {
    backgroundColor: "#123D76",
    height: 105,
    padding: 16,
    gap: 12,
    borderRadius: 14,
    marginBottom: 35,
  },

  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  vehicle: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  vehicleModel: {
    color: "#FFF",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },

  vehicleReg: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  title: {
    color: "#102A43",
    fontSize: 23,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 18,
  },

  subTitle: {
    color: "#667085",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },

  helpTitle: {
    color: "#104A43",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
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
    borderColor: "##1857A6",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#1857A6",
    justifyContent: "center",
    marginBottom: 28,
  },

  submittedText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },

  quickServices: {
    color: "#102A43",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },

  servicesContainer: {
    flexDirection: "row",
    gap: 10,
  },

  mechanicContainer: {
    height: 92,
    width: 110,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderColor: "#D0D5DD",
    borderWidth: 1,
    alignItems: "center",
    paddingTop: 14,
    gap: 12,
    marginTop: 16,
  },

  iconHolders: {
    width: 42,
    height: 32,
    backgroundColor: "#EAF2FD",
    borderColor: "#D0D5DD",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 9,
  },

  mechanic: {
    height: 24,
    width: 24,
  },

  mechanicText: {
    color: "#344054",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },

  recentActivity: {
    color: "#102A43",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginTop: 38,
    marginBottom: 16,
  },

  activityContainer: {
    backgroundColor: "#FFF",
    borderColor: "#D0D5DD",
    borderWidth: 1,
    height: 105,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 6,
    justifyContent: "center",
  },

  activity: {
    color: "#102A43",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  activityStatus: {
    color: "#667085",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  activityDetails: {
    color: "#344054",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
