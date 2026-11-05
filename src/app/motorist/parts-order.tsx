import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/context/auth-context";
import { PartsTripGuide } from "@/components/parts-trip-guide";
import { validPartsCoordinate } from "@/components/parts-location-picker";
import { Action, Notice, PartsPage, Status, BLUE, NAVY } from "@/components/parts-ui";
import { type PartOrder,money,oneOrder } from "@/services/parts-data";
import { existingPartRatings,motoristReceivedPart,ratePartsOrder } from "@/services/parts-orders";

const stages:Record<string,string>={
  pending_dealer:"Waiting for dealer",accepted:"Part being prepared",
  declined:"Order declined",ready_for_pickup:"Matching a Rider",
  rider_assigned:"Rider is going to the dealer",picked_up:"Your part is on its way",
  delivered:"Delivery completed",
};
const statuses=["pending_dealer","accepted","ready_for_pickup","rider_assigned","picked_up","delivered"];
function Rating({subject,done,onRate}:{
  subject:"dealer"|"rider";done:boolean;onRate:(stars:number,comment:string)=>Promise<void>;
}){
  const [stars,setStars]=useState(0),[comment,setComment]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const submit=async()=>{
    if(!stars||busy)return;setBusy(true);setError("");
    try{await onRate(stars,comment);}
    catch(e){setError(e instanceof Error?e.message:"Could not save rating.");}
    finally{setBusy(false);}
  };
  return <View style={styles.ratingCard}>
    <Text style={styles.ratingTitle}>Rate the {subject==="dealer"?"Parts Dealer":"Delivery Rider"}</Text>
    {done?<Notice tone="success">Rating received. Thank you for sharing your feedback.</Notice>:<>
      <Text style={styles.body}>How would you rate your experience?</Text>
      <View style={styles.starRow}>
        {[1,2,3,4,5].map(n=><Pressable key={n} onPress={()=>setStars(n)}
          accessibilityRole="button" accessibilityLabel={n+" stars"}>
          <Text style={{fontSize:32,color:n<=stars?"#FFB01F":"#CFD8E4"}}>★</Text>
        </Pressable>)}
      </View>
      <TextInput value={comment} onChangeText={setComment} multiline
        placeholder="Write an optional review" placeholderTextColor="#93A2B2"
        style={styles.input}/>
      <Action label={`Save ${subject} rating`} disabled={!stars} busy={busy}
        onPress={()=>void submit()}/>
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </View>;
}
export default function MotoristPartsOrder(){
  const router=useRouter(),params=useLocalSearchParams<{orderId?:string}>();
  const id=Array.isArray(params.orderId)?params.orderId[0]:params.orderId;
  const {user}=useAuth();
  const [order,setOrder]=useState<PartOrder|null>(null);
  const [ratings,setRatings]=useState<string[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const load=async()=>{
    if(!id||!user){setLoading(false);return;}
    try{
      const current=await oneOrder(id);
      if(current.motorist_id!==user.id)throw Error("This order does not belong to your account.");
      setOrder(current);
      if(current.status==="delivered"){
        const reviews=await existingPartRatings(id);
        setRatings(reviews.map(x=>x.subject_type));
      }
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to read order.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();const timer=setInterval(()=>void load(),9000);return()=>clearInterval(timer);},[id,user?.id]);
  const received=()=>Alert.alert("Confirm delivery",
    "Only confirm when the rider physically hands you the part. This does not verify payment.",
    [{text:"Not yet",style:"cancel"},{text:"Part received",onPress:()=>void(async()=>{
      if(!id)return;setBusy(true);setError("");
      try{await motoristReceivedPart(id);await load();}
      catch(e){setError(e instanceof Error?e.message:"Unable to confirm delivery.");}
      finally{setBusy(false);}
    })()}]);
  const rate=async(subject:"dealer"|"rider",stars:number,comment:string)=>{
    if(!id||!order)return;
    await ratePartsOrder(id,subject,stars,comment);
    const latest=(await existingPartRatings(id)).map(x=>x.subject_type);
    setRatings(latest);
    const required=order.rider_id?["dealer","rider"]:["dealer"];
    if(required.every(x=>latest.includes(x)))router.replace("/motorist/home");
  };
  const activeIndex=order?statuses.indexOf(order.status):0;
  return <PartsPage title="Track parts delivery" subtitle="Your spare part, every step of the way"
    back="/motorist/parts-orders" loading={loading} refresh={()=>void load()}>
    {!order?<Notice tone="error">{error||"Order not found."}</Notice>:<>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.eyebrow}>ORDER #{order.id.slice(0,8).toUpperCase()}</Text>
          <Status label={order.status} good={order.status==="delivered"}/>
        </View>
        <Text style={styles.heroTitle}>{stages[order.status]??"Your parts order"}</Text>
        <Text style={styles.heroSubtitle}>{order.parts_inventory?.title||"Spare part"}</Text>
        <Text style={styles.heroPrice}>{money(order.subtotal_kes)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Your order</Text>
        <View style={styles.row}><Text style={styles.body}>Parts Dealer</Text>
          <Text style={styles.value}>{order.parts_shops?.shop_name||"Dealer"}</Text></View>
        <View style={styles.row}><Text style={styles.body}>Items</Text>
          <Text style={styles.value}>{order.quantity} unit(s)</Text></View>
        <View style={styles.divider}/>
        <Text style={styles.label}>DELIVERY DESTINATION</Text>
        <Text style={styles.address}>{order.delivery_location}</Text>
      </View>
      {order.status!=="declined"?<View style={styles.card}>
        <Text style={styles.heading}>Delivery progress</Text>
        {statuses.map((step,i)=><View style={styles.stage} key={step}>
          <View style={[styles.stageNumber,i<=activeIndex&&styles.stageDone]}>
            {i<=activeIndex?<SymbolView name={{ios:"checkmark",android:"check",web:"check"} as never}
              size={15} tintColor="#FFFFFF"/>:
              <Text style={{color:"#657993",fontSize:11}}>{i+1}</Text>}
          </View>
          <Text style={[styles.stageText,i<=activeIndex&&{color:NAVY,fontFamily:"Inter_600SemiBold"}]}>
            {["Order sent","Dealer accepted","Ready for collection","Rider assigned",
              "Part collected","Received by you"][i]}
          </Text>
          {i===activeIndex?<Text style={styles.now}>NOW</Text>:null}
        </View>)}
      </View>:<Notice tone="error">{order.decline_reason||"The dealer declined your order."}</Notice>}
      {order.status==="picked_up"?<>
        {order.delivery_started_at?<Notice tone="success">
          Your Rider started the customer trip. GPS updates while the Rider keeps the AutoAssist trip screen open.
        </Notice>:<Notice>Your Rider collected the part and is preparing to head to you.</Notice>}
        {order.delivery_started_at?<PartsTripGuide mode="motorist"
          destination={validPartsCoordinate(order.delivery_latitude,order.delivery_longitude)}
          destinationLabel={order.delivery_location}
          ownPosition={validPartsCoordinate(order.rider_latitude,order.rider_longitude)}/>:null}
        {order.rider_location_updated_at &&
          Date.now()-new Date(order.rider_location_updated_at).getTime()>35000?
            <Notice>Rider GPS is currently older than 35 seconds. Location may be outdated.</Notice>:null}
        <Action label="I received my spare part" busy={busy} onPress={received}/>
      </>:null}
      {order.status==="delivered"?<>
        <View style={styles.ratingIntro}>
          <Text style={styles.heading}>Delivery complete!</Text>
          <Text style={styles.body}>Thanks for using AutoAssist. Your reviews help maintain quality across our marketplace.</Text>
        </View>
        <Rating subject="dealer" done={ratings.includes("dealer")}
          onRate={(s,c)=>rate("dealer",s,c)}/>
        {order.rider_id?<Rating subject="rider" done={ratings.includes("rider")}
          onRate={(s,c)=>rate("rider",s,c)}/>:null}
        <Action label="Finish and return to home" variant="outline"
          onPress={()=>router.replace("/motorist/home")}/>
        <Notice>Pay-on-delivery pilot: delivery confirmation is not verification that money was collected.</Notice>
      </>:null}
      {order.status==="declined"?<Action label="Browse other parts"
        onPress={()=>router.replace("/motorist/spare-parts")}/>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
const styles=StyleSheet.create({
 hero:{backgroundColor:NAVY,borderRadius:22,padding:20},
 heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},
 eyebrow:{fontFamily:"Inter_600SemiBold",color:"#B5D2F1",fontSize:10,letterSpacing:1},
 heroTitle:{fontFamily:"Inter_600SemiBold",color:"#FFFFFF",fontSize:22,marginTop:18},
 heroSubtitle:{fontSize:13,color:"#C2D5EA",marginTop:9},
 heroPrice:{fontFamily:"Inter_600SemiBold",color:"#FFFFFF",fontSize:27,marginTop:16},
 card:{backgroundColor:"#FFFFFF",borderRadius:17,padding:18,
   borderWidth:1,borderColor:"#DFE9F4",marginTop:15},
 heading:{fontFamily:"Inter_600SemiBold",fontSize:17,color:NAVY},
 row:{flexDirection:"row",justifyContent:"space-between",gap:12,marginTop:15},
 body:{color:"#667A91",fontSize:12,lineHeight:20,flex:1,marginTop:3},
 value:{fontFamily:"Inter_600SemiBold",fontSize:12,color:NAVY,textAlign:"right",flex:1},
 divider:{borderTopWidth:1,borderColor:"#E3E9F1",marginVertical:15},
 label:{fontSize:10,letterSpacing:1,color:BLUE,fontFamily:"Inter_600SemiBold"},
 address:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:13,marginTop:9,lineHeight:21},
 stage:{flexDirection:"row",alignItems:"center",gap:12,marginTop:13},
 stageNumber:{width:28,height:28,borderRadius:14,backgroundColor:"#E1E9F3",
   alignItems:"center",justifyContent:"center"},
 stageDone:{backgroundColor:"#128A61"},
 stageText:{fontSize:12,color:"#8192A5",flex:1},
 now:{fontFamily:"Inter_600SemiBold",fontSize:10,color:BLUE},
 ratingIntro:{backgroundColor:"#E9F8F0",borderRadius:17,padding:17,marginTop:17},
 ratingCard:{backgroundColor:"#FFFFFF",borderRadius:17,padding:18,
   borderWidth:1,borderColor:"#DFE9F4",marginTop:14},
 ratingTitle:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:15},
 starRow:{flexDirection:"row",justifyContent:"space-between",marginVertical:17},
 input:{borderColor:"#D6E1ED",borderWidth:1,borderRadius:11,padding:13,
   minHeight:76,color:NAVY,fontSize:13,marginTop:10},
});
