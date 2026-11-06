import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";
import { AppText as Text } from "@/components/autoassist-font";
import { useAuth } from "@/context/auth-context";

/** A consistent, accessible sign-out action for role-specific dashboards. */
export function DashboardLogoutButton({role,onBeforeLogout}:{
  role?:"motorist"|"mechanic"|"partsdealer"|"towing"|"rider";
  onBeforeLogout?:()=>Promise<void>|void;
}) {
  const {signOut}=useAuth(),router=useRouter();
  const [busy,setBusy]=useState(false);
  const perform=async()=>{
    if(busy)return;
    setBusy(true);
    try{
      if(onBeforeLogout)await onBeforeLogout();
      // signOut revokes this app installation's push token and clears the session.
      await signOut();
      router.replace(role?{pathname:"/login",params:{role}}:"/login");
    }catch(error){
      Alert.alert("Unable to log out",error instanceof Error?error.message:"Please try again.");
    }finally{setBusy(false);}
  };
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel="Log out of AutoAssist"
    accessibilityHint="Signs out of this app without signing out of the other test apps"
    disabled={busy}
    onPress={()=>Alert.alert("Log out of AutoAssist?",
      "You can sign back in whenever you need to.",
      [{text:"Stay signed in",style:"cancel"},
       {text:"Log out",style:"destructive",onPress:()=>void perform()}])}
    style={({pressed})=>[styles.button,(pressed||busy)&&styles.pressed]}>
    {busy?<ActivityIndicator color="#B42318" size="small"/>:
      <SymbolView name={{ios:"rectangle.portrait.and.arrow.right",android:"logout",web:"logout"} as never}
        size={17} tintColor="#B42318"/>}
    <Text style={styles.label}>{busy?"Signing out":"Log out"}</Text>
  </Pressable>;
}
const styles=StyleSheet.create({
  button:{flexDirection:"row",gap:6,alignItems:"center",justifyContent:"center",
    minHeight:42,paddingHorizontal:11,borderRadius:12,backgroundColor:"#FFF5F4",
    borderColor:"#F2CBC8",borderWidth:1},
  label:{fontFamily:"Inter_600SemiBold",color:"#B42318",fontSize:12},
  pressed:{opacity:0.7},
});
