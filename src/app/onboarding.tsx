import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const onboardingSteps = [
  {
    title: "Help is closer than you think",
    description: "AutoAssist connects motorists with verified vehicle service providers nearby.",
    features: [
      ["Find qualified mechanics", require("../../assets/images/bullet-mechanic.png")],
      ["Compare spare-part options", require("../../assets/images/bullet-spare-parts.png")],
      ["Request towing when stranded", require("../../assets/images/bullet-towing.png")],
    ],
  },
  {
    title: "Find the right parts with confidence",
    description: "Compare compatible spare parts from verified dealers and get them delivered.",
    features: [
      ["Compare verified parts dealers", require("../../assets/images/bullet-mechanic.png")],
      ["Check parts compatible with your vehicle", require("../../assets/images/bullet-spare-parts.png")],
      ["Get spare parts delivered", require("../../assets/images/bullet-towing.png")],
    ],
  },
  {
    title: "Stay informed from start to finish",
    description: "Track your service, delivery, or towing request as help makes its way to you.",
    features: [
      ["Follow service progress", require("../../assets/images/bullet-mechanic.png")],
      ["Track deliveries and towing", require("../../assets/images/bullet-spare-parts.png")],
      ["Receive important status updates", require("../../assets/images/bullet-towing.png")],
    ],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const step = onboardingSteps[currentStep - 1];

  const handleNext = () => {
    if (currentStep < onboardingSteps.length) {
      setCurrentStep((value) => value + 1);
      return;
    }
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.step}>{currentStep} of {onboardingSteps.length}</Text>

        <View style={styles.illustrationCard}>
          <Image source={require("../../assets/images/illustrationimg.png")} style={styles.illustration} />
          <Text style={styles.cardLabel}>ROADSIDE HELP • NAIROBI</Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          <View style={styles.features}>
            {step.features.map(([text, icon]) => (
              <View style={styles.featureRow} key={text as string}>
                <Image source={icon as number} style={styles.featureIcon} />
                <Text style={styles.featureText}>{text as string}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={handleNext} style={styles.button}>
          <Text style={styles.buttonText}>{currentStep === 3 ? "Get Started" : "Next"}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/login")}>
          <Text style={styles.loginText}>Already have an account? Log in</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/preview")}>
          <Text style={styles.previewText}>Open developer preview</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, alignItems: "center", paddingHorizontal: 28 },
  step: { width: "100%", marginTop: 12, textAlign: "right", color: "#667085", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  illustrationCard: { width: "100%", maxWidth: 334, height: 220, marginTop: 27, marginBottom: 40, borderRadius: 18, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#EAF2FD", overflow: "hidden" },
  illustration: { width: "100%", height: 180 },
  cardLabel: { color: "#1857A6", textAlign: "center", fontSize: 13, marginTop: 12, fontFamily: "Inter_600SemiBold" },
  copy: { width: "100%", maxWidth: 334 },
  title: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 24 },
  description: { color: "#344054", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginTop: 12 },
  features: { marginTop: 34, gap: 24 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { width: 22, height: 22 },
  featureText: { color: "#344054", fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  footer: { alignItems: "center", paddingHorizontal: 28, paddingBottom: 30 },
  button: { width: "100%", maxWidth: 334, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#1857A6" },
  buttonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  loginText: { marginTop: 12, color: "#344054", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  previewText: { marginTop: 10, color: "#1857A6", fontFamily: "Inter_400Regular", fontSize: 11 },
});
