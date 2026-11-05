import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Action, Notice, PartsPage, BLUE, NAVY } from "@/components/parts-ui";
import { useAuth } from "@/context/auth-context";
import { respondToTow,towingOffers,towMoney,vehicleNames,type TowOffer } from "@/services/towing-jobs";

export default function TowingOfferPage(){
  const router=useRouter(),params=useLocalSearchParams<{offerId?:string}>();
  const offerId=Array.isArray(params.offerId)?params.offerId[0]:params.offerId;
  const {profile}=useAuth();
  const [offer,setOffer]=useState<TowOffer|null>(null);
  const [quote,setQuote]=useState("");
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    let alive=true;
    void towingOffers().then(list=>{
      if(!alive)return;
      const item=list.find(x=>x.offer_id===offerId)??null;
      setOffer(item);
      if(item?.estimate_high_kes)setQuote(String(item.estimate_high_kes));
    }).catch(e=>{if(alive)setError(e instanceof Error?e.message:"Unable to load offer.");})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[offerId]);
  const decide=async(accept:boolean)=>{
    if(!offer||busy)return;
    const amount=Number(quote.trim());
    if(accept&&(!Number.isInteger(amount)||amount<1000||amount>250000)){
      setError("Enter your total confirmed service price in KES (1,000–250,000).");return;}
    setBusy(true);setError("");
    try{
      const result=await respondToTow(offer.offer_id,accept,accept?amount:undefined);
      if(accept&&result==="quote_pending")
        router.replace({pathname:"/towing/active-tow",params:{requestId:offer.request_id}});
      else router.replace("/towing/dashboard");
    }catch(e){setError(e instanceof Error?e.message:"Unable to respond to towing offer.");}
    finally{setBusy(false);}
  };
  return <PartsPage title="Towing opportunity" subtitle="Review before accepting"
    back="/towing/dashboard" loading={loading}>
    {profile?.role!=="towing"?<Notice tone="error">Towing Agent account required.</Notice>:
      !offer?<Notice tone="error">{error||"This offer has expired or is no longer available."}</Notice>:<>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <SymbolView name={{ios:"car.side",android:"local_shipping",web:"local_shipping"} as never}
            size={30} tintColor="#FFFFFF"/>
        </View>
        <Text style={styles.eyebrow}>NEW TOWING REQUEST</Text>
        <Text style={styles.headline}>{offer.vehicle_registration}</Text>
        <Text style={styles.light}>{vehicleNames[offer.vehicle_class]}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>PICKUP AREA</Text>
        <Text style={styles.address}>{offer.pickup_area}</Text>
        <Text style={[styles.label,{marginTop:18}]}>TOWING DESTINATION</Text>
        <Text style={styles.address}>{offer.destination_area}</Text>
        {offer.issue_notes?<><Text style={[styles.label,{marginTop:18}]}>ROAD CONDITION / ISSUE</Text>
          <Text style={styles.address}>{offer.issue_notes}</Text></>:null}
        <Text style={[styles.label,{marginTop:18}]}>CUSTOMER'S INDICATIVE RANGE</Text>
        <Text style={styles.price}>{offer.estimate_low_kes!=null&&offer.estimate_high_kes!=null?
          `${towMoney(offer.estimate_low_kes)} – ${towMoney(offer.estimate_high_kes).replace("KES ","")}`:"Long distance · custom quote"}</Text>
        <Text style={styles.small}>This is not the final agreed price. Recovery type, distance and conditions may change the quote.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>YOUR TOTAL TOWING PRICE (KES)</Text>
        <TextInput value={quote} onChangeText={setQuote} keyboardType="number-pad"
          placeholder="e.g. 6000" placeholderTextColor="#9EABBC"
          style={styles.field}/>
        <Notice>The Motorist must approve your exact quote before you begin travel. The quote is visible in their app, and you cannot change it after approval.</Notice>
      </View>
      <Action label="Accept and send price to Motorist" onPress={()=>void decide(true)} busy={busy}/>
      <Action label="Decline request" onPress={()=>void decide(false)} disabled={busy} variant="outline"/>
      {error?<Notice tone="error">{error}</Notice>:null}
      <Text style={styles.fine}>Only accept if you can safely recover this vehicle and reach the service area.</Text>
    </>}
  </PartsPage>;
}
const styles=StyleSheet.create({
 hero:{backgroundColor:NAVY,borderRadius:21,padding:20},
 heroIcon:{width:54,height:54,borderRadius:17,backgroundColor:"#286AB0",
  alignItems:"center",justifyContent:"center"},
 eyebrow:{fontSize:10,color:"#B2D3F6",letterSpacing:1.2,fontFamily:"Inter_600SemiBold",marginTop:20},
 headline:{fontFamily:"Inter_600SemiBold",color:"#FFFFFF",fontSize:24,marginTop:7},
 light:{color:"#D2E1EF",fontSize:12,marginTop:7},
 card:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#DFE8F3",
  borderRadius:16,padding:19,marginTop:15},
 label:{fontSize:11,color:BLUE,letterSpacing:0.6,fontFamily:"Inter_600SemiBold"},
 address:{fontFamily:"Inter_600SemiBold",fontSize:15,color:NAVY,marginTop:9},
 price:{fontFamily:"Inter_600SemiBold",fontSize:24,color:NAVY,marginTop:9},
 small:{color:"#64758B",fontSize:11,lineHeight:19,marginTop:9},
 field:{borderWidth:1,borderColor:"#D4E0EF",backgroundColor:"#F7FAFD",
  borderRadius:12,minHeight:52,marginTop:13,paddingHorizontal:14,
  fontFamily:"Inter_600SemiBold",fontSize:20,color:NAVY},
 fine:{color:"#77889B",fontSize:11,lineHeight:19,marginTop:20},
});
