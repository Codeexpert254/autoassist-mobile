import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const onboardingSteps = [
  {
    title: "Help is closer than you think",
    description:
      "AutoAssist connects motorists with verified vehicle service providers nearby.",
    features: [
      {
        text: "Find qualified mechanics",
        icon: require("../../assets/images/bullet-mechanic.png"),
      },
      {
        text: "Compare spare-part options",
        icon: require("../../assets/images/bullet-spare-parts.png"),
      },
      {
        text: "Request towing when stranded",
        icon: require("../../assets/images/bullet-towing.png"),
      },
    ],
  },
  {
    title: "Find the right parts with confidence",
    description:
      "Compare compatible spare parts from verified dealers and get them delivered.",
    features: [
      {
        text: "Compare verified parts dealers",
        icon: require("../../assets/images/bullet-mechanic.png"),
      },
      {
        text: "Check parts compatible with your vehicle",
        icon: require("../../assets/images/bullet-spare-parts.png"),
      },
      {
        text: "Get spare parts delivered",
        icon: require("../../assets/images/bullet-towing.png"),
      },
    ],
  },
  {
    title: "Stay informed from start to finish",
    description:
      "Track your service, delivery, or towing request as help makes its way to you.",
    features: [
      {
        text: "Follow service progress",
        icon: require("../../assets/images/bullet-mechanic.png"),
      },
      {
        text: "Track deliveries and towing",
        icon: require("../../assets/images/bullet-spare-parts.png"),
      },
      {
        text: "Receive important status updates",
        icon: require("../../assets/images/bullet-towing.png"),
      },
    ],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const step = onboardingSteps[currentStep - 1];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      router.replace("/motorist/describe-problem");
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={styles.outercontainer}>
        <View style={styles.container}>
          <Text style={styles.subtitle}>{currentStep} of 3</Text>
          <View style={styles.illustrationCard}>
            <Image
              source={require("../../assets/images/illustrationimg.png")}
              style={styles.illustrationImg}
            />
            <Text style={styles.cardtitle}>ROADSIDE HELP • NAIROBI</Text>
          </View>
          <View style={styles.textSection}>
            <Text style={styles.textSectionTitle}>{step.title}</Text>
            <Text style={styles.textSectionSubTitle}>{step.description}</Text>
            {/* <View style={styles.features}>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Image
                    source={require("../../assets/images/bullet-mechanic.png")}
                    style={styles.mechanicIcon}
                  />
                </View>
                <Text style={styles.featureText}>Find qualified mechanics</Text>
              </View>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Image
                    source={require("../../assets/images/bullet-spare-parts.png")}
                    style={styles.sparepartIcon}
                  />
                </View>
                <Text style={styles.featureText}>
                  Compare spare-part options
                </Text>
              </View>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Image
                    source={require("../../assets/images/bullet-towing.png")}
                    style={styles.towtruckIcon}
                  />
                </View>
                <Text style={styles.featureText}>
                  Request towing when stranded
                </Text>
              </View>
            </View> */}

            <View style={styles.features}>
              {step.features.map((feature) => (
                <View style={styles.featureRow} key={feature.text}>
                  <View style={styles.featureIcon}>
                    <Image source={feature.icon} style={styles.featureImage} />
                  </View>

                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <Pressable onPress={handleNext} style={styles.button}>
          <Text style={styles.buttonText}>
            {currentStep === 3 ? "Get Started" : "Next"}
          </Text>
        </Pressable>
        <Text style={styles.loginText}> Already have an account? Log in</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  illustrationCard: {
    backgroundColor: "#EAF2FD",
    width: 306,
    height: 220,
    marginTop: 27,
    marginBottom: 40,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#B8D2F0",
  },

  illustrationImg: {
    marginTop: 0,
    width: "100%",
    height: 180,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  features: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: 40,
    marginBottom: 24,
  },

  featureRow: {
    flexDirection: "row",
    marginBottom: 28,
    gap: 12,
  },

  featureImage: {
    width: 22,
    height: 22,
  },

  featureText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#344054",
  },

  mechanicIcon: {
    width: 22,
    height: 22,
  },
  sparepartIcon: {
    width: 22,
    height: 22,
  },
  towtruckIcon: {
    width: 22,
    height: 22,
  },

  outercontainer: {
    flex: 1,
  },
  container: {
    backgroundColor: "#fff",
    flex: 1,
    alignItems: "center",
  },

  textSection: {
    width: 334,
  },

  textSectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    color: "#102A43",
  },

  textSectionSubTitle: {
    color: "#344054",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    height: 40,
    marginTop: 12,
  },

  cardtitle: {
    color: "#1857A6",
    textAlign: "center",
    fontSize: 13,
    marginTop: 12,
    fontFamily: "Inter_600SemiBold",
  },

  buttonContainer: {
    alignItems: "center",
    marginBottom: 48,
  },

  button: {
    backgroundColor: "#1857A6",
    width: 334,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  loginText: {
    marginTop: 12,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#344054",
  },

  subtitle: {
    fontSize: 12,
    color: "#667085",
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    width: 334,
    marginTop: 12,
  },
});
