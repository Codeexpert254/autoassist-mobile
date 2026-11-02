import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDemoApp } from "@/context/demo-app-context";

export default function Profile() {
  const router = useRouter();
  const { state, logout } = useDemoApp();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <View style={styles.profileContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image source={require("../../assets/images/left-arrow.png")} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.title}>Profile & settings</Text>
        </View>
        <Text style={styles.subTitle}>Manage identity, contact, security and role information.</Text>

        <SettingCard title="Personal information" subtitle={state.user.name} onPress={() => {}} />
        <SettingCard title="Wallet & transactions" subtitle="View demo payments and payouts" onPress={() => router.push("/wallet")} />
        <SettingCard title="Payment methods" subtitle={state.paymentMethod} onPress={() => router.push("/shared/payment-methods")} />
        <SettingCard title="Phone & email" subtitle={`${state.user.phone} • ${state.user.email}`} onPress={() => {}} />
        <SettingCard title="Security" subtitle="Password & device access" onPress={() => router.push("/shared/security")} />
        <SettingCard title="Help & support" subtitle="FAQs, report a problem" onPress={() => router.push("/shared/help-center")} />

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function SettingCard({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 20, gap: 12, flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backIcon: { width: 14, height: 14 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subTitle: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 24 },
  card: { minHeight: 72, borderRadius: 12, borderWidth: 1, borderColor: "#E4E7EC", backgroundColor: "#FFFFFF", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { color: "#102A43", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardSubtitle: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular" },
  arrow: { color: "#1857A6", fontSize: 20, fontFamily: "Inter_600SemiBold" },
  logoutButton: { height: 48, borderColor: "#D9363E", borderWidth: 1, borderRadius: 10, backgroundColor: "#FFFFFF", justifyContent: "center", marginTop: "auto", marginBottom: 24 },
  logoutText: { color: "#D9363E", fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
});
