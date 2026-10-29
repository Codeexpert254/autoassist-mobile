import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Messages() {
  const router = useRouter();

  return (
    <View style={styles.messagesContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image source={require("../../assets/images/left-arrow.png")} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.title}>Messages</Text>
        </View>
        <Text style={styles.subTitle}>Keep conversations tied to jobs and orders.</Text>

        <MessageCard
          title="Nairobi Auto Care"
          subtitle="I am 8 minutes away • Job #REP-1028"
          onPress={() => router.push("/orderchat")}
        />
        <MessageCard
          title="Kevin M. • Rider"
          subtitle="I have collected your brake pads"
          onPress={() => router.push("/orderchat")}
        />
        <MessageCard
          title="AutoAssist Support"
          subtitle="Your dispute ticket has been updated"
          onPress={() => router.push("/shared/support-ticket")}
        />
      </SafeAreaView>
    </View>
  );
}

function MessageCard({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.copy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  messagesContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 20, gap: 12, flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backIcon: { width: 14, height: 14 },
  title: { color: "#102A43", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  subTitle: { color: "#667085", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 24 },
  card: { minHeight: 78, borderRadius: 12, borderWidth: 1, borderColor: "#E4E7EC", backgroundColor: "#FFFFFF", padding: 14, marginBottom: 16, flexDirection: "row", alignItems: "center" },
  copy: { flex: 1, gap: 5 },
  cardTitle: { color: "#102A43", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardSubtitle: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular" },
  arrow: { color: "#1857A6", fontSize: 22, fontFamily: "Inter_600SemiBold" },
});
