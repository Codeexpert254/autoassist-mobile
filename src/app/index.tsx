import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/onboarding");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* <Text style={styles.title}>AUTOASSIST</Text> */}
          <Image
            source={require("../../assets/images/autoassistlogo.png")}
            style={styles.logoImage}
          />
          {/* <View style={styles.logoBox}>
            {/* <Text style={styles.logoText}>AUTOASSIST</Text> 
          </View> */}
          <Text style={styles.tagline}>Vehicle assistance, simplified.</Text>
          <Text style={styles.supportingText}>
            Find help. Compare options. Get moving.
          </Text>
        </View>
        <Text style={styles.loadingText}>Loading your road support...</Text>
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
    paddingBottom: 24,
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
  logoBox: {
    width: 140,
    height: 90,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1857A6",
    borderWidth: 1,
    borderColor: "#4A8BD8",
    marginBottom: 22,
  },
  title: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 30,
    marginBottom: 29,
    fontFamily: "Inter_600SemiBold",
  },
  logoText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    textAlign: "center",
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

  loadingText: {
    textAlign: "center",
    color: "#DCE9F8",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
