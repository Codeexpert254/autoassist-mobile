import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Section, Status, partStyles, NAVY } from "@/components/parts-ui";
import { type PartOrder, money, oneOrder } from "@/services/parts-data";
import { readyForRider, respondToPartOrder } from "@/services/parts-orders";

export default function DealerOrderDetails(){
  const router=useRouter(),p=useLocalSearchParams<{orderId?:string}>();
  const id=Array.isArray(p.orderId)?p.orderId[0]:p.orderId;
  const {user}=useAuth();
  const [order,setOrder]=useState<PartOrder|null>(null),[loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const load=async()=>{
    if(!id)return;
    try{const o=await oneOrder(id);if(o.parts_shops?.owner_id!==user?.id)
      throw new Error("This order does not belong to your shop.");
      setOrder(o);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load order.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();const timer=setInterval(()=>void load(),10000);return()=>clearInterval(timer);},[id,user?.id]);
  const act=async(action:"accept"|"decline"|"out_of_stock"|"ready")=>{
    if(!order||busy)return;setBusy(true);setError("");setNotice("");
    try{
      if(action==="ready")await readyForRider(order.id);
      else await respondToPartOrder(order.id,action==="accept",action==="out_of_stock");
      await load();
      setNotice(action==="accept"?"Order accepted. Stock was reserved for this order.":
        action==="ready"?"Marked ready. Verified riders can claim this delivery.":
        action==="out_of_stock"?"Order declined; inventory quantity set to zero.":"Order declined.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to update order.");}
    finally{setBusy(false);}
  };
  const confirmDecline=(outOfStock:boolean)=>Alert.alert(
    outOfStock?"Out of stock":"Decline this order",
    outOfStock?"The customer will be notified and this product's stock will be set to zero.":
      "The motorist will see that this order was declined.",
    [{text:"Keep order",style:"cancel"},{text:"Confirm",style:"destructive",onPress:()=>void act(outOfStock?"out_of_stock":"decline")}]
  );
  return <PartsPage title="Order details" subtitle="Confirm stock before you accept"
    back="/partsdealer/orders" loading={loading} refresh={()=>void load()}>
    {!order?<Notice tone="error">{error||"Order not found."}</Notice>:<>
      <View style={partStyles.card}>
        <View style={[partStyles.row,{justifyContent:"space-between"}]}>
          <Text style={partStyles.cardTitle}>{order.parts_inventory?.title||"Spare part"}</Text>
          <Status label={order.status} good={order.status==="delivered"}/>
        </View>
        <Text style={partStyles.cardText}>Order #{order.id.slice(0,8).toUpperCase()}</Text>
        <Text style={partStyles.cardText}>Condition: {order.parts_inventory?.part_condition}</Text>
        <Text style={partStyles.cardText}>Quantity: {order.quantity} × {money(order.unit_price_kes)}</Text>
        <Text style={{fontFamily:"Inter_600SemiBold",color:NAVY,marginTop:9,fontSize:20}}>
          {money(order.subtotal_kes)}
        </Text>
      </View>
      <Section title="Deliver to">
        <View style={partStyles.card}>
          <Text style={partStyles.cardTitle}>{order.delivery_location}</Text>
          <Text style={partStyles.cardText}>{order.delivery_phone}</Text>
          <View style={[partStyles.row,{marginTop:9}]}>
            <View style={{flex:1}}><Action label="Call" icon={{ios:"phone.fill",android:"call",web:"call"}}
              onPress={()=>void Linking.openURL("tel:"+order.delivery_phone.replace(/[^0-9+]/g,""))}/></View>
            <View style={{flex:1}}><Action label="Message" variant="outline"
              icon={{ios:"message.fill",android:"sms",web:"sms"}}
              onPress={()=>void Linking.openURL("sms:"+order.delivery_phone.replace(/[^0-9+]/g,""))}/></View>
          </View>
        </View>
      </Section>
      {order.note?<Notice>Customer note: {order.note}</Notice>:null}
      <Section title="Payment and AutoAssist commission">
        <View style={partStyles.card}>
          <Text style={partStyles.cardText}>Payment: {order.payment_method==="pay_on_delivery"?
            "Pay on delivery (pilot)":order.payment_method}</Text>
          <Text style={partStyles.cardText}>Marketplace commission: {money(order.commission_kes)} ({order.commission_percent}%)</Text>
          <Text style={partStyles.cardText}>Estimated seller amount before fulfillment costs: {money(order.subtotal_kes-order.commission_kes)}</Text>
          <Notice>Money is not collected by AutoAssist in this pilot. Commission is recorded as due only after the customer confirms delivery.</Notice>
        </View>
      </Section>
      {order.status==="pending_dealer"?<>
        <Action label="Accept · In stock" busy={busy} onPress={()=>void act("accept")}
          icon={{ios:"checkmark.circle.fill",android:"check_circle",web:"check_circle"}}/>
        <View style={partStyles.row}>
          <View style={{flex:1}}><Action label="Decline" variant="outline" disabled={busy}
            onPress={()=>confirmDecline(false)}/></View>
          <View style={{flex:1}}><Action label="Out of stock" variant="danger" disabled={busy}
            onPress={()=>confirmDecline(true)}/></View>
        </View>
      </>:null}
      {order.status==="accepted"?<Action label="Packed · Ready for rider pickup" busy={busy}
        onPress={()=>void act("ready")}/>:null}
      {order.status==="ready_for_pickup"?<Notice>Your item is ready. It will appear in the delivery queue for an approved rider.</Notice>:null}
      {order.status==="rider_assigned"?<Notice>A rider has accepted this delivery. Prepare the sealed part for handoff.</Notice>:null}
      {order.status==="picked_up"?<Notice>The rider picked up the part. Waiting for motorist confirmation.</Notice>:null}
      {order.status==="delivered"?<Notice tone="success">The customer confirmed delivery.</Notice>:null}
      {order.status==="declined"?<Notice tone="error">{order.decline_reason||"Order declined."}</Notice>:null}
      {notice?<Notice tone="success">{notice}</Notice>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
