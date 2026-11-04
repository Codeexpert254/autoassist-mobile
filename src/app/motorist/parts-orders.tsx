import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Notice, PartsPage, Status, partStyles } from "@/components/parts-ui";
import { type PartOrder, buyerOrders, money } from "@/services/parts-data";

export default function MotoristPartsOrders(){
  const {user}=useAuth(),router=useRouter();
  const [items,setItems]=useState<PartOrder[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async()=>{
    if(!user){setLoading(false);return;}
    try{setItems(await buyerOrders(user.id));setError("");}
    catch(e){setError(e instanceof Error?e.message:"Unable to load your orders.");}
    finally{setLoading(false);}
  },[user?.id]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  return <PartsPage title="My parts orders" subtitle="Track dealer acceptance, rider delivery and ratings"
    back="/motorist/spare-parts" loading={loading} refresh={()=>void load()}>
    {!items.length?<Notice>No orders yet. Find a spare part to get started.</Notice>:null}
    {items.map(o=><Pressable key={o.id} accessibilityRole="button"
      onPress={()=>router.push({pathname:"/motorist/parts-order",params:{orderId:o.id}})}
      style={partStyles.card}>
      <View style={[partStyles.row,{justifyContent:"space-between"}]}>
        <Text style={[partStyles.cardTitle,{flex:1}]}>{o.parts_inventory?.title||"Part order"}</Text>
        <Status label={o.status} good={o.status==="delivered"}/>
      </View>
      <Text style={partStyles.cardText}>{o.parts_shops?.shop_name}</Text>
      <Text style={partStyles.cardText}>{o.quantity} × {money(o.unit_price_kes)} · {money(o.subtotal_kes)}</Text>
      <Text style={partStyles.cardText}>{new Date(o.created_at).toLocaleString("en-KE")}</Text>
    </Press>)}
    {error?<Notice tone="error">{error}</Notice>:null}
  </PartsPage>;
}
