import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { PartsTripGuide } from "@/components/parts-trip-guide";
import { validPartsCoordinate } from "@/components/parts-location-picker";
import { Action, Notice, PartsPage, Section, Status, partStyles, BLUE, NAVY } from "@/components/parts-ui";
import { type PartOrder, money, oneOrder } from "@/services/parts-data";
import { existingPartRatings, motoristReceivedPart, ratePartsOrder } from "@/services/parts-orders";

const help:Record<string,string>={
  pending_dealer:"Your request was sent to the dealer. They will check the stock and accept or decline.",
  accepted:"The dealer confirmed stock and is preparing your part.",
  declined:"The dealer declined this order. Look for another available listing.",
  ready_for_pickup:"Your part is packed. AutoAssist is waiting for an available verified rider.",
  rider_assigned:"A rider accepted the pickup and is heading to the Parts Dealer.",
  picked_up:"Your rider has collected your part. You can confirm receipt once it has been delivered.",
  delivered:"You confirmed delivery. Rate the dealer and rider separately to improve future matches.",
};
function StarRating({label,done,onSubmit}:{label:"dealer"|"rider";done:boolean;onSubmit:(stars:number,comment:string)=>Promise<void>}){
  const [stars,setStars]=useState(0),[comment,setComment]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const submit=async()=>{
    if(!stars||busy)return;
    setBusy(true);setError("");
    try{await onSubmit(stars,comment);}
    catch(e){setError(e instanceof Error?e.message:"Unable to save rating.");}
    finally{setBusy(false);}
  };
  return <View style={partStyles.card}>
    <Text style={partStyles.cardTitle}>Rate the {label}</Text>
    {done?<Notice tone="success">Thank you for rating this {label}.</Notice>:<>
      <View style={[partStyles.row,{justifyContent:"space-between",marginTop:14}]}>
        {[1,2,3,4,5].map(n=><Pressable accessibilityRole="button" accessibilityLabel={n+" stars"}
          key={n} onPress={()=>setStars(n)}>
          <Text style={{fontSize:31,color:n<=stars?"#F4A100":"#CBD5E1"}}>★</Text>
        </Pressable>)}
      </View>
      <TextInput value={comment} onChangeText={setComment} multiline placeholder="What went well? (optional)"
        placeholderTextColor="#98A2B3" style={{minHeight:68,borderWidth:1,borderColor:"#D0D5DD",
          borderRadius:10,padding:12,marginTop:12,color:NAVY}}/>
      <Action label={"Submit "+label+" rating"} disabled={!stars} busy={busy} onPress={()=>void submit()}/>
    </>}
    {error?<Notice tone="error">{error}</Notice>:null}
  </View>;
}
export default function MotoristPartsOrder(){
  const router=useRouter(),params=useLocalSearchParams<{orderId?:string}>();
  const id=Array.isArray(params.orderId)?params.orderId[0]:params.orderId;
  const {user}=useAuth();
  const [order,setOrder]=useState<PartOrder|null>(null),[ratings,setRatings]=useState<string[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const load=async()=>{
    if(!id||!user)return;
    try{
      const o=await oneOrder(id);
      if(o.motorist_id!==user.id)throw new Error("This is not your order.");
      setOrder(o);
      const {data}=await (await import("@/lib/supabase")).requireSupabase()
        .from("parts_order_reviews" as never).select("subject_type").eq("order_id",id);
      setRatings((data??[]).map((v:any)=>v.subject_type));
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load order.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();const timer=setInterval(()=>void load(),9000);return()=>clearInterval(timer);},[id,user?.id]);
  const confirm=()=>Alert.alert("Confirm received delivery",
    "Only confirm once the part has physically arrived and the rider has handed it to you. This does not verify an M-PESA payment.",
    [{text:"Not yet",style:"cancel"},{text:"I received it",onPress:()=>{
      void(async()=>{if(!id)return;setBusy(true);try{await motoristReceivedPart(id);await load();}
      catch(e){setError(e instanceof Error?e.message:"Could not confirm delivery.");}
      finally{setBusy(false);}})();
    }}]);
  const rate=async(subject:"dealer"|"rider",stars:number,comment:string)=>{
    if(!id)return;await ratePartsOrder(id,subject,stars,comment);await load();
  };
  return <PartsPage title="Parts order" subtitle={"Order "+(id?.slice(0,8).toUpperCase()??"")}
    back="/motorist/parts-orders" loading={loading} refresh={()=>void load()}>
    {!order?<Notice tone="error">{error||"Order not found."}</Notice>:<>
      <View style={partStyles.card}>
        <View style={[partStyles.row,{justifyContent:"space-between"}]}>
          <Text style={[partStyles.cardTitle,{flex:1}]}>{order.parts_inventory?.title||"Spare part"}</Text>
          <Status label={order.status} good={order.status==="delivered"}/>
        </View>
        <Text style={partStyles.cardText}>{order.parts_shops?.shop_name}</Text>
        <Text style={[partStyles.cardText,{marginTop:10}]}>{order.quantity} unit(s)</Text>
        <Text style={{fontSize:22,color:BLUE,fontFamily:"Inter_600SemiBold",marginTop:7}}>
          {money(order.subtotal_kes)}
        </Text>
        <Text style={partStyles.cardText}>Delivery destination: {order.delivery_location}</Text>
      </View>
      <Notice>{order.status==="rider_assigned"&&order.arrived_at_dealer_at
        ?"Your rider has arrived at the Parts Dealer and is collecting the item."
        :help[order.status]||"Your order status is updating."}</Notice>
      {order.status==="picked_up"?<>
        {order.delivery_started_at?<Notice tone="success">
          Your rider has started the journey to you. The map refreshes while the Rider keeps the AutoAssist trip screen open.
        </Notice>:<Notice>
          Your rider confirmed pickup and is preparing to start the trip to your delivery address.
        </Notice>}
        {order.delivery_started_at?<>
          <PartsTripGuide mode="motorist"
            destination={validPartsCoordinate(order.delivery_latitude,order.delivery_longitude)}
            destinationLabel={order.delivery_location}
            ownPosition={validPartsCoordinate(order.rider_latitude,order.rider_longitude)}/>
          {order.rider_location_updated_at &&
            Date.now()-new Date(order.rider_location_updated_at).getTime()>35000
              ?<Notice>The Rider's last GPS update is older than 35 seconds. The position may be outdated.</Notice>:null}
        </>:null}
      </>:null}
      {order.status==="picked_up"?<Action label="I received my spare part" busy={busy}
        onPress={confirm}/>:null}
      {order.status==="delivered"?<>
        <Section title="How was the service?">
          <StarRating label="dealer" done={ratings.includes("dealer")}
            onSubmit={(s,c)=>rate("dealer",s,c)}/>
          {order.rider_id?<StarRating label="rider" done={ratings.includes("rider")}
            onSubmit={(s,c)=>rate("rider",s,c)}/>:null}
        </Section>
        <Notice>AutoAssist's platform commission is tracked separately. Paying for the part and delivery are pilot arrangements until in-app checkout is implemented.</Notice>
      </>:null}
      {order.status==="declined"?<Action label="Find another dealer" onPress={()=>router.push("/motorist/spare-parts")}/>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
