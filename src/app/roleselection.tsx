import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type DemoRole, useDemoApp } from "@/context/demo-app-context";

const roles = [
  {
    key: "motorist",
    title: "MOTORIST",
    subtitle: "Request repairs, parts and towing",
    icon: require("../../assets/images/motorist.png"),
    route: "/motorist/home",
  },
  {
    key: "mechanic",
    title: "MECHANIC",
    subtitle: "Receive and manage repair jobs",
    icon: require("../../assets/images/mechanic.png"),
    route: "/mechanic/registration",
  },
  {
    key: "partsdealer",
    title: "PARTS DEALER",
    subtitle: "List stock and fulfil part requests",
    icon: require("../../assets/images/partsdealer.png"),
    route: "/partsdealer/registration",
  },
  {
    key: "towing",
    title: "TOWING AGENT",
    subtitle: "Receive nearby towing requests",
    icon: require("../../assets/images/towingagent.png"),
    route: "/towing/registration",
  },
  {
    key: "rider",
    title: "RIDER",
    subtitle: "Accept delivery jobs and deliver spare parts",
    icon: require("../../assets/images/rider.png"),
    route: "/rider/registration",
  },
] as const;

export default function RoleSelection() {
  const router = useRouter();
  const { selectRole } = useDemoApp();
  const [selected, setSelected] = useState(0);
  const current = roles[selected];

  const handleContinue = () => {
    selectRole(current.key as DemoRole);
    router.replace(current.route as never);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image source={require("../../assets/images/left-arrow.png")} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.title}>How will you use AutoAssist?</Text>
        </View>

        <Text style={styles.subTitle}>Choose the account that best matches what you need today.</Text>

        <View style={styles.roleList}>
          {roles.map((role, index) => {
            const active = selected === index;
            return (
              <Pressable
                key={role.key}
                onPress={() => setSelected(index)}
                style={[styles.roleCard, active && styles.roleCardActive]}
              >
                <View style={styles.imageBorder}>
                  <Image style={styles.roleIcon} source={role.icon} />
                </View>
                <View style={styles.roleContent}>
                  <Text style={styles.buttonTitle}>{role.title}</Text>
                  <Text style={styles.buttonSubTitle}>{role.subtitle}</Text>
                </View>
                <View style={[styles.selectIndicator, active ? styles.active : styles.inactive]} />
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue as {current.title.toLowerCase()}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 20, gap: 12, flexDirection: "row", alignItems: "center", marginBottom: 28 },
  backIcon: { width: 14, height: 14 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold", flex: 1 },
  subTitle: { color: "#667085", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  roleList: { gap: 14, flex: 1 },
  roleCard: { minHeight: 84, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1.5, borderColor: "#E4E7EC", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  roleCardActive: { backgroundColor: "#EAF2FD", borderColor: "#1857A6" },
  imageBorder: { width: 48, height: 48, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#F4F7FB", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  roleIcon: { width: 24, height: 24 },
  roleContent: { flex: 1, gap: 5 },
  buttonTitle: { color: "#102A43", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  buttonSubTitle: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  selectIndicator: { width: 18, height: 18, borderRadius: 9 },
  active: { backgroundColor: "#1857A6" },
  inactive: { backgroundColor: "#D0D5DD", opacity: 0.25 },
  continueButton: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#1857A6", backgroundColor: "#1857A6", justifyContent: "center", marginBottom: 24 },
  continueText: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center", color: "#FFFFFF" },
});
