import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Status, BLUE, NAVY } from "@/components/parts-ui";
import { type PartOrder, money, oneOrder } from "@/services/parts-data";
import { readyForRider, requestRiderDispatch, respondToPartOrder } from "@/services/parts-orders";

const stages=["pending_dealer","accepted","ready_for_pickup","rider_assigned","picked_up","delivered"];
const stagesLabels=["Received","Preparing","Ready","Rider found","In transit","Delivered"];
const statusTitle:Record<string,string>={
  pending_dealer:"New parts order",accepted:"Time to prepare the order",
  ready_for_pickup:"Ready for rider collection",rider_assigned:"Rider on the way",
  picked_up:"Out for delivery",delivered:"Delivery completed",declined:"Order declined",
};
function Glyph({ios,android,color=BLUE,size=20}:{
  ios:string;android:string;color?:string;size?:number;
}){return <SymbolView name={{ios,android,web:android} as never} tintColor={color} size={size}/>;}
function phoneLink(kind:"call"|"sms",value:string){
  const cleaned=value.replace(/[^0-9+]/g,"");
  if(cleaned.length<8)return;
  void Linking.openURL((kind==="call"?"tel:":"sms:")+cleaned).catch(()=>undefined);
}
export default function DealerOrderDetails(){
  const router=useRouter(),p=useLocalSearchParams<{orderId?:string}>();
  const id=Array.isArray(p.orderId)?p.orderId[0]:p.orderId;
  const {user}=useAuth();
  const [order,setOrder]=useState<PartOrder|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  const [noticeTone,setNoticeTone]=useState<"info"|"success">("info");
  const load=async()=>{
    if(!id)return;
    try{
      const data=await oneOrder(id);
      if(data.parts_shops?.owner_id!==user?.id)throw Error("This order does not belong to your shop.");
      setOrder(data);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load order.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();const timer=setInterval(()=>void load(),10000);return()=>clearInterval(timer);},[id,user?.id]);
  const act=async(action:"accept"|"decline"|"out_of_stock"|"ready"|"retry")=>{
    if(!order||busy)return;setBusy(true);setError("");setNotice("");
    try{
      let matching:{state:string}|null=null;
      if(action==="ready")matching=await readyForRider(order.id);
      else if(action==="retry")matching=await requestRiderDispatch(order.id);
      else await respondToPartOrder(order.id,action==="accept",action==="out_of_stock");
      await load();
      const state=matching?.state;
      setNoticeTone(action==="accept"||state==="offered"||state==="existing_offer"?"success":"info");
      setNotice(action==="accept"?
        "Stock reserved. Pack the item and mark it ready when the rider can collect.":
        action==="ready"||action==="retry"?
          state==="offered"?"A verified rider has received a two-minute pickup offer.":
          state==="existing_offer"?"A rider already has an active offer. Try again after expiry if needed.":
          state==="no_available_rider"?"No verified rider is free right now. Ask one to go online and retry.":
          state==="dispatch_unavailable"?"Item ready. Rider matching was unavailable; retry shortly.":
          "No rider assigned yet. Check availability and retry."
        :action==="out_of_stock"?"Inventory updated to out of stock.":"Order declined.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to update order.");}
    finally{setBusy(false);}
  };
  const decline=(out:boolean)=>Alert.alert(out?"Mark out of stock?":"Decline order?",
    out?"The stock quantity will be set to zero.":"The customer will see their order declined.",
    [{text:"Go back",style:"cancel"},{text:"Confirm",style:"destructive",
      onPress:()=>void act(out?"out_of_stock":"decline")}]);
  const currentIndex=order?stages.indexOf(order.status):0;
  return <PartsPage title="Order management" subtitle="Track preparation and rider handoff"
    back="/partsdealer/orders" loading={loading} refresh={()=>void load()}>
    {!order?<Notice tone="error">{error||"Order unavailable."}</Notice>:<>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.eyebrow}>ORDER #{order.id.slice(0,8).toUpperCase()}</Text>
          <Status label={order.status} good={order.status==="delivered"}/>
        </View>
        <Text style={styles.heroTitle}>{statusTitle[order.status]??"Parts order"}</Text>
        <Text style={styles.heroSubtitle}>{order.parts_inventory?.title||"Spare part"}</Text>
        <Text style={styles.heroPrice}>{money(order.subtotal_kes)}</Text>
      </View>
      {order.status!=="declined"?<View style={styles.timeline}>
        <View style={styles.sectionTop}><Text style={styles.heading}>Delivery progress</Text>
          <Text style={styles.small}>{Math.max(1,currentIndex+1)} of 6</Text></View>
        {stages.map((step,i)=><View key={step} style={styles.step}>
          <View style={[styles.stepCircle,i<=currentIndex&&styles.stepCircleDone]}>
            {i<=currentIndex?<Glyph ios="checkmark" android="check" color="#FFFFFF" size={15}/>:
              <Text style={styles.stepNumber}>{i+1}</Text>}
          </View>
          <Text style={[styles.stepLabel,i<=currentIndex&&styles.stepActive]}>{stagesLabels[i]}</Text>
          {i===currentIndex?<Text style={styles.current}>CURRENT</Text>:null}
        </View>)}
      </View>:<Notice tone="error">{order.decline_reason||"Order declined by the dealer."}</Notice>}
      <View style={styles.card}>
        <Text style={styles.heading}>Items and delivery</Text>
        <View style={styles.row}><Text style={styles.label}>Item</Text>
          <Text style={styles.value}>{order.parts_inventory?.title||"Spare part"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Condition</Text>
          <Text style={styles.value}>{order.parts_inventory?.part_condition||"—"}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Quantity</Text>
          <Text style={styles.value}>{order.quantity} × {money(order.unit_price_kes)}</Text></View>
        <View style={styles.divider}/>
        <Text style={styles.label}>DELIVERY TO</Text>
        <Text style={styles.destination}>{order.delivery_location}</Text>
        <View style={styles.contacts}>
          <Pressable style={styles.contact} accessibilityRole="button"
            onPress={()=>phoneLink("call",order.delivery_phone)}>
            <Glyph ios="phone.fill" android="call" size={17}/>
            <Text style={styles.contactText}>Call customer</Text>
          </Pressable>
          <Pressable style={styles.contact} accessibilityRole="button"
            onPress={()=>phoneLink("sms",order.delivery_phone)}>
            <Glyph ios="message.fill" android="sms" size={17}/>
            <Text style={styles.contactText}>Send SMS</Text>
          </Pressable>
        </View>
        {order.note?<Notice>Customer note: {order.note}</Notice>:null}
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Order finances</Text>
        <View style={styles.row}><Text style={styles.label}>Order amount</Text>
          <Text style={styles.value}>{money(order.subtotal_kes)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Recorded commission ({order.commission_percent}%)</Text>
          <Text style={styles.value}>{money(order.commission_kes)}</Text></View>
        <View style={[styles.row,{marginBottom:0}]}><Text style={styles.label}>Dealer amount before costs</Text>
          <Text style={styles.value}>{money(order.subtotal_kes-order.commission_kes)}</Text></View>
        <Notice>Pay-on-delivery pilot. AutoAssist records commission but has not collected money. A completed delivery does not verify that payment was received.</Notice>
      </View>
      {order.status==="pending_dealer"?<View style={styles.actions}>
        <Text style={styles.heading}>Confirm availability</Text>
        <Text style={styles.small}>Review stock before accepting the order.</Text>
        <Action label="Accept order · In stock" busy={busy} onPress={()=>void act("accept")}/>
        <View style={styles.contacts}>
          <View style={{flex:1}}><Action label="Decline" disabled={busy} variant="outline"
            onPress={()=>decline(false)}/></View>
          <View style={{flex:1}}><Action label="Out of stock" disabled={busy} variant="danger"
            onPress={()=>decline(true)}/></View>
        </View>
      </View>:null}
      {order.status==="accepted"?<View style={styles.actions}>
        <Text style={styles.heading}>Ready to hand over?</Text>
        <Text style={styles.small}>Package the item securely before sending a rider pickup offer.</Text>
        <Action label="Packed · Find a rider" busy={busy} onPress={()=>void act("ready")}/>
      </View>:null}
      {order.status==="ready_for_pickup"?<View style={styles.actions}>
        <Text style={styles.heading}>Waiting for a rider</Text>
        <Text style={styles.small}>One available verified Rider receives each offer. Use Retry when an offer has expired.</Text>
        <Action label="Retry rider matching" busy={busy} onPress={()=>void act("retry")}
          icon={{ios:"arrow.clockwise",android:"refresh",web:"refresh"}}/>
      </View>:null}
      {order.status==="rider_assigned"?<Notice tone="success">
        A rider accepted this delivery. Have the package ready for collection.
      </Notice>:null}
      {order.status==="picked_up"?<Notice>
        The rider has collected the item. The Motorist must confirm receipt to complete this order.
      </Notice>:null}
      {order.status==="delivered"?<View style={styles.doneCard}>
        <Text style={styles.heading}>Order completed</Text>
        <Text style={styles.small}>The Motorist confirmed receiving this delivery. Return to your workspace for the next order.</Text>
        <Action label="Return to Dealer dashboard" onPress={()=>router.replace("/partsdealer/dashboard")}/>
      </View>:null}
      {order.status==="declined"?<Action label="Return to Dealer dashboard"
        onPress={()=>router.replace("/partsdealer/dashboard")}/>:null}
      {notice?<Notice tone={noticeTone}>{notice}</Notice>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
const styles=StyleSheet.create({
 hero:{borderRadius:22,backgroundColor:NAVY,padding:20,marginTop:4},
 heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},
 eyebrow:{fontFamily:"Inter_600SemiBold",fontSize:10,letterSpacing:1,color:"#B9D4F1"},
 heroTitle:{color:"#FFFFFF",fontFamily:"Inter_600SemiBold",fontSize:22,marginTop:16},
 heroSubtitle:{color:"#BDD4EA",fontSize:13,marginTop:7},
 heroPrice:{color:"#FFFFFF",fontFamily:"Inter_600SemiBold",fontSize:26,marginTop:15},
 timeline:{backgroundColor:"#FFFFFF",borderRadius:17,borderColor:"#E0EAF3",
   borderWidth:1,marginTop:16,padding:17},
 sectionTop:{flexDirection:"row",justifyContent:"space-between",marginBottom:15},
 heading:{color:NAVY,fontSize:16,fontFamily:"Inter_600SemiBold"},
 small:{fontSize:11,color:"#6B7F92",lineHeight:19,marginTop:5},
 step:{flexDirection:"row",alignItems:"center",gap:11,marginTop:10},
 stepCircle:{width:27,height:27,borderRadius:14,backgroundColor:"#E5EAF1",
   alignItems:"center",justifyContent:"center"},
 stepCircleDone:{backgroundColor:"#128966"},
 stepNumber:{fontFamily:"Inter_600SemiBold",color:"#718397",fontSize:11},
 stepLabel:{fontSize:12,color:"#8392A2",flex:1},
 stepActive:{color:NAVY,fontFamily:"Inter_600SemiBold"},
 current:{fontSize:9,color:BLUE,fontFamily:"Inter_600SemiBold"},
 card:{backgroundColor:"#FFFFFF",borderRadius:17,padding:18,marginTop:15,
   borderWidth:1,borderColor:"#E0EAF3"},
 row:{flexDirection:"row",justifyContent:"space-between",gap:16,marginTop:15},
 label:{color:"#67798B",fontSize:11,flex:1},
 value:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:12,textAlign:"right",flex:1},
 divider:{borderTopWidth:1,borderTopColor:"#E4EAF2",marginVertical:17},
 destination:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:14,marginTop:9,lineHeight:21},
 contacts:{flexDirection:"row",gap:10,marginTop:14},
 contact:{flex:1,backgroundColor:"#EAF3FF",padding:12,borderRadius:11,
   flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,minHeight:45},
 contactText:{color:BLUE,fontSize:11,fontFamily:"Inter_600SemiBold"},
 actions:{backgroundColor:"#EAF3FF",borderRadius:18,padding:18,marginTop:16},
 doneCard:{backgroundColor:"#E7F8F0",padding:18,borderRadius:18,marginTop:15},
});
