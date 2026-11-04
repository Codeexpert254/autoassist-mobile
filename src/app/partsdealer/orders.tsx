import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Notice, PartsPage, Status, partStyles, NAVY } from "@/components/parts-ui";
import { type PartOrder, type PartsShop, money, ownShop, shopOrders, subscribeShopOrders } from "@/services/parts-data";

const labels:Record<string,string>={
  pending_dealer:"New · respond now",accepted:"Preparing",
  declined:"Declined",ready_for_pickup:"Waiting for rider",rider_assigned:"Rider assigned",
  picked_up:"On the way",delivered:"Delivered",
};
export default function DealerOrders(){
  const {user}=useAuth(),router=useRouter();
  const [shop,setShop]=useState<PartsShop|null>(null),[orders,setOrders]=useState<PartOrder[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async()=>{
    if(!user){setLoading(false);return;}
    try{const s=await ownShop(user.id);setShop(s);setOrders(s?await shopOrders(s.id):[]);setError("");}
    catch(e){setError(e instanceof Error?e.message:"Unable to load orders.");}
    finally{setLoading(false);}
  },[user?.id]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  useEffect(()=>{
    if(!shop)return;
    const unsub=subscribeShopOrders(shop.id,()=>{void load();});
    return unsub;
  },[shop?.id,load]);
  const sorted=[...orders].sort((a,b)=>{
    if(a.status==="pending_dealer"&&b.status!=="pending_dealer")return -1;
    if(a.status!=="pending_dealer"&&b.status==="pending_dealer")return 1;
    return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
  });
  return <PartsPage title="Shop orders" subtitle="Respond promptly and keep your stock accurate"
    back="/partsdealer/dashboard" loading={loading} refresh={()=>void load()}>
    {!shop?<Notice>Register your shop to receive orders.</Notice>:null}
    {!sorted.length&&shop?<Notice>No orders yet. When motorists order your listed parts, they appear here.</Notice>:null}
    {sorted.map(o=><Pressable key={o.id} accessibilityRole="button"
      onPress={()=>router.push({pathname:"/partsdealer/order-details",params:{orderId:o.id}})}
      style={partStyles.card}>
      <View style={[partStyles.row,{justifyContent:"space-between"}]}>
        <Text style={[partStyles.cardTitle,{flex:1}]}>{o.parts_inventory?.title||"Spare part"}</Text>
        <Status label={labels[o.status]??o.status} good={o.status==="delivered"}/>
      </View>
      <Text style={partStyles.cardText}>Quantity: {o.quantity} · {money(o.subtotal_kes)}</Text>
      <Text style={partStyles.cardText}>Delivery: {o.delivery_location}</Text>
      <Text style={[partStyles.cardText,{color:NAVY}]}>{new Date(o.created_at).toLocaleString("en-KE")}</Text>
    </Pressable>)}
    {error?<Notice tone="error">{error}</Notice>:null}
  </PartsPage>;
}
