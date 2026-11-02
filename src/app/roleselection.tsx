import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type DemoRole, useDemoApp } from "@/context/demo-app-context";

const roles = [
  {
    key: "motorist",
    title: "Motorist",
    subtitle: "Request repairs, spare parts and towing",
    icon: require("../../assets/images/motorist.png"),
  },
  {
    key: "mechanic",
    title: "Mechanic",
    subtitle: "Create your profile, verify your details and receive repair jobs",
    icon: require("../../assets/images/mechanic.png"),
  },
  {
    key: "partsdealer",
    title: "Parts Dealer",
    subtitle: "Set up your store and fulfil spare-parts requests",
    icon: require("../../assets/images/partsdealer.png"),
  },
  {
    key: "towing",
    title: "Towing Agent",
    subtitle: "Set up your provider profile and receive towing requests",
    icon: require("../../assets/images/towingagent.png"),
  },
  {
    key: "rider",
    title: "Rider",
    subtitle: "Create your delivery profile and accept spare-parts deliveries",
    icon: require("../../assets/images/rider.png"),
  },
] as const;

export default function RoleSelection() {
  const router = useRouter();
  const { selectRole } = useDemoApp();

  const chooseRole = (role: DemoRole) => {
    selectRole(role);
    router.push({ pathname: "/register", params: { role } });
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>GET STARTED</Text>
            <Text style={styles.title}>How do you want to use AutoAssist?</Text>
            <Text style={styles.subTitle}>
              Choose your account type. We’ll take you straight to account creation.
            </Text>
          </View>

          <View style={styles.roleList}>
            {roles.map((role) => (
              <Pressable
                key={role.key}
                onPress={() => chooseRole(role.key as DemoRole)}
                style={({ pressed }) => [styles.roleCard, pressed && styles.roleCardPressed]}
              >
                <View style={styles.imageBorder}>
                  <Image style={styles.roleIcon} source={role.icon} />
                </View>
                <View style={styles.roleContent}>
                  <Text style={styles.buttonTitle}>{role.title}</Text>
                  <Text style={styles.buttonSubTitle}>{role.subtitle}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.loginButton} onPress={() => router.replace("/login")}>
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLink}>Log in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 28 },
  header: { marginBottom: 24 },
  eyebrow: { color: "#1857A6", fontSize: 10, letterSpacing: 1, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  title: { color: "#102A43", fontSize: 23, lineHeight: 29, fontFamily: "Inter_600SemiBold" },
  subTitle: { color: "#667085", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginTop: 9 },
  roleList: { gap: 12 },
  roleCard: { minHeight: 82, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E4E7EC", paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  roleCardPressed: { backgroundColor: "#F5F9FE", borderColor: "#B8D2F0" },
  imageBorder: { width: 48, height: 48, borderWidth: 1, borderColor: "#D5E4F7", backgroundColor: "#EAF2FD", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  roleIcon: { width: 24, height: 24 },
  roleContent: { flex: 1, gap: 4 },
  buttonTitle: { color: "#102A43", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  buttonSubTitle: { color: "#667085", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  chevron: { color: "#1857A6", fontSize: 26, lineHeight: 28, fontFamily: "Inter_400Regular" },
  loginButton: { alignItems: "center", paddingVertical: 18 },
  loginText: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular" },
  loginLink: { color: "#1857A6", fontFamily: "Inter_600SemiBold" },
});
