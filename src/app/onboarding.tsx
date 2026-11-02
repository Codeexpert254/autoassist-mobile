import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const onboardingSteps = [
  {
    eyebrow: "TRUSTED HELP, FAST",
    title: "Car trouble? Get the right help nearby.",
    description: "Describe the issue once and AutoAssist helps you find verified mechanics matched to your vehicle and location.",
    hook: "Less guesswork. More confidence on the road.",
    features: [
      {
        text: "Find verified mechanics near you",
        icon: { ios: "wrench.and.screwdriver.fill", android: "build", web: "build" },
      },
      {
        text: "Match help to your vehicle and problem",
        icon: { ios: "checkmark.seal.fill", android: "verified", web: "verified" },
      },
      {
        text: "Request roadside support in a few taps",
        icon: { ios: "location.fill", android: "location_on", web: "location_on" },
      },
    ],
  },
  {
    eyebrow: "PARTS WITH CONFIDENCE",
    title: "Find parts that actually fit your vehicle.",
    description: "Compare compatible spare parts from verified dealers, review the price, and arrange delivery without chasing multiple shops.",
    hook: "The right part. The right seller. One clear flow.",
    features: [
      {
        text: "Compare verified parts dealers",
        icon: { ios: "storefront.fill", android: "storefront", web: "storefront" },
      },
      {
        text: "Check vehicle compatibility before ordering",
        icon: { ios: "car.fill", android: "directions_car", web: "directions_car" },
      },
      {
        text: "Get spare parts delivered to you",
        icon: { ios: "shippingbox.fill", android: "local_shipping", web: "local_shipping" },
      },
    ],
  },
  {
    eyebrow: "STAY IN CONTROL",
    title: "Know what is happening at every step.",
    description: "Follow repairs, deliveries, towing, payments, and status changes so you are never left wondering what happens next.",
    hook: "Clear updates from request to completion.",
    features: [
      {
        text: "Follow your repair progress live",
        icon: { ios: "chart.line.uptrend.xyaxis", android: "timeline", web: "timeline" },
      },
      {
        text: "Track deliveries and towing requests",
        icon: { ios: "map.fill", android: "route", web: "route" },
      },
      {
        text: "Receive important service updates",
        icon: { ios: "bell.badge.fill", android: "notifications_active", web: "notifications_active" },
      },
    ],
  },
] as const;

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
        <View style={styles.progressHeader}>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>STEP {currentStep} OF {onboardingSteps.length}</Text>
          </View>

          <View style={styles.progressTrack}>
            {onboardingSteps.map((_, index) => {
              const active = index + 1 <= currentStep;
              return <View key={index} style={[styles.progressSegment, active && styles.progressSegmentActive]} />;
            })}
          </View>
        </View>

        <View style={styles.illustrationCard}>
          <Image source={require("../../assets/images/illustrationimg.png")} style={styles.illustration} />
          <View style={styles.illustrationFooter}>
            <View style={styles.liveDot} />
            <Text style={styles.cardLabel}>AUTOASSIST • READY WHEN YOU NEED HELP</Text>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{step.eyebrow}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          <View style={styles.hookCard}>
            <SymbolView
              name={{ ios: "shield.checkered", android: "shield", web: "shield" } as never}
              size={21}
              tintColor="#1857A6"
            />
            <Text style={styles.hookText}>{step.hook}</Text>
          </View>

          <View style={styles.features}>
            {step.features.map((feature) => (
              <View style={styles.featureRow} key={feature.text}>
                <View style={styles.featureIconWrap}>
                  <SymbolView name={feature.icon as never} size={21} tintColor="#1857A6" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={handleNext} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>
            {currentStep === onboardingSteps.length ? "Get started with AutoAssist" : "Continue"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/login")}>
          <Text style={styles.loginText}>Already have an account? <Text style={styles.loginLink}>Log in</Text></Text>
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
  progressHeader: { width: "100%", maxWidth: 334, marginTop: 10 },
  stepPill: {
    alignSelf: "flex-start",
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 11,
    backgroundColor: "#EAF2FD",
    borderWidth: 1,
    borderColor: "#D5E4F7",
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillText: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.7 },
  progressTrack: { flexDirection: "row", gap: 7, marginTop: 12 },
  progressSegment: { flex: 1, height: 5, borderRadius: 999, backgroundColor: "#E4E7EC" },
  progressSegmentActive: { backgroundColor: "#1857A6" },
  illustrationCard: {
    width: "100%",
    maxWidth: 334,
    height: 205,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#B8D2F0",
    backgroundColor: "#EAF2FD",
    overflow: "hidden",
  },
  illustration: { width: "100%", height: 166 },
  illustrationFooter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#1B8A5A" },
  cardLabel: { color: "#1857A6", textAlign: "center", fontSize: 9, letterSpacing: 0.5, fontFamily: "Inter_600SemiBold" },
  copy: { width: "100%", maxWidth: 334 },
  eyebrow: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1, marginBottom: 7 },
  title: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 23, lineHeight: 29 },
  description: { color: "#475467", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 9 },
  hookCard: {
    marginTop: 15,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#F5F9FE",
    borderWidth: 1,
    borderColor: "#DCE9F8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 10,
  },
  hookText: { color: "#123D76", fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 16, flex: 1 },
  features: { marginTop: 17, gap: 11 },
  featureRow: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 2,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EAF2FD",
    borderWidth: 1,
    borderColor: "#D5E4F7",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { color: "#344054", fontFamily: "Inter_600SemiBold", fontSize: 12, lineHeight: 17, flex: 1 },
  footer: { alignItems: "center", paddingHorizontal: 28, paddingBottom: 24, paddingTop: 10, backgroundColor: "#FFFFFF" },
  button: {
    width: "100%",
    maxWidth: 334,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1857A6",
    shadowColor: "#123D76",
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  buttonPressed: { transform: [{ scale: 0.99 }], opacity: 0.94 },
  buttonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  loginText: { marginTop: 13, color: "#667085", fontFamily: "Inter_400Regular", fontSize: 12 },
  loginLink: { color: "#1857A6", fontFamily: "Inter_600SemiBold" },
  previewText: { marginTop: 9, color: "#98A2B3", fontFamily: "Inter_400Regular", fontSize: 10 },
});
