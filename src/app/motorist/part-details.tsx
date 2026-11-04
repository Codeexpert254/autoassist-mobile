import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Action, Notice, PartsPage, Status, partStyles, BLUE, NAVY } from "@/components/parts-ui";
import { type Part, imageUrl, money, partDetails } from "@/services/parts-data";

export default function PartDetails(){
  const router=useRouter(),params=useLocalSearchParams<{partId?:string}>();
  const id=Array.isArray(params.partId)?params.partId[0]:params.partId;
  const [part,setPart]=useState<Part|null>(null),[error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!id){setError("Select a part first.");setLoading(false);return;}
    void partDetails(id).then(setPart).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[id]);
  const photos=part?.parts_inventory_images?.slice().sort((a,b)=>a.sort_index-b.sort_index)??[];
  return <PartsPage title="Part details" subtitle="Compare condition, compatibility and verified sellers"
    back="/motorist/spare-parts" loading={loading}>
    {!part?<Notice tone="error">{error||"No part found."}</Notice>:<>
      {photos.length?
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal:-18}}>
          {photos.map(photo=><Image key={photo.id} source={{uri:imageUrl(photo.storage_path)??""}}
            contentFit="cover" style={{width:300,height:215,marginLeft:18,borderRadius:14}}/>)}
        </ScrollView>:
        <View style={{height:170,backgroundColor:"#EAF2FD",borderRadius:14,alignItems:"center",justifyContent:"center"}}>
          <Text style={{color:BLUE}}>No product images yet</Text>
        </View>}
      <Text style={{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:22,marginTop:17}}>{part.title}</Text>
      <Text style={{color:BLUE,fontFamily:"Inter_600SemiBold",fontSize:23,marginTop:8}}>{money(part.price_kes)}</Text>
      <View style={[partStyles.row,{marginTop:12}]}>
        <Status label={part.part_condition} good={part.part_condition==="New"}/>
        <Status label={part.stock_quantity+" available"} good={part.stock_quantity>0}/>
      </View>
      <View style={partStyles.card}>
        <Text style={partStyles.cardTitle}>{part.parts_shops?.shop_name}</Text>
        <Text style={partStyles.cardText}>{part.parts_shops?.location_text}</Text>
        <Text style={partStyles.cardText}>{Number(part.parts_shops?.rating??0)>0?
          Number(part.parts_shops?.rating).toFixed(1)+" ★ · "+part.parts_shops?.reviews_count+" ratings":
          "New verified seller"}</Text>
      </View>
      <View style={partStyles.card}>
        <Text style={partStyles.cardTitle}>About this part</Text>
        <Text style={partStyles.cardText}>Condition: {part.part_condition}</Text>
        <Text style={partStyles.cardText}>Category: {part.category}</Text>
        <Text style={partStyles.cardText}>Compatible vehicles: {part.compatibility||"Confirm fitment with dealer"}</Text>
        {part.part_number?<Text style={partStyles.cardText}>Part number: {part.part_number}</Text>:null}
        <Text style={partStyles.cardText}>{part.description||"Ask the dealer to confirm suitability before purchase."}</Text>
      </View>
      <Notice>AutoAssist uses payment on delivery for the current pilot. The seller must accept and a registered rider must complete delivery.</Notice>
      <Action label="Order this spare part" onPress={()=>router.push({
        pathname:"/motorist/parts-checkout",params:{partId:part.id},
      })}/>
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
