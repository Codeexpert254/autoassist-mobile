import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText as Text } from "@/components/autoassist-font";

import { PartsTripGuide } from "@/components/parts-trip-guide";
import { validPartsCoordinate } from "@/components/parts-location-picker";
import { Action, Notice, PartsPage, Status, BLUE, NAVY } from "@/components/parts-ui";
import { useAuth } from "@/context/auth-context";
import {
  approveTowQuote,cancelTow,confirmTowComplete,dispatchTow,myTowRequests,
  myTowReview,rateTow,towDetails,towMoney,vehicleNames,type TowRequest,
} from "@/services/towing-jobs";

const stageLabels:Record<string,string>={
  searching:"Finding a tow truck",quote_pending:"Review your quote",
  assigned:"Tow truck heading to you",arrived:"Tow truck has arrived",
  secured:"Your vehicle is secured",en_route:"Towing in progress",
  completed_by_agent:"Confirm tow completion",completed:"Tow completed",
  cancelled:"Request cancelled",
};
export default function MotoristTowTracking(){
  const params=useLocalSearchParams<{requestId?:string}>(),router=useRouter();
  const id=Array.isArray(params.requestId)?params.requestId[0]:params.requestId;
  const {user,profile}=useAuth();
  const [request,setRequest]=useState<TowRequest|null>(null);
  const [reviewed,setReviewed]=useState(false);
  const [stars,setStars]=useState(0),[comment,setComment]=useState("");
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState(""),[info,setInfo]=useState("");
  const load=useCallback(async()=>{
    if(!user){setLoading(false);return;}
    try{
      const item=id?await towDetails(id):(await myTowRequests(user.id))[0]??null;
      if(item&&item.motorist_id!==user.id)throw Error("This towing request is not yours.");
      setRequest(item);
      if(item?.status==="completed")setReviewed(Boolean(await myTowReview(item.id)));
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load towing request.");}
    finally{setLoading(false);}
  },[id,user?.id]);
  useFocusEffect(useCallback(()=>{
    void load();const t=setInterval(()=>void load(),7000);return()=>clearInterval(t);
  },[load]));
  const command=async(action:"retry"|"approve"|"reject"|"confirm"|"cancel"|"rate")=>{
    if(!request||busy)return;setBusy(true);setError("");setInfo("");
    try{
      if(action==="retry"){
        const result=await dispatchTow(request.id);
        setInfo(result.state==="offered"?"Pickup request offered to an available verified towing agent.":
          result.state==="no_available_agent"?"No verified towing agent is currently online. Try again when one becomes available.":
          "Matching request checked. "+result.state.replace(/_/g," "));
      }else if(action==="approve")await approveTowQuote(request.id,true);
      else if(action==="reject")await approveTowQuote(request.id,false);
      else if(action==="confirm")await confirmTowComplete(request.id);
      else if(action==="cancel")await cancelTow(request.id);
      else if(action==="rate"){
        if(!stars)throw Error("Select 1 to 5 stars before rating.");
        await rateTow(request.id,stars,comment);
        router.replace("/motorist/home");
        return;
      }
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to update towing request.");}
    finally{setBusy(false);}
  };
  const confirmCancel=()=>Alert.alert("Cancel towing request?",
    "You can cancel while searching or waiting for quote approval. Once approved, contact support to arrange cancellation.",
    [{text:"Keep request",style:"cancel"},
     {text:"Cancel request",style:"destructive",onPress:()=>void command("cancel")}]);
  const live=request&&["assigned","arrived","secured","en_route","completed_by_agent"].includes(request.status);
  const target=validPartsCoordinate(
    request?.status==="en_route"?request.destination_latitude:request?.pickup_latitude,
    request?.status==="en_route"?request.destination_longitude:request?.pickup_longitude);
  const agentPoint=validPartsCoordinate(request?.agent_latitude,request?.agent_longitude);
  return <PartsPage title="Towing status" subtitle="Track your roadside assistance"
    back="/motorist/home" loading={loading} refresh={()=>void load()}>
    {profile?.role!=="motorist"?<Notice tone="error">Motorist account required.</Notice>:
    !request?<>
      <Notice>You have no towing requests to track.</Notice>
      <Action label="Request a tow truck" onPress={()=>router.replace("/motorist/request-towing")}/>
    </>:<>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><SymbolView name={{ios:"car.side",android:"local_shipping",web:"local_shipping"} as never}
          tintColor="#FFFFFF" size={26}/></View>
        <Text style={styles.heroEyebrow}>TOWING REQUEST #{request.id.slice(0,8).toUpperCase()}</Text>
        <Text style={styles.heroTitle}>{stageLabels[request.status]??request.status}</Text>
        <Text style={styles.heroText}>{vehicleNames[request.vehicle_class]} · {request.vehicle_registration}</Text>
        <View style={styles.statusPill}><Status label={request.status} good={request.status==="completed"}/></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>PICKUP</Text>
        <Text style={styles.address}>{request.pickup_text}</Text>
        <Text style={[styles.label,{marginTop:18}]}>DESTINATION</Text>
        <Text style={styles.address}>{request.destination_text}</Text>
      </View>
      {request.status==="searching"?<>
        <Notice>AutoAssist checks verified towing agents who are online. Availability can vary; no operator has accepted yet.</Notice>
        <Action label="Retry agent matching" busy={busy} onPress={()=>void command("retry")}/>
        <Action label="Cancel towing request" variant="outline" disabled={busy} onPress={confirmCancel}/>
      </>:null}
      {request.status==="quote_pending"?<View style={styles.quoteCard}>
        <Text style={styles.label}>FINAL TOWING QUOTE</Text>
        <Text style={styles.price}>{towMoney(request.quote_kes)}</Text>
        <Text style={styles.info}>The agent proposed this total for the towing service. Review before approving. No payment is being charged yet.</Text>
        <Action label="Approve price and dispatch tow truck" busy={busy}
          onPress={()=>void command("approve")}/>
        <Action label="Decline this quote" variant="outline" disabled={busy}
          onPress={()=>void command("reject")}/>
      </View>:null}
      {live?<View style={styles.card}>
        <Text style={styles.label}>AGREED TOWING PRICE</Text>
        <Text style={styles.price}>{towMoney(request.quote_kes)}</Text>
        <Notice>This is the agreed price, not proof of payment. Online M-PESA collection and settlement are not yet enabled.</Notice>
      </View>:null}
      {live?<PartsTripGuide mode="tow_motorist"
        destination={target}
        destinationLabel={request.status==="en_route"?request.destination_text:request.pickup_text}
        ownPosition={agentPoint}/>:null}
      {live&&request.agent_position_updated_at&&
        Date.now()-new Date(request.agent_position_updated_at).getTime()>40000?
        <Notice>Last GPS update is over 40 seconds old; the truck location may be outdated.</Notice>:null}
      {request.status==="completed_by_agent"?<>
        <Notice>The towing operator reported the vehicle delivered. Confirm only after your vehicle has reached the agreed destination.</Notice>
        <Action label="Confirm vehicle received" busy={busy} onPress={()=>void command("confirm")}/>
      </>:null}
      {request.status==="completed"?<View style={styles.card}>
        <Text style={styles.heading}>How was your recovery?</Text>
        {reviewed?<Notice tone="success">Your feedback was recorded. Thank you.</Notice>:<>
          <Text style={styles.info}>Rate the towing partner to help improve AutoAssist.</Text>
          <View style={styles.rating}>
            {[1,2,3,4,5].map(i=><Pressable key={i} onPress={()=>setStars(i)}
              accessibilityRole="button" accessibilityLabel={i+" stars"}>
              <Text style={{fontSize:32,color:i<=stars?"#F8AC20":"#CBD5E1"}}>★</Text>
            </Pressable>)}
          </View>
          <TextInput value={comment} onChangeText={setComment} multiline
            placeholder="Tell us about the service (optional)" placeholderTextColor="#94A3B8"
            style={styles.comment}/>
          <Action label="Submit rating and return home" busy={busy} disabled={!stars}
            onPress={()=>void command("rate")}/>
        </>}
        <Action label="Back to home" variant="outline" onPress={()=>router.replace("/motorist/home")}/>
      </View>:null}
      {request.status==="cancelled"?<Action label="Back to home" onPress={()=>router.replace("/motorist/home")}/>:null}
      {info?<Notice tone="success">{info}</Notice>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
const styles=StyleSheet.create({
 hero:{backgroundColor:NAVY,borderRadius:22,padding:20,marginTop:5},
 heroIcon:{height:45,width:45,backgroundColor:"#286FBB",borderRadius:14,
   justifyContent:"center",alignItems:"center"},
 heroEyebrow:{color:"#A9CAEF",fontSize:10,letterSpacing:1,fontFamily:"Inter_600SemiBold",marginTop:15},
 heroTitle:{color:"#FFFFFF",fontFamily:"Inter_600SemiBold",fontSize:22,marginTop:7},
 heroText:{color:"#C3D6E8",fontSize:12,marginTop:8},
 statusPill:{marginTop:12},
 card:{backgroundColor:"#FFFFFF",borderColor:"#E0E9F1",borderWidth:1,
   borderRadius:17,padding:18,marginTop:15},
 label:{fontSize:10,color:BLUE,letterSpacing:0.8,fontFamily:"Inter_600SemiBold"},
 address:{fontSize:14,color:NAVY,fontFamily:"Inter_600SemiBold",marginTop:7,lineHeight:21},
 quoteCard:{backgroundColor:"#EAF2FD",borderRadius:18,padding:19,marginTop:16},
 price:{fontSize:27,color:NAVY,fontFamily:"Inter_600SemiBold",marginTop:9},
 info:{fontSize:12,color:"#5D7185",lineHeight:19,marginTop:11},
 heading:{fontFamily:"Inter_600SemiBold",fontSize:19,color:NAVY},
 rating:{flexDirection:"row",gap:13,marginVertical:17},
 comment:{borderRadius:11,borderWidth:1,borderColor:"#D9E4F0",
   minHeight:80,padding:12,fontSize:13,color:NAVY,marginTop:10},
});
