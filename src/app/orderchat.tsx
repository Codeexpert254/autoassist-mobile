import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDemoApp } from "@/context/demo-app-context";

export default function OrderChat() {
  const router = useRouter();
  const { state, sendMessage } = useDemoApp();
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage(message);
    setMessage("");
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image source={require("../../assets/images/left-arrow.png")} style={styles.backIcon} />
          </Pressable>
          <View>
            <Text style={styles.title}>Nairobi Auto Care</Text>
            <Text style={styles.subTitle}>Job #REP-1028 • verified mechanic</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.chatContent}>
            {state.messages.map((item) => (
              <View
                key={item.id}
                style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}
              >
                <Text style={styles.sender}>{item.mine ? "You" : item.sender}</Text>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#98A2B3"
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Pressable
              style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
            >
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 16, gap: 12, flexDirection: "row", alignItems: "center", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#E4E7EC" },
  backIcon: { width: 14, height: 14 },
  title: { color: "#102A43", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  subTitle: { color: "#667085", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  keyboardArea: { flex: 1 },
  chatContent: { flexGrow: 1, paddingVertical: 20, gap: 12 },
  bubble: { maxWidth: "80%", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: "flex-end", backgroundColor: "#EAF2FD" },
  theirs: { alignSelf: "flex-start", backgroundColor: "#F4F7FB" },
  sender: { color: "#667085", fontSize: 9, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  messageText: { color: "#102A43", fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  composer: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#E4E7EC" },
  input: { flex: 1, height: 46, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 12, paddingHorizontal: 12, color: "#344054", fontFamily: "Inter_400Regular", fontSize: 13 },
  sendButton: { height: 46, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { backgroundColor: "#A9C2DF" },
  sendText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
