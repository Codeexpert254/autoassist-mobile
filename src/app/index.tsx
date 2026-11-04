import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 700);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Image
            source={require("../../assets/images/autoassistlogo.png")}
            style={styles.logoImage}
          />
          <Text style={styles.tagline}>Vehicle assistance, simplified.</Text>
          <Text style={styles.supportingText}>
            Find help. Compare options. Get moving.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#123D76",
  },
  safeArea: {
    flex: 1,
  },
  logoImage: {
    width: 200,
    height: 150,
    marginBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  supportingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#DCE9F8",
    textAlign: "center",
  },
});
