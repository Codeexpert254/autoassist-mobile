import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ComponentRef, ReactNode, RefObject } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { AppText as Text } from "@/components/autoassist-font";
import { SafeAreaView } from "react-native-safe-area-context";

import { SettingsButton } from "@/components/settings-button";

export const BLUE="#1857A6",NAVY="#102A43",MUTED="#667085",BORDER="#E4E7EC";

export function PartsPage({title,subtitle,children,back,settings=false,refresh,loading=false,scrollRef}:{
  title:string;subtitle?:string;children:ReactNode;back?:string;settings?:boolean;refresh?:()=>void;loading?:boolean;scrollRef?:RefObject<ComponentRef<typeof ScrollView>|null>;
}) {
  const router=useRouter();
  return <View style={styles.screen}><SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      {back?<Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}
        onPress={()=>router.replace(back as never)}>
        <SymbolView name={{ios:"chevron.left",android:"arrow_back",web:"arrow_back"} as never} tintColor={NAVY} size={23}/>
      </Pressable>:null}
      <View style={{flex:1}}>
        <Text style={styles.title}>{title}</Text>
        {subtitle?<Text style={styles.subtitle}>{subtitle}</Text>:null}
      </View>
      {refresh?<Pressable accessibilityRole="button" accessibilityLabel="Refresh" onPress={refresh} style={styles.iconBtn}>
        <SymbolView name={{ios:"arrow.clockwise",android:"refresh",web:"refresh"} as never} tintColor={BLUE} size={21}/>
      </Pressable>:null}
      {settings?<SettingsButton/>:null}
    </View>
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {loading?<ActivityIndicator color={BLUE} style={{marginVertical:24}}/>:children}
    </ScrollView>
  </SafeAreaView></View>;
}
export function Action({label,onPress,icon,variant="primary",disabled=false,busy=false}:{
  label:string;onPress:()=>void;icon?:{ios:string;android:string;web:string};
  variant?:"primary"|"outline"|"danger";disabled?:boolean;busy?:boolean;
}) {
  const foreground=variant==="primary"?"#FFFFFF":variant==="danger"?"#B42318":BLUE;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled||busy}
    onPress={onPress} style={[styles.action,variant==="outline"&&styles.outline,variant==="danger"&&styles.danger,(disabled||busy)&&styles.disabled]}>
    {busy?<ActivityIndicator color={foreground}/>:<>
      {icon?<SymbolView name={icon as never} size={18} tintColor={foreground}/>:null}
      <Text style={[styles.actionText,variant!=="primary"&&{color:foreground}]}>{label}</Text>
    </>}
  </Pressable>;
}
export function Field({label,multiline=false,...props}:TextInputProps&{label:string}){
  return <View style={{gap:6,marginTop:14}}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput {...props} multiline={multiline} placeholderTextColor="#98A2B3"
      style={[styles.input,multiline&&{minHeight:88,textAlignVertical:"top"}]}/>
  </View>;
}
export function Notice({children,tone="info"}:{children:ReactNode;tone?:"info"|"error"|"success"}){
  return <View style={[styles.notice,tone==="error"&&styles.noticeError,tone==="success"&&styles.noticeSuccess]}>
    <Text style={[styles.noticeText,tone==="error"&&{color:"#B42318"},tone==="success"&&{color:"#14764A"}]}>
      {children}
    </Text>
  </View>;
}
export function Section({title,children}:{title:string;children:ReactNode}){
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}
export function Status({label,good=false}:{label:string;good?:boolean}){
  return <View style={[styles.status,good&&styles.statusGood]}>
    <Text style={[styles.statusText,good&&{color:"#137345"}]}>{label.replace(/_/g," ")}</Text>
  </View>;
}
export const partStyles=StyleSheet.create({
  row:{flexDirection:"row",alignItems:"center",gap:10},
  card:{borderWidth:1,borderColor:BORDER,borderRadius:15,padding:15,backgroundColor:"#FFFFFF",marginTop:12},
  cardTitle:{color:NAVY,fontSize:15,fontFamily:"Inter_600SemiBold"},
  cardText:{color:MUTED,fontSize:11,lineHeight:18,fontFamily:"Inter_400Regular",marginTop:5},
  metric:{color:BLUE,fontSize:22,fontFamily:"Inter_600SemiBold"},
});
const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:"#F8FAFC"},safe:{flex:1},
  header:{flexDirection:"row",gap:9,paddingHorizontal:17,paddingVertical:12,alignItems:"center",
    borderBottomWidth:1,borderBottomColor:BORDER,backgroundColor:"#FFFFFF"},
  back:{height:40,width:36,alignItems:"center",justifyContent:"center"},
  iconBtn:{height:40,width:40,alignItems:"center",justifyContent:"center"},
  title:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:19},
  subtitle:{color:MUTED,fontFamily:"Inter_400Regular",fontSize:11,lineHeight:16,marginTop:3},
  content:{paddingHorizontal:18,paddingVertical:17,paddingBottom:40},
  action:{backgroundColor:BLUE,borderRadius:11,minHeight:46,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:9,paddingHorizontal:12,marginTop:12},
  outline:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:BLUE},
  danger:{backgroundColor:"#FFF1F2",borderWidth:1,borderColor:"#FED4D7"},
  actionText:{color:"#FFFFFF",fontFamily:"Inter_600SemiBold",fontSize:12,textAlign:"center"},
  disabled:{opacity:0.5},
  fieldLabel:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:12},
  input:{borderWidth:1,borderColor:"#D0D5DD",backgroundColor:"#FFFFFF",borderRadius:10,
    paddingHorizontal:13,paddingVertical:11,color:NAVY,fontSize:13,minHeight:45},
  notice:{backgroundColor:"#EDF4FD",borderRadius:12,padding:13,marginTop:13},
  noticeError:{backgroundColor:"#FFF1F2"},noticeSuccess:{backgroundColor:"#EDFBF3"},
  noticeText:{fontFamily:"Inter_400Regular",fontSize:11,color:BLUE,lineHeight:18},
  section:{marginTop:19},sectionTitle:{fontSize:15,fontFamily:"Inter_600SemiBold",color:NAVY,marginBottom:6},
  status:{alignSelf:"flex-start",backgroundColor:"#FFF4E5",paddingHorizontal:10,paddingVertical:6,borderRadius:20},
  statusGood:{backgroundColor:"#E9F9F1"},
  statusText:{fontFamily:"Inter_600SemiBold",fontSize:10,color:"#9B6508",textTransform:"capitalize"},
});
