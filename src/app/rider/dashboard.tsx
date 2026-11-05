import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, Switch, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { ensureJobNotifications } from "@/services/push-notifications";
import { Action, Notice, PartsPage, Section, Status, partStyles, BLUE, NAVY } from "@/components/parts-ui";
import { type DeliveryLead, type RiderProfile, myRiderProfile,
  setRiderAvailable,availableDeliveries,assignedDeliveries } from "@/services/parts-riders";

export default function RiderDashboard(){
  const router=useRouter();const {user,profile}=useAuth();
  const [rider,setRider]=useState<RiderProfile|null>(null);
  const [leads,setLeads]=useState<DeliveryLead[]>([]);
  const [jobs,setJobs]=useState<any[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [newPickup,setNewPickup]=useState<DeliveryLead|null>(null);
  const seenOfferIds=useRef(new Set<string>());
  const fetching=useRef(false);
  const load=useCallback(async()=>{
    if(!user||profile?.role!=="rider"){setLoading(false);return;}
    if(fetching.current)return;
    fetching.current=true;
    try{
      const r=await myRiderProfile(user.id);setRider(r);
      if(r?.verified){
        const [list,assigned]=await Promise.all([availableDeliveries(),assignedDeliveries(user.id)]);
        setLeads(list);setJobs(assigned);
        if(r.is_available){
          const fresh=list.find(item=>!seenOfferIds.current.has(item.offer_id));
          if(fresh){
            seenOfferIds.current.add(fresh.offer_id);
            setNewPickup(fresh);
          }
        }else setNewPickup(null);
      }else{setLeads([]);setJobs([]);setNewPickup(null);}
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load deliveries.");}
    finally{fetching.current=false;setLoading(false);}
  },[user?.id,profile?.role]);
  useFocusEffect(useCallback(()=>{
    void load();
    const timer=setInterval(()=>{
      if(AppState.currentState==="active")void load();
    },5000);
    return()=>clearInterval(timer);
  },[load]));
  useEffect(()=>{
    if(!user||!rider?.verified||!rider.is_available)return;
    void ensureJobNotifications(user.id).then(result=>{
      if(!result.registered)console.info("Rider push fallback: "+result.message);
    }).catch(e=>console.warn("Rider push setup unavailable",e));
  },[user?.id,rider?.verified,rider?.is_available]);
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
          <Status label={rider.verification_status==="rejected"?"Rejected":rider.verified?"Approved":"Verification pending"} good={rider.verified}/>
        </View>
        <Text style={partStyles.cardText}>{rider.vehicle_type} · {rider.registration_number||"No plate required"}</Text>
        {rider.verified?<View style={[partStyles.row,{justifyContent:"space-between",marginTop:14}]}>
          <View style={{flex:1}}>
            <Text style={partStyles.cardTitle}>Available for deliveries</Text>
            <Text style={partStyles.cardText}>You can accept pickups when online.</Text>
          </View>
          <Switch value={rider.is_available} onValueChange={v=>void online(v)} disabled={busy}
            trackColor={{true:"#A5C8F5",false:"#D0D5DD"}} thumbColor={rider.is_available?BLUE:"#FFFFFF"}/>
        </View>:rider.verification_status==="rejected"?<>
          <Notice tone="error">{rider.verification_note||"Your rider application was rejected."}</Notice>
          <Action label="Correct and resubmit rider application" variant="outline"
            onPress={()=>router.push("/rider/registration")}/>
        </>:<Notice>AutoAssist will activate delivery requests after your rider profile is approved.</Notice>}
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
        {rider.is_available?<Notice>Pickup offers refresh automatically while this screen is open. If device push is unavailable, keep this dashboard visible during testing.</Notice>:null}
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
    <Modal visible={Boolean(newPickup&&rider?.is_available)} transparent animationType="fade"
      onRequestClose={()=>setNewPickup(null)}>
      <View style={{flex:1,backgroundColor:"#0009",padding:24,justifyContent:"center"}}>
        <View style={{backgroundColor:"#FFFFFF",borderRadius:18,padding:22}}>
          <Text style={{fontSize:20,color:NAVY,fontFamily:"Inter_600SemiBold"}}>New pickup offer</Text>
          <Text style={{color:NAVY,fontSize:15,marginTop:12,fontFamily:"Inter_600SemiBold"}}>
            {newPickup?.part_title??"Spare parts delivery"}
          </Text>
          <Text style={partStyles.cardText}>{newPickup?.shop_name} · {newPickup?.pickup_location}</Text>
          <Notice>Review the pickup now. Offers expire after two minutes.</Notice>
          <Action label="View pickup offer" onPress={()=>{
            const orderId=newPickup?.order_id;setNewPickup(null);
            if(orderId)router.push({pathname:"/rider/delivery-offer",params:{orderId}});
          }}/>
          <Action label="Dismiss alert" variant="outline" onPress={()=>setNewPickup(null)}/>
        </View>
      </View>
    </Modal>
  </PartsPage>;
}
