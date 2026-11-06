import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "@/components/autoassist-font";

import { useAuth } from "@/context/auth-context";
import { Notice, PartsPage, BLUE, NAVY } from "@/components/parts-ui";
import { type PartOrder,type PartsShop,money,ownShop,shopOrders,subscribeShopOrders }
  from "@/services/parts-data";

type Filter="All"|"New"|"In progress"|"Completed";
const tabs:Filter[]=["All","New","In progress","Completed"];
const labels:Record<string,string>={
  pending_dealer:"New · respond now",accepted:"Preparing",
  declined:"Declined",ready_for_pickup:"Finding a Rider",
  rider_assigned:"Rider assigned",picked_up:"Out for delivery",delivered:"Delivered",
};
const ongoing=["accepted","ready_for_pickup","rider_assigned","picked_up"];
export default function DealerOrders(){
  const router=useRouter(),{user}=useAuth();
  const [shop,setShop]=useState<PartsShop|null>(null),[orders,setOrders]=useState<PartOrder[]>([]);
  const [filter,setFilter]=useState<Filter>("All");
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async()=>{
    if(!user){setLoading(false);return;}
    try{
      const s=await ownShop(user.id);setShop(s);
      setOrders(s?await shopOrders(s.id):[]);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load orders.");}
    finally{setLoading(false);}
  },[user?.id]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  useEffect(()=>{
    if(!shop)return;
    return subscribeShopOrders(shop.id,()=>{void load();});
  },[shop?.id,load]);
  const sorted=[...orders].filter(o=>
    filter==="All"||filter==="New"&&o.status==="pending_dealer"||
    filter==="In progress"&&ongoing.includes(o.status)||
    filter==="Completed"&&["delivered","declined"].includes(o.status)
  ).sort((a,b)=>{
    if(a.status==="pending_dealer"&&b.status!=="pending_dealer")return -1;
    if(b.status==="pending_dealer"&&a.status!=="pending_dealer")return 1;
    return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
  });
  return <PartsPage title="Your orders" subtitle="From stock confirmation to customer delivery"
    back="/partsdealer/dashboard" loading={loading} refresh={()=>void load()}>
    <View style={styles.hero}>
      <Text style={styles.heroEyebrow}>ORDER CONTROL CENTER</Text>
      <Text style={styles.heroTitle}>Every order in one place.</Text>
      <Text style={styles.heroDescription}>Confirm parts, coordinate pickup and follow delivery progress.</Text>
      <View style={styles.metrics}>
        <View><Text style={styles.metricNumber}>{orders.filter(o=>o.status==="pending_dealer").length}</Text>
          <Text style={styles.metricLabel}>Need response</Text></View>
        <View><Text style={styles.metricNumber}>{orders.filter(o=>ongoing.includes(o.status)).length}</Text>
          <Text style={styles.metricLabel}>In progress</Text></View>
        <View><Text style={styles.metricNumber}>{orders.filter(o=>o.status==="delivered").length}</Text>
          <Text style={styles.metricLabel}>Delivered</Text></View>
      </View>
    </View>
    <View style={styles.tabs}>
      {tabs.map(t=><Pressable accessibilityRole="button" key={t}
        onPress={()=>setFilter(t)} style={[styles.tab,t===filter&&styles.tabActive]}>
        <Text style={[styles.tabLabel,t===filter&&styles.tabLabelActive]}>{t}</Text>
      </Pressable>)}
    </View>
    {!shop?<Notice>Register your business before receiving customer orders.</Notice>:null}
    {shop&&!sorted.length?<View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <SymbolView name={{ios:"tray",android:"inbox",web:"inbox"} as never}
          tintColor={BLUE} size={27}/>
      </View>
      <Text style={styles.emptyTitle}>Nothing in {filter.toLowerCase()}</Text>
      <Text style={styles.emptyDescription}>New customer orders and status updates will appear here automatically.</Text>
    </View>:null}
    {sorted.map(o=><Pressable key={o.id} accessibilityRole="button"
      onPress={()=>router.push({pathname:"/partsdealer/order-details",params:{orderId:o.id}})}
      style={({pressed})=>[styles.card,pressed&&{opacity:0.85}]}>
      <View style={styles.cardHeader}>
        <View style={[styles.status,{backgroundColor:o.status==="pending_dealer"?"#E4F8EF":"#EDF4FF"}]}>
          <Text style={[styles.statusText,{color:o.status==="pending_dealer"?"#0E815A":BLUE}]}>
            {labels[o.status]??o.status.replace(/_/g," ")}
          </Text>
        </View>
        <SymbolView name={{ios:"arrow.up.right",android:"arrow_forward",web:"arrow_forward"} as never}
          tintColor={BLUE} size={20}/>
      </View>
      <Text style={styles.orderTitle}>{o.parts_inventory?.title||"Spare part"}</Text>
      <Text style={styles.number}>ORDER #{o.id.slice(0,8).toUpperCase()}</Text>
      <View style={styles.divider}/>
      <View style={styles.info}>
        <Text style={styles.infoLabel}>Order value</Text>
        <Text style={styles.infoValue}>{money(o.subtotal_kes)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.infoLabel}>Quantity</Text>
        <Text style={styles.infoValue}>{o.quantity} unit(s)</Text>
      </View>
      <Text style={styles.delivery} numberOfLines={2}>{o.delivery_location}</Text>
      <Text style={styles.view}>View order details →</Text>
    </Pressable>)}
    {error?<Notice tone="error">{error}</Notice>:null}
  </PartsPage>;
}
const styles=StyleSheet.create({
 hero:{backgroundColor:NAVY,borderRadius:21,padding:20},
 heroEyebrow:{fontFamily:"Inter_600SemiBold",letterSpacing:1.1,fontSize:10,color:"#AAD0F5"},
 heroTitle:{fontFamily:"Inter_600SemiBold",fontSize:22,color:"#FFFFFF",marginTop:10},
 heroDescription:{color:"#C1D7EC",fontSize:12,lineHeight:20,marginTop:8},
 metrics:{flexDirection:"row",justifyContent:"space-between",marginTop:20,
   borderTopWidth:1,borderTopColor:"#31516D",paddingTop:17},
 metricNumber:{fontFamily:"Inter_600SemiBold",fontSize:24,color:"#FFFFFF"},
 metricLabel:{fontSize:10,color:"#B8CEE3",marginTop:4},
 tabs:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:19,marginBottom:7},
 tab:{paddingHorizontal:11,paddingVertical:10,borderRadius:10,
   backgroundColor:"#FFFFFF",borderColor:"#DEE8F2",borderWidth:1},
 tabActive:{backgroundColor:BLUE,borderColor:BLUE},
 tabLabel:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:11},
 tabLabelActive:{color:"#FFFFFF"},
 card:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#DDE7F2",
   borderRadius:18,padding:18,marginTop:13},
 cardHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 status:{borderRadius:10,paddingHorizontal:11,paddingVertical:8},
 statusText:{fontFamily:"Inter_600SemiBold",fontSize:11},
 orderTitle:{fontFamily:"Inter_600SemiBold",fontSize:18,color:NAVY,marginTop:15},
 number:{color:"#748397",fontSize:11,marginTop:7},
 divider:{borderTopWidth:1,borderTopColor:"#E5EDF4",marginVertical:15},
 info:{flexDirection:"row",justifyContent:"space-between",marginBottom:10},
 infoLabel:{color:"#687A8F",fontSize:11},
 infoValue:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:12},
 delivery:{color:"#587089",fontSize:12,lineHeight:20,marginTop:8},
 view:{color:BLUE,fontFamily:"Inter_600SemiBold",fontSize:12,marginTop:17},
 empty:{backgroundColor:"#FFFFFF",borderColor:"#DCE6F2",borderWidth:1,
   borderRadius:17,padding:25,alignItems:"center",marginTop:20},
 emptyIcon:{width:53,height:53,borderRadius:17,backgroundColor:"#EBF4FE",
   alignItems:"center",justifyContent:"center"},
 emptyTitle:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:16,marginTop:16},
 emptyDescription:{color:"#75869B",fontSize:12,lineHeight:19,textAlign:"center",marginTop:7},
});
