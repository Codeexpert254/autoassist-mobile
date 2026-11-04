import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Section, Status, partStyles, BLUE, NAVY } from "@/components/parts-ui";
import { type DeliveryLead, type RiderProfile, myRiderProfile,
  setRiderAvailable,availableDeliveries,assignedDeliveries } from "@/services/parts-riders";

export default function RiderDashboard(){
  const router=useRouter();const {user,profile}=useAuth();
  const [rider,setRider]=useState<RiderProfile|null>(null);
  const [leads,setLeads]=useState<DeliveryLead[]>([]);
  const [jobs,setJobs]=useState<any[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const load=useCallback(async()=>{
    if(!user||profile?.role!=="rider"){setLoading(false);return;}
    try{
      const r=await myRiderProfile(user.id);setRider(r);
      if(r?.verified){
        const [list,assigned]=await Promise.all([availableDeliveries(),assignedDeliveries(user.id)]);
        setLeads(list);setJobs(assigned);
      }
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load deliveries.");}
    finally{setLoading(false);}
  },[user?.id,profile?.role]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const online=async(value:boolean)=>{
    if(!user||busy)return;setBusy(true);
    try{setRider(await setRiderAvailable(user.id,value));await load();}
    catch(e){setError(e instanceof Error?e.message:"Unable to change availability.");}
    finally{setBusy(false);}
  };
  const active=jobs.filter(x=>["rider_assigned","picked_up"].includes(x.status));
  return <PartsPage title="Rider dashboard" subtitle="Pickup and deliver spare-parts orders"
    settings refresh={()=>void load()} loading={loading}>
    {profile?.role!=="rider"?<Notice tone="error">Sign in using a Rider account.</Notice>:!rider?<>
      <Notice>Register as a verified rider to receive parts deliveries.</Notice>
      <Action label="Register rider profile" onPress={()=>router.push("/rider/registration")}/>
    </>:<>
      <View style={partStyles.card}>
        <View style={[partStyles.row,{justifyContent:"space-between"}]}>
          <Text style={partStyles.cardTitle}>Delivery account</Text>
          <Status label={rider.verified?"Approved":"Verification pending"} good={rider.verified}/>
        </View>
        <Text style={partStyles.cardText}>{rider.vehicle_type} · {rider.registration_number||"No plate required"}</Text>
        {rider.verified?<View style={[partStyles.row,{justifyContent:"space-between",marginTop:14}]}>
          <View style={{flex:1}}>
            <Text style={partStyles.cardTitle}>Available for deliveries</Text>
            <Text style={partStyles.cardText}>You can accept pickups when online.</Text>
          </View>
          <Switch value={rider.is_available} onValueChange={v=>void online(v)} disabled={busy}
            trackColor={{true:"#A5C8F5",false:"#D0D5DD"}} thumbColor={rider.is_available?BLUE:"#FFFFFF"}/>
        </View>:<Notice>AutoAssist will activate delivery requests after your rider profile is approved.</Notice>}
      </View>
      <Section title="My active deliveries">
        {!active.length?<Notice>No active deliveries at the moment.</Notice>:active.map(o=>
          <Pressable key={o.id} accessibilityRole="button"
            onPress={()=>router.push({pathname:"/rider/active-delivery",params:{orderId:o.id}})}
            style={partStyles.card}>
            <Text style={partStyles.cardTitle}>{o.parts_inventory?.title||"Part delivery"}</Text>
            <Text style={partStyles.cardText}>{o.parts_shops?.shop_name} · {o.status.replace(/_/g," ")}</Text>
          </Pressable>)}
      </Section>
      <Section title="Available pickups">
        {!rider.is_available?<Notice>Go online to see available delivery offers.</Notice>:
          !leads.length?<Notice>No approved dealer has a pickup ready for you right now.</Notice>:leads.map(offer=>
          <Pressable key={offer.order_id} accessibilityRole="button"
            onPress={()=>router.push({pathname:"/rider/delivery-offer",params:{orderId:offer.order_id}})}
            style={partStyles.card}>
            <Text style={partStyles.cardTitle}>{offer.part_title}</Text>
            <Text style={partStyles.cardText}>{offer.shop_name} · {offer.pickup_location}</Text>
            <Text style={partStyles.cardText}>Tap to review this pickup</Text>
          </Pressable>)}
      </Section>
      <View style={partStyles.card}>
        <Text style={partStyles.cardTitle}>Your reputation</Text>
        <Text style={partStyles.cardText}>{Number(rider.rating)>0?Number(rider.rating).toFixed(1)+" ★":"New rider"} · {rider.completed_deliveries} deliveries</Text>
      </View>
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
