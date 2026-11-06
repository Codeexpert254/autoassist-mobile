import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "@/components/autoassist-font";
import { useAuth } from "@/context/auth-context";
import { PartsPage, Notice, BLUE, NAVY } from "@/components/parts-ui";
import {
  type EarningsRole,type FinanceSummary,
  formatKes,getMarketplaceEarnings,
} from "@/services/marketplace-finance";

const descriptions:Record<EarningsRole,{title:string;intro:string;policy:string}>={
  partsdealer:{
    title:"Shop earnings",
    intro:"Your sales and AutoAssist commission, before verified collection.",
    policy:"10% is recorded on the spare-part subtotal. Delivery is quoted separately. Dealer payouts are unavailable until real payment confirmation and a settlement provider are enabled.",
  },
  towing:{
    title:"Recovery earnings",
    intro:"Fixed towing fares and a proposed 10% platform commission.",
    policy:"The towing commission is a configurable pilot proposal, not an active debit. Direct cash or M-PESA payments outside the app are not verified or automatically recovered.",
  },
  rider:{
    title:"Delivery earnings",
    intro:"Indicative delivery fees for your assigned jobs.",
    policy:"Proposed pilot: KES 150 pickup plus KES 35 per estimated kilometre, 0% rider commission. Distances are estimates, not routed driving kilometres. Fees are not yet collected or payable.",
  },
};
function Stat({label,value}:{label:string;value:string}){
  return <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>;
}
export default function MarketplaceEarnings(){
  const router=useRouter();
  const {user,profile,backendEnabled}=useAuth();
  const role=profile?.role==="mechanic"&&profile.provider_type==="garage"?
    "partsdealer":profile?.role;
  const supported=role==="partsdealer"||role==="towing"||role==="rider";
  const selectedRole= supported?role as EarningsRole:null;
  const [summary,setSummary]=useState<FinanceSummary|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=useCallback(async()=>{
    if(!user||!selectedRole){setLoading(false);return;}
    try{
      const result=await getMarketplaceEarnings(selectedRole,user.id);
      setSummary(result);setError("");
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Could not load your earnings.");
    }finally{setLoading(false);}
  },[user?.id,selectedRole]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const content=selectedRole?descriptions[selectedRole]:null;
  return <PartsPage title={content?.title??"Earnings"}
    subtitle="AutoAssist marketplace · pilot preview"
    back={selectedRole==="partsdealer"?"/partsdealer/dashboard":
      selectedRole==="towing"?"/towing/dashboard":
        selectedRole==="rider"?"/rider/dashboard":"/login"}
    refresh={load}>
    {!backendEnabled?<Notice tone="error">Connect to the AutoAssist live backend to see your records.</Notice>:
      !supported?<Notice tone="error">This earnings dashboard is for approved marketplace providers.</Notice>:<>
      <View style={styles.hero}>
        <SymbolView name={{ios:"chart.bar.xaxis",android:"bar_chart",web:"bar_chart"} as never}
          tintColor="#B3DCFF" size={26}/>
        <Text style={styles.heroEyebrow}>EARNINGS PREVIEW · NO PAYOUTS YET</Text>
        <Text style={styles.heroValue}>{formatKes(summary?.providerKes??0)}</Text>
        <Text style={styles.heroHelp}>{content?.intro}</Text>
        <Text style={styles.pilotLabel}>NOT A PAID OR WITHDRAWABLE BALANCE</Text>
      </View>
      {loading&&!summary?<ActivityIndicator color={BLUE} style={{marginTop:26}}/>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
      <View style={styles.grid}>
        <Stat label={selectedRole==="rider"?"Quoted delivery fees":"Gross service value"}
          value={formatKes(summary?.grossKes??0)}/>
        <Stat label="Platform commission" value={formatKes(summary?.commissionKes??0)}/>
        <Stat label="Actually paid out" value={formatKes(summary?.paidOutKes??0)}/>
        <Stat label="Orders / jobs" value={String(summary?.lines.length??0)}/>
      </View>
      <View style={styles.information}>
        <Text style={styles.informationTitle}>How your earnings will work</Text>
        <Text style={styles.informationText}>{content?.policy}</Text>
        <Text style={styles.informationText}>
          Current payment collection: {summary?.collectionEnabled?"Enabled":"Not enabled"} · M-PESA payouts: {summary?.payoutsEnabled?"Enabled":"Not enabled"}.
        </Text>
        <Text style={styles.informationText}>
          AutoAssist must verify the customer's payment on the server, then reconcile
          completion, refunds and disputes before any amount can be released.
          No M-PESA collection or B2C transfer is initiated from this page.
        </Text>
      </View>
      <Text style={styles.heading}>Your transaction history</Text>
      {!summary?.lines.length?<View style={styles.empty}>
        <Text style={styles.emptyTitle}>No transactions to display</Text>
        <Text style={styles.emptyText}>When you receive orders or assignments, their indicative values appear here.</Text>
      </View>:summary.lines.map(line=>
        <View key={line.id} style={styles.item}>
          <View style={styles.lineHead}>
            <Text style={styles.lineTitle}>{line.description}</Text>
            <Text style={styles.lineAmount}>{formatKes(line.providerKes)}</Text>
          </View>
          <Text style={styles.lineMeta}>#{line.reference} · {line.status.replace(/_/g," ")}</Text>
          <Text style={styles.lineMeta}>
            {new Date(line.date).toLocaleDateString("en-KE")} ·
            {line.paymentVerified?" Confirmed payment":" Payment not verified"}
          </Text>
          {selectedRole!=="rider"?<Text style={styles.lineMeta}>
            Recorded / proposed commission: {formatKes(line.commissionKes)}
          </Text>:null}
          {selectedRole==="rider"&&line.riderKes===0?<Text style={styles.warning}>
            Pickup or delivery coordinates missing — fare cannot be estimated yet.
          </Text>:null}
        </View>
      )}
      <Pressable style={styles.backAction} accessibilityRole="button"
        onPress={()=>router.back()}>
        <Text style={styles.backText}>Return to dashboard</Text>
      </Pressable>
    </>}
  </PartsPage>;
}
const styles=StyleSheet.create({
 hero:{backgroundColor:NAVY,borderRadius:22,padding:21,gap:9},
 heroEyebrow:{color:"#ACD5FF",fontSize:10,fontFamily:"Inter_600SemiBold",letterSpacing:0.8,marginTop:9},
 heroValue:{color:"#FFFFFF",fontSize:29,fontFamily:"Inter_600SemiBold"},
 heroHelp:{color:"#D3E4F4",fontSize:12,lineHeight:19},
 pilotLabel:{alignSelf:"flex-start",color:"#FFE1AA",backgroundColor:"#364656",padding:8,
  borderRadius:9,fontFamily:"Inter_600SemiBold",fontSize:10},
 grid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginTop:17},
 stat:{width:"48%",borderWidth:1,borderColor:"#E1E9F2",backgroundColor:"#FFFFFF",
  padding:14,borderRadius:14,minHeight:88,justifyContent:"center",gap:8},
 statLabel:{fontSize:11,color:"#667085"},
 statValue:{fontSize:18,color:NAVY,fontFamily:"Inter_600SemiBold"},
 information:{borderWidth:1,borderColor:"#CFE3F8",backgroundColor:"#EAF3FF",
  borderRadius:16,padding:16,marginTop:18,gap:9},
 informationTitle:{color:NAVY,fontSize:15,fontFamily:"Inter_600SemiBold"},
 informationText:{color:"#536C87",fontSize:12,lineHeight:19},
 heading:{fontFamily:"Inter_600SemiBold",fontSize:17,color:NAVY,marginTop:25,marginBottom:10},
 empty:{padding:20,backgroundColor:"#FFFFFF",borderRadius:15,borderColor:"#E1E9F2",borderWidth:1},
 emptyTitle:{color:NAVY,fontSize:14,fontFamily:"Inter_600SemiBold"},
 emptyText:{color:"#667085",fontSize:12,lineHeight:19,marginTop:6},
 item:{padding:15,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#E1E9F2",
  borderRadius:14,marginBottom:10},
 lineHead:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:8},
 lineTitle:{fontFamily:"Inter_600SemiBold",fontSize:13,color:NAVY,flex:1},
 lineAmount:{fontFamily:"Inter_600SemiBold",fontSize:14,color:BLUE},
 lineMeta:{fontSize:11,color:"#667085",marginTop:6},
 warning:{color:"#B36A12",fontSize:11,marginTop:8},
 backAction:{minHeight:45,alignItems:"center",justifyContent:"center",borderRadius:11,
  borderWidth:1,borderColor:BLUE,marginTop:15},
 backText:{fontSize:12,fontFamily:"Inter_600SemiBold",color:BLUE},
});
