import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Addavehichle() {
  return (
    <View style={styles.addavehicleContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require("../../../assets/images/left-arrow.png")}
            style={styles.backIcon}
          />
          <Text style={styles.title}>Add a vehicle</Text>
        </View>
        <Text style={styles.subTitle}>
          Vehicle details help us match the right specialist and parts.
        </Text>
        <Text style={styles.buttonName}>Make</Text>
        <View style={[styles.buttonContainer, styles.identityContainer]}>
          <Text style={styles.buttonTitle}>Toyota</Text>
        </View>
        <Text style={styles.buttonName}>Model</Text>
        <View style={[styles.buttonContainer, styles.licenseContainer]}>
          <Text style={styles.buttonTitle}>Fielder</Text>
        </View>

        <View style={styles.vehicleRegInfo}>
          <View>
            <Text style={[styles.buttonName, styles.year]}>Year</Text>
            <View style={[styles.buttonContainer, styles.licenseContainer]}>
              <Text style={styles.buttonTitle}>2015</Text>
            </View>
          </View>
          <View>
            <Text style={[styles.buttonName, styles.registration]}>
              Registration
            </Text>
            <View style={[styles.buttonContainer, styles.licenseContainer]}>
              <Text style={styles.buttonTitle}>KDA XXX X</Text>
            </View>
          </View>
        </View>

        <Text style={styles.buttonName}>Fuel type</Text>
        <View style={[styles.buttonContainer, styles.licenseContainer]}>
          <Text style={styles.buttonTitle}>Petrol</Text>
        </View>
        <Text style={styles.buttonName}>Transmission</Text>
        <View style={[styles.buttonContainer, styles.licenseContainer]}>
          <Text style={styles.buttonTitle}>Automatic</Text>
        </View>
        <View style={styles.submittedButton}>
          <Text style={styles.submittedText}>View submitted documents</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  addavehicleContainer: {
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
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#FFF",
    gap: 4,
    padding: 14,
  },

  buttonName: {
    color: "#344054",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },

  year: {
    width: "100%",
  },

  registration: {
    width: 52,
  },

  vehicleRegInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  identityContainer: {
    marginBottom: 14,
  },

  licenseContainer: {
    marginBottom: 32,
  },

  buttonTitle: {
    color: "#344054",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
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
