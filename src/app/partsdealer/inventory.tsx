import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Section, Status, NAVY, partStyles } from "@/components/parts-ui";
import { type Part, type PartsShop, imageUrl, inventoryFor, money, ownShop } from "@/services/parts-data";

export default function DealerInventory(){
  const router=useRouter();const {user}=useAuth();
  const [shop,setShop]=useState<PartsShop|null>(null),[items,setItems]=useState<Part[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async()=>{
    if(!user){setLoading(false);return;}
    try{const s=await ownShop(user.id);setShop(s);setItems(s?await inventoryFor(s.id):[]);setError("");}
    catch(e){setError(e instanceof Error?e.message:"Unable to load inventory.");}
    finally{setLoading(false);}
  },[user?.id]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  return <PartsPage title="My inventory" subtitle="Manage prices, photos and stock" back="/partsdealer/dashboard" loading={loading} refresh={()=>void load()}>
    <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}>
      <Text style={{color:NAVY,fontSize:13,fontFamily:"Inter_600SemiBold"}}>{items.length} products</Text>
      <View style={{minWidth:142}}><Action label="Add a part" icon={{ios:"plus",android:"add",web:"add"}} onPress={()=>router.push("/partsdealer/add-part")}/></View>
    </View>
    {!shop?<Notice>Register your shop before listing products.</Notice>:null}
    {!items.length&&shop?<Notice>Add your first spare part. Customers will see your listings after your shop is approved and open.</Notice>:null}
    {items.map(item=>{
      const img=item.parts_inventory_images?.slice().sort((a,b)=>a.sort_index-b.sort_index)[0];
      const uri=imageUrl(img?.storage_path);
      return <Pressable key={item.id} accessibilityRole="button"
        onPress={()=>router.push({pathname:"/partsdealer/add-part",params:{partId:item.id}})}
        style={[partStyles.card,{flexDirection:"row",gap:12,alignItems:"center"}]}>
        {uri?<Image source={{uri}} style={{width:84,height:84,borderRadius:10}} contentFit="cover"/>:
          <View style={{width:84,height:84,backgroundColor:"#EAF2FD",borderRadius:10,alignItems:"center",justifyContent:"center"}}>
            <Text style={{color:"#667085",fontSize:11}}>No photo</Text>
          </View>}
        <View style={{flex:1}}>
          <Text numberOfLines={2} style={partStyles.cardTitle}>{item.title}</Text>
          <Text style={partStyles.cardText}>{item.part_condition} · {item.category}</Text>
          <Text style={{color:NAVY,fontSize:13,fontFamily:"Inter_600SemiBold",marginTop:5}}>{money(item.price_kes)}</Text>
          <View style={[partStyles.row,{marginTop:6}]}>
            <Status label={item.stock_quantity===0?"Out of stock":item.stock_quantity+" in stock"} good={item.stock_quantity>0}/>
          </View>
        </View>
      </Pressable>;
    })}
    {error?<Notice tone="error">{error}</Notice>:null}
  </PartsPage>;
}
