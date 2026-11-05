import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/auth-context";
import { PartsLocationPicker, type PartsCoordinate } from "@/components/parts-location-picker";
import { Action, Field, Notice, PartsPage, BLUE, NAVY } from "@/components/parts-ui";
import {
  distanceLabels,myTowRequests,requestTow,towIndicativePrice,towMoney,vehicleNames,
  type VehicleCategory,type TowDistanceBand,
} from "@/services/towing-jobs";

const vehicleChoices:VehicleCategory[]=["saloon","suv","light_truck"];
const bandChoices:TowDistanceBand[]=["0_10","10_20","20_30","30_40","40_50","above_50"];
export default function RequestTowing(){
 const router=useRouter(),{user,profile,backendEnabled,loading:authLoading}=useAuth();
 const [pickup,setPickup]=useState<PartsCoordinate|null>(null),[pickupText,setPickupText]=useState("");
 const [destination,setDestination]=useState<PartsCoordinate|null>(null),[destinationText,setDestinationText]=useState("");
 const [vehicle,setVehicle]=useState<VehicleCategory>("saloon"),[band,setBand]=useState<TowDistanceBand>("0_10");
 const [plate,setPlate]=useState(""),[phone,setPhone]=useState(profile?.phone??"");
 const [description,setDescription]=useState(""),[working,setWorking]=useState(false),[error,setError]=useState("");
 const estimate=towIndicativePrice(vehicle,band);
 useEffect(()=>{
   if(!user||profile?.role!=="motorist")return;
   let active=true;
   void myTowRequests(user.id).then(requests=>{
     const existing=requests.find(r=>!["completed","cancelled"].includes(r.status));
     if(active&&existing)router.replace({
       pathname:"/motorist/tow-assigned",params:{requestId:existing.id},
     });
   }).catch(()=>undefined);
   return()=>{active=false;};
 },[user?.id,profile?.role]);
 const submit=async()=>{
   if(!user||profile?.role!=="motorist"||working)return;
   if(!pickup){setError("Choose the breakdown location using your current GPS or the map.");return;}
   if(destinationText.trim().length<5||phone.trim().length<9||plate.trim().length<3){
     setError("Add the towing destination, registration and contact phone.");return;
   }
   setWorking(true);setError("");
   try{
     const id=await requestTow({
       pickup,pickupText:pickupText.trim(),destination,destinationText:destinationText.trim(),
       vehicle,plate:plate.trim(),band,description:description.trim(),phone:phone.trim(),
     });
     router.replace({pathname:"/motorist/tow-assigned",params:{requestId:id}});
   }catch(cause){setError(cause instanceof Error?cause.message:"Unable to request towing.");}
   finally{setWorking(false);}
 };
 return <PartsPage title="Request towing" subtitle="Verified recovery when you need it"
   back="/motorist/home">
   {!backendEnabled?<Notice tone="error">Towing requests require a live AutoAssist account. This build is in Developer Preview mode because the Supabase environment variables are missing. Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, restart Expo, then log in as a Motorist.</Notice>:
    authLoading?<Notice>Checking your AutoAssist account…</Notice>:
    !user?<Notice tone="error">Your live session is not active. Please log out and sign in with your Motorist account.</Notice>:
    profile?.role!=="motorist"?<Notice tone="error">This account is not registered as a Motorist. Sign in with a Motorist account to request towing.</Notice>:<>
     <View style={styles.hero}>
       <View style={styles.roundIcon}>
         <SymbolView name={{ios:"car.side.rear.open",android:"local_shipping",web:"local_shipping"} as never}
           tintColor="#FFFFFF" size={27}/>
       </View>
       <Text style={styles.heroTitle}>Help is on the way.</Text>
       <Text style={styles.heroText}>Pin your breakdown location, choose a destination and we'll look for an approved towing partner.</Text>
       <View style={styles.safetyPill}><Text style={styles.safetyText}>Verified recovery partners only</Text></View>
     </View>
     <Text style={styles.heading}>1. Where is your vehicle?</Text>
     <PartsLocationPicker title="Breakdown pickup location" value={pickup}
       help="Use your exact GPS position or tap the breakdown point on the map."
       onPick={(point,label)=>{setPickup(point);setPickupText(label);}}/>
     <Field label="Pickup landmark" value={pickupText} onChangeText={setPickupText}
       placeholder="Road, estate or nearby landmark"/>
     <Text style={styles.heading}>2. Where should we tow it?</Text>
     <PartsLocationPicker title="Drop-off destination (optional pin)" value={destination}
       help="Set a precise garage or parking destination, or type the address below."
       onPick={(point,label)=>{setDestination(point);setDestinationText(label);}}/>
     <Field label="Destination garage or address" value={destinationText}
       onChangeText={(v)=>{setDestinationText(v);setDestination(null);}}
       placeholder="Garage, street, town"/>
     <Text style={styles.heading}>3. Vehicle details</Text>
     <Text style={styles.fieldLabel}>Vehicle category</Text>
     <View style={styles.choices}>
       {vehicleChoices.map(v=><Pressable key={v} accessibilityRole="button"
         onPress={()=>setVehicle(v)} style={[styles.choice,v===vehicle&&styles.choiceActive]}>
         <Text style={[styles.choiceText,v===vehicle&&styles.choiceTextActive]}>
           {vehicleNames[v]}
         </Text>
       </Pressable>)}
     </View>
     <Field label="Vehicle registration" value={plate} onChangeText={setPlate} placeholder="KXX 123X"/>
     <Text style={styles.fieldLabel}>Approximate towing distance</Text>
     <View style={styles.choices}>
       {bandChoices.map(v=><Pressable key={v} accessibilityRole="button"
         onPress={()=>setBand(v)} style={[styles.choice,v===band&&styles.choiceActive]}>
         <Text style={[styles.choiceText,v===band&&styles.choiceTextActive]}>
           {distanceLabels[v]}
         </Text>
       </Pressable>)}
     </View>
     <Field label="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone}/>
     <Field label="Breakdown details (optional)" multiline value={description} onChangeText={setDescription}
       placeholder="What happened? Is the vehicle safe to load?"/>
     <View style={styles.pricing}>
       <Text style={styles.pricingEyebrow}>INDICATIVE NAIROBI TOWING RANGE</Text>
       <Text style={styles.price}>
         {estimate? `${towMoney(estimate[0])} – ${towMoney(estimate[1]).replace("KES ","")}`:"Quote required"}
       </Text>
       <Text style={styles.pricingDescription}>Rates depend on distance, vehicle weight, recovery conditions and location. The agent submits a final quote for your approval before travel. No payment is taken now.</Text>
     </View>
     {error?<Notice tone="error">{error}</Notice>:null}
     <Action label="Find an available towing agent" busy={working} disabled={!pickup}
       onPress={()=>void submit()}/>
     <Text style={styles.footer}>For accidents, injury or immediate danger, contact emergency services first. Do not stay in a hazardous road position to complete this form.</Text>
   </>}
 </PartsPage>;
}
const styles=StyleSheet.create({
 hero:{backgroundColor:NAVY,borderRadius:22,padding:21,marginBottom:8},
 roundIcon:{height:47,width:47,borderRadius:15,backgroundColor:"#296AB2",
   justifyContent:"center",alignItems:"center"},
 heroTitle:{fontFamily:"Inter_600SemiBold",color:"#FFFFFF",fontSize:23,marginTop:15},
 heroText:{fontFamily:"Inter_400Regular",color:"#D1E1F3",fontSize:12,lineHeight:20,marginTop:9},
 safetyPill:{marginTop:15,backgroundColor:"#174F55",borderRadius:12,padding:11,alignSelf:"flex-start"},
 safetyText:{fontFamily:"Inter_600SemiBold",color:"#B8F5D8",fontSize:11},
 heading:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:17,marginTop:26,marginBottom:7},
 fieldLabel:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:12,marginTop:16,marginBottom:7},
 choices:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:6},
 choice:{paddingHorizontal:13,paddingVertical:11,borderRadius:11,borderWidth:1,
   borderColor:"#DBE5F0",backgroundColor:"#FFFFFF"},
 choiceActive:{backgroundColor:BLUE,borderColor:BLUE},
 choiceText:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:11},
 choiceTextActive:{color:"#FFFFFF"},
 pricing:{backgroundColor:"#EAF3FF",borderRadius:18,padding:19,marginTop:24},
 pricingEyebrow:{color:BLUE,fontSize:10,fontFamily:"Inter_600SemiBold",letterSpacing:0.9},
 price:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:24,marginTop:9},
 pricingDescription:{fontFamily:"Inter_400Regular",color:"#5B7088",fontSize:11,lineHeight:19,marginTop:9},
 footer:{color:"#74849B",fontSize:11,lineHeight:18,marginVertical:20},
});
