import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Status, partStyles, BLUE, NAVY } from "@/components/parts-ui";
import { type Part, conditions, findParts, imageUrl, money } from "@/services/parts-data";

export default function SparePartsMarketplace(){
  const router=useRouter();const {profile}=useAuth();
  const [search,setSearch]=useState(""),[condition,setCondition]=useState("All");
  const [items,setItems]=useState<Part[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async(q=search,c=condition)=>{
    if(profile?.role!=="motorist"){setLoading(false);return;}
    setLoading(true);
    try{setItems(await findParts(q,c));setError("");}
    catch(e){setError(e instanceof Error?e.message:"Unable to search spare parts.");}
    finally{setLoading(false);}
  },[search,condition,profile?.role]);
  useFocusEffect(useCallback(()=>{void load();},[profile?.role]));
  return <PartsPage title="Spare parts" subtitle="Verified shops • New, refurbished or used"
    back="/motorist/home">
    {profile?.role!=="motorist"?<Notice tone="error">Sign in as a motorist to order spare parts.</Notice>:<>
      <View style={[partStyles.row,{alignItems:"center"}]}>
        <TextInput accessibilityLabel="Search parts" placeholder="Search brake pads, filters…"
          value={search} onChangeText={setSearch} placeholderTextColor="#98A2B3"
          onSubmitEditing={()=>void load()}
          style={{flex:1,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#D0D5DD",
            padding:12,borderRadius:11,fontSize:12,color:NAVY,minHeight:46}}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={()=>void load()}
          style={{backgroundColor:BLUE,padding:13,borderRadius:11}}>
          <Text style={{color:"#FFFFFF",fontFamily:"Inter_600SemiBold"}}>Find</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:13}}>
        {["All",...conditions].map(c=><Pressable key={c} accessibilityRole="button"
          onPress={()=>{setCondition(c);void load(search,c);}}
          style={{backgroundColor:condition===c?BLUE:"#FFFFFF",borderWidth:1,borderColor:BLUE,
            paddingVertical:9,paddingHorizontal:15,borderRadius:20,marginRight:8}}>
          <Text style={{color:condition===c?"#FFFFFF":BLUE,fontSize:11}}>{c}</Text>
        </Pressable>)}
      </ScrollView>
      <Action label="My parts orders" variant="outline"
        icon={{ios:"bag.fill",android:"shopping_bag",web:"shopping_bag"}}
        onPress={()=>router.push("/motorist/parts-orders")}/>
      <Text style={{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:15,marginTop:22}}>
        Available parts ({items.length})
      </Text>
      {loading?<Notice>Loading dealer inventory…</Notice>:null}
      {!loading&&!items.length?<Notice>No matching parts are currently available from verified, open shops.</Notice>:null}
      {items.map(p=>{
        const photo=p.parts_inventory_images?.slice().sort((a,b)=>a.sort_index-b.sort_index)[0];
        const url=imageUrl(photo?.storage_path);
        return <Pressable key={p.id} accessibilityRole="button"
          onPress={()=>router.push({pathname:"/motorist/part-details",params:{partId:p.id}})}
          style={[partStyles.card,{flexDirection:"row",gap:13}]}>
          {url?<Image source={{uri:url}} contentFit="cover" style={{width:104,height:103,borderRadius:11}}/>:
            <View style={{width:104,height:103,borderRadius:11,backgroundColor:"#EAF2FD",
              justifyContent:"center",alignItems:"center"}}><Text style={{fontSize:11,color:BLUE}}>Spare part</Text></View>}
          <View style={{flex:1}}>
            <Text style={partStyles.cardTitle} numberOfLines={2}>{p.title}</Text>
            <Text style={partStyles.cardText}>{p.part_condition} · {p.category}</Text>
            <Text style={{fontSize:15,color:BLUE,fontFamily:"Inter_600SemiBold",marginTop:8}}>
              {money(p.price_kes)}
            </Text>
            <Text style={partStyles.cardText} numberOfLines={1}>
              {p.parts_shops?.shop_name} · {Number(p.parts_shops?.rating??0)>0?
                Number(p.parts_shops?.rating).toFixed(1)+" ★":"New seller"}
            </Text>
          </View>
        </Press>;
      })}
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
