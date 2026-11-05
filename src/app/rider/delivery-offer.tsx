import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Section, partStyles, NAVY } from "@/components/parts-ui";
import { type DeliveryLead, availableDeliveries } from "@/services/parts-riders";
import { respondToRiderOffer } from "@/services/parts-orders";

export default function RiderDeliveryOffer(){
  const p=useLocalSearchParams<{orderId?:string}>(),router=useRouter(),{profile}=useAuth();
  const id=Array.isArray(p.orderId)?p.orderId[0]:p.orderId;
  const [offer,setOffer]=useState<DeliveryLead|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    if(!id){setLoading(false);return;}
    void availableDeliveries().then(x=>setOffer(x.find(y=>y.order_id===id)??null))
      .catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[id]);
  const decline=async()=>{
    if(!id||!offer?.offer_id||busy)return;
    setBusy(true);setError("");
    try {
      await respondToRiderOffer(offer.offer_id,id,false);
      router.replace("/rider/dashboard");
    }catch(e){setError(e instanceof Error?e.message:"Unable to decline this offer.");}
    finally{setBusy(false);}
  };
  const accept=async()=>{
    if(!id||!offer?.offer_id||busy)return;setBusy(true);setError("");
    try{
      const result=await respondToRiderOffer(offer.offer_id,id,true);
      if(result!=="accepted")throw new Error("This delivery offer is no longer available.");
      router.replace({pathname:"/rider/active-delivery",params:{orderId:id}});
    }catch(e){setError(e instanceof Error?e.message:"Delivery no longer available.");}
    finally{setBusy(false);}
  };
  return <PartsPage title="Pickup offer" subtitle="Review the dealer before accepting"
    back="/rider/dashboard" loading={loading}>
    {profile?.role!=="rider"?<Notice tone="error">Rider account required.</Notice>:
      !offer?<Notice tone="error">{error||"This pickup has been accepted or is not available."}</Notice>:<>
        <View style={partStyles.card}>
          <Text style={partStyles.cardTitle}>{offer.part_title}</Text>
          <Text style={partStyles.cardText}>{offer.shop_name}</Text>
          <Text style={{color:NAVY,fontFamily:"Inter_600SemiBold",marginTop:11}}>Pickup at</Text>
          <Text style={partStyles.cardText}>{offer.pickup_location}</Text>
        </View>
        <Notice>For customer privacy, the full delivery location and phone number are shown only after you accept this job. Confirm that you are available to complete this pickup.</Notice>
        <Action label="Accept delivery" busy={busy} onPress={()=>void accept()}/>
        <Action label="Decline this offer" variant="outline" disabled={busy}
          onPress={()=>void decline()}/>
        {error?<Notice tone="error">{error}</Notice>:null}
      </>}
  </PartsPage>;
}
