import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Section, Status, partStyles, NAVY } from "@/components/parts-ui";
import { type PartOrder, oneOrder } from "@/services/parts-data";
import { riderPickedUp } from "@/services/parts-orders";

export default function ActivePartDelivery(){
  const p=useLocalSearchParams<{orderId?:string}>(),router=useRouter();
  const id=Array.isArray(p.orderId)?p.orderId[0]:p.orderId;
  const {user}=useAuth();
  const [order,setOrder]=useState<PartOrder|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const load=async()=>{
    if(!id||!user){setLoading(false);return;}
    try{const o=await oneOrder(id);
      if(o.rider_id!==user.id)throw new Error("This delivery is not assigned to your account.");
      setOrder(o);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to read this delivery.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();const timer=setInterval(()=>void load(),9000);return()=>clearInterval(timer);},[id,user?.id]);
  const picked=()=>Alert.alert("Confirm pickup","Confirm only after the dealer has physically handed you the spare part.",[
    {text:"Not yet",style:"cancel"},
    {text:"Part collected",onPress:()=>void(async()=>{
      if(!id||busy)return;setBusy(true);setError("");
      try{await riderPickedUp(id);await load();}
      catch(e){setError(e instanceof Error?e.message:"Unable to mark pickup.");}
      finally{setBusy(false);}
    })()},
  ]);
  return <PartsPage title="Active delivery" subtitle="Pickup and customer handoff" back="/rider/dashboard"
    loading={loading} refresh={()=>void load()}>
    {!order?<Notice tone="error">{error||"Delivery not found."}</Notice>:<>
      <View style={partStyles.card}>
        <Text style={partStyles.cardTitle}>{order.parts_inventory?.title||"Spare part"}</Text>
        <Text style={partStyles.cardText}>Quantity: {order.quantity}</Text>
        <Status label={order.status} good={order.status==="delivered"}/>
      </View>
      <Section title="1. Pickup from shop">
        <View style={partStyles.card}>
          <Text style={partStyles.cardTitle}>{order.parts_shops?.shop_name}</Text>
          <Text style={partStyles.cardText}>{order.parts_shops?.location_text}</Text>
          <View style={partStyles.row}>
            <View style={{flex:1}}>
              <Action label="Call dealer" icon={{ios:"phone.fill",android:"call",web:"call"}}
                onPress={()=>void Linking.openURL("tel:"+String(order.parts_shops?.phone??"").replace(/[^0-9+]/g,""))}/>
            </View>
          </View>
        </View>
      </Section>
      <Section title="2. Deliver to motorist">
        <View style={partStyles.card}>
          <Text style={[partStyles.cardTitle,{lineHeight:22}]}>{order.delivery_location}</Text>
          <Text style={partStyles.cardText}>{order.delivery_phone}</Text>
          <View style={[partStyles.row,{marginTop:8}]}>
            <View style={{flex:1}}><Action label="Call"
              icon={{ios:"phone.fill",android:"call",web:"call"}}
              onPress={()=>void Linking.openURL("tel:"+order.delivery_phone.replace(/[^0-9+]/g,""))}/></View>
            <View style={{flex:1}}><Action label="Message" variant="outline"
              icon={{ios:"message.fill",android:"sms",web:"sms"}}
              onPress={()=>void Linking.openURL("sms:"+order.delivery_phone.replace(/[^0-9+]/g,""))}/></View>
          </View>
        </View>
      </Section>
      {order.status==="rider_assigned"?<Action label="I have collected the part" busy={busy} onPress={picked}/>:null}
      {order.status==="picked_up"?<Notice>
        The motorist must confirm receipt inside AutoAssist to close this delivery. Do not mark the order delivered on their behalf.
      </Notice>:null}
      {order.status==="delivered"?<Notice tone="success">Delivery completed and confirmed by the motorist.</Notice>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
