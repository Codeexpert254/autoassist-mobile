import * as Location from "expo-location";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useRef, useState } from "react";
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/auth-context";
import { PartsTripGuide } from "@/components/parts-trip-guide";
import { validPartsCoordinate,type PartsCoordinate } from "@/components/parts-location-picker";
import { Action, Notice, PartsPage, BLUE, NAVY, Status } from "@/components/parts-ui";
import { publishTowGPS,towDetails,towMoney,updateTowStatus,type TowRequest,type TowStatus }
  from "@/services/towing-jobs";

const contact=(kind:"call"|"sms",raw:string)=>{
  const phone=raw.replace(/[^0-9+]/g,"");
  if(phone.length<8)return;
  void Linking.openURL((kind==="call"?"tel:":"sms:")+phone).catch(()=>undefined);
};
const steps:Record<string,string>={
 quote_pending:"Waiting for price approval",assigned:"Navigate to the Motorist",
 arrived:"Secure the vehicle safely",secured:"Ready to begin the tow",
 en_route:"Tow to the destination",completed_by_agent:"Awaiting customer confirmation",
 completed:"Towing completed",
};
export default function ActiveTowingJob(){
  const router=useRouter(),params=useLocalSearchParams<{requestId?:string}>();
  const id=Array.isArray(params.requestId)?params.requestId[0]:params.requestId;
  const {user,profile}=useAuth();
  const [request,setRequest]=useState<TowRequest|null>(null);
  const [position,setPosition]=useState<PartsCoordinate|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[gpsError,setGpsError]=useState("");
  const sending=useRef(0),initialized=useRef(false);
  const load=useCallback(async()=>{
    if(!id||!user){setLoading(false);return;}
    try{
      const data=await towDetails(id);
      if(data.agent_id!==user.id)throw Error("This towing job is not assigned to you.");
      if(data.status==="completed"&&initialized.current){router.replace("/towing/dashboard");return;}
      initialized.current=true;setRequest(data);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load towing trip.");}
    finally{setLoading(false);}
  },[id,user?.id]);
  useFocusEffect(useCallback(()=>{
    void load();const timer=setInterval(()=>void load(),8000);
    return()=>clearInterval(timer);
  },[load]));
  const gpsAllowed=Boolean(request&&["assigned","arrived","secured","en_route"].includes(request.status));
  useFocusEffect(useCallback(()=>{
    if(!id||profile?.role!=="towing"||!request||request.status==="completed")return;
    let disposed=false,watcher:Location.LocationSubscription|null=null;
    const onFix=(fix:Location.LocationObject)=>{
      if(disposed||AppState.currentState!=="active")return;
      const coords=validPartsCoordinate(fix.coords.latitude,fix.coords.longitude);
      if(!coords)return;
      setPosition(coords);
      if(!gpsAllowed||Date.now()-sending.current<7000)return;
      sending.current=Date.now();
      void publishTowGPS(id,coords.latitude,coords.longitude).catch(e=>{
        if(!disposed)setGpsError(e instanceof Error?e.message:"Unable to share towing GPS.");
      });
    };
    void (async()=>{
      try{
        const permission=await Location.requestForegroundPermissionsAsync();
        if(!permission.granted)throw Error("Enable location permission for the towing map.");
        const first=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
        onFix(first);
        if(!disposed)watcher=await Location.watchPositionAsync({
          accuracy:Location.Accuracy.High,timeInterval:6000,distanceInterval:12,
        },onFix,e=>{if(!disposed)setGpsError(e);});
        if(disposed)watcher?.remove();
      }catch(e){if(!disposed)setGpsError(e instanceof Error?e.message:"GPS unavailable.");}
    })();
    return()=>{disposed=true;watcher?.remove();};
  },[id,profile?.role,gpsAllowed,Boolean(request)]));
  const stage=async(next:TowStatus)=>{
    if(!id||busy)return;setBusy(true);setError("");
    try{
      await updateTowStatus(id,next);
      // Return agent home after delivery; customer still confirms receipt.
      if(next==="completed_by_agent"||next==="completed"){
        router.replace("/towing/dashboard");
        return;
      }
      await load();
    }
    catch(e){setError(e instanceof Error?e.message:"Unable to update towing status.");}
    finally{setBusy(false);}
  };
  const confirm=(title:string,message:string,next:TowStatus)=>Alert.alert(title,message,[
    {text:"Not yet",style:"cancel"},
    {text:"Confirm",onPress:()=>void stage(next)},
  ]);
  const secondLeg=request?.status==="secured"||request?.status==="en_route"||
    request?.status==="completed_by_agent";
  const destination=request?validPartsCoordinate(
    secondLeg?request.destination_latitude:request.pickup_latitude,
    secondLeg?request.destination_longitude:request.pickup_longitude):null;
  const destinationText=request?
    (secondLeg?request.destination_text:request.pickup_text):"";
  return <PartsPage title="Active recovery" subtitle="Navigation and towing checklist"
    back="/towing/dashboard" loading={loading} refresh={()=>void load()}>
    {profile?.role!=="towing"?<Notice tone="error">Towing Agent account required.</Notice>:
      !request?<Notice tone="error">{error||"No assigned towing job found."}</Notice>:<>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Text style={styles.eyebrow}>RECOVERY #{request.id.slice(0,8).toUpperCase()}</Text>
          <Status label={request.status} good={request.status==="completed"}/>
        </View>
        <Text style={styles.heroTitle}>{steps[request.status]??"Your recovery job"}</Text>
        <Text style={styles.heroSubtitle}>{request.vehicle_registration} · {request.vehicle_class.replace("_"," ")}</Text>
        <Text style={styles.heroPrice}>{towMoney(request.quote_kes)}</Text>
      </View>
      {request.status==="quote_pending"?<Notice>
        Your quote was sent. Wait until the Motorist approves it before driving to the breakdown location. You may review the map and contact details meanwhile.
      </Notice>:null}
      {request.status==="assigned"?<Notice tone="success">
        The Motorist approved your quote. Navigate to their breakdown location, then mark arrival.
      </Notice>:null}
      {request.status==="arrived"?<Notice>
        Confirm that the vehicle is correctly secured before starting the towing journey.
      </Notice>:null}
      {request.status==="en_route"?<Notice tone="success">
        Towing in progress. Drive safely to the agreed destination. GPS updates while AutoAssist is open.
      </Notice>:null}
      <View style={styles.destination}>
        <Text style={styles.label}>{secondLeg?"DROP-OFF DESTINATION":"BREAKDOWN PICKUP"}</Text>
        <Text style={styles.destinationTitle}>{destinationText}</Text>
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" onPress={()=>contact("call",request.motorist_phone)}
            style={styles.contact}>
            <SymbolView name={{ios:"phone.fill",android:"call",web:"call"} as never}
              size={18} tintColor={BLUE}/>
            <Text style={styles.contactText}>Call Motorist</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={()=>contact("sms",request.motorist_phone)}
            style={styles.contact}>
            <SymbolView name={{ios:"message.fill",android:"sms",web:"sms"} as never}
              size={18} tintColor={BLUE}/>
            <Text style={styles.contactText}>SMS Motorist</Text>
          </Pressable>
        </View>
      </View>
      {["quote_pending","assigned","arrived","secured","en_route"].includes(request.status)?
        <PartsTripGuide mode="towing" destination={destination}
          destinationLabel={destinationText} ownPosition={position}/>:null}
      {gpsError?<Notice>{gpsError}</Notice>:null}
      {request.status==="assigned"?
        <Action label="I've arrived at the Motorist" busy={busy}
          onPress={()=>void stage("arrived")}/>:null}
      {request.status==="arrived"?
        <Action label="Vehicle secured on tow truck" busy={busy}
          onPress={()=>confirm("Confirm vehicle secured",
            "Confirm the vehicle is correctly attached and safe to move.","secured")}/>:null}
      {request.status==="secured"?
        <Action label="Start towing toward destination" busy={busy}
          onPress={()=>void stage("en_route")}/>:null}
      {request.status==="en_route"?
        <Action label="Vehicle delivered to destination" busy={busy}
          onPress={()=>confirm("Complete towing?",
            "Only finish when the vehicle has been safely handed over at the agreed destination.",
            "completed_by_agent")}/>:null}
      {request.status==="completed_by_agent"?<>
        <Notice>You've marked the towing job finished. The Motorist must confirm receipt in their app before the service closes.</Notice>
        <Action label="Return to towing dashboard" onPress={()=>router.replace("/towing/dashboard")}/>
      </>:null}
      {request.status==="completed"?
        <Action label="Back to towing dashboard" onPress={()=>router.replace("/towing/dashboard")}/>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
const styles=StyleSheet.create({
 hero:{backgroundColor:NAVY,borderRadius:21,padding:19},
 heroRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:10},
 eyebrow:{color:"#BCD8F1",fontFamily:"Inter_600SemiBold",fontSize:10,letterSpacing:0.8},
 heroTitle:{color:"#FFFFFF",fontFamily:"Inter_600SemiBold",fontSize:22,marginTop:17},
 heroSubtitle:{color:"#BDD1E6",fontSize:12,marginTop:8},
 heroPrice:{color:"#FFFFFF",fontFamily:"Inter_600SemiBold",fontSize:22,marginTop:15},
 destination:{backgroundColor:"#FFFFFF",borderRadius:17,padding:18,borderWidth:1,
   borderColor:"#E0E7F0",marginTop:15},
 label:{color:BLUE,fontFamily:"Inter_600SemiBold",fontSize:11,letterSpacing:0.9},
 destinationTitle:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:16,lineHeight:23,marginTop:10},
 controls:{flexDirection:"row",gap:10,marginTop:19},
 contact:{backgroundColor:"#EDF4FF",flex:1,flexDirection:"row",gap:8,borderRadius:11,
   alignItems:"center",justifyContent:"center",minHeight:46},
 contactText:{fontFamily:"Inter_600SemiBold",fontSize:11,color:BLUE},
});
