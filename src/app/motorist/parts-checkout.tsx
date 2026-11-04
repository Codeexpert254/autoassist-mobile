import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { useRepairFlow } from "@/context/repair-flow-context";
import { Action, Field, Notice, PartsPage, Section, partStyles, BLUE, NAVY } from "@/components/parts-ui";
import { type Part, imageUrl, money, partDetails } from "@/services/parts-data";
import { orderPart } from "@/services/parts-orders";
import { requireSupabase } from "@/lib/supabase";

export default function PartsCheckout() {
  const router=useRouter(),params=useLocalSearchParams<{partId?:string}>();
  const partId=Array.isArray(params.partId)?params.partId[0]:params.partId;
  const {user,profile}=useAuth();
  const [part,setPart]=useState<Part|null>(null),[qty,setQty]=useState(1);
  const [location,setLocation]=useState(""),[phone,setPhone]=useState(profile?.phone??"");
  const [note,setNote]=useState(""),[repairId,setRepairId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    if(!partId||!user){setLoading(false);return;}
    void (async()=>{
      try{
        const p=await partDetails(partId);setPart(p);
        const {data}=await requireSupabase().from("repair_requests")
          .select("id,location_text,status").eq("motorist_id",user.id)
          .in("status",["connected","en-route","arrived","repair-complete"])
          .order("created_at",{ascending:false}).limit(1).maybeSingle();
        if(data){setRepairId(data.id);setLocation(data.location_text);}
      }catch(e){setError(e instanceof Error?e.message:"Unable to load this part.");}
      finally{setLoading(false);}
    })();
  },[partId,user?.id]);
  const submit=async()=>{
    if(!part||!user||busy)return;
    if(location.trim().length<5||phone.trim().length<9){setError("Enter a valid delivery address and phone number.");return;}
    setBusy(true);setError("");
    try{
      const id=await orderPart(part.id,qty,location.trim(),phone.trim(),repairId,note.trim());
      router.replace({pathname:"/motorist/parts-order",params:{orderId:id}});
    }catch(e){setError(e instanceof Error?e.message:"Unable to place order.");}
    finally{setBusy(false);}
  };
  const mainPhoto=imageUrl(part?.parts_inventory_images?.[0]?.storage_path);
  return <PartsPage title="Confirm parts order" subtitle="Review item, stock and delivery details"
    back={partId?"/motorist/part-details":"/motorist/spare-parts"} loading={loading}>
    {!part?<Notice tone="error">{error||"Part unavailable."}</Notice>:<>
      <View style={[partStyles.card,{flexDirection:"row",gap:12}]}>
        {mainPhoto?<Image source={{uri:mainPhoto}} style={{width:82,height:82,borderRadius:11}}/>:null}
        <View style={{flex:1}}>
          <Text style={partStyles.cardTitle}>{part.title}</Text>
          <Text style={partStyles.cardText}>{part.part_condition} · {part.parts_shops?.shop_name}</Text>
          <Text style={{color:BLUE,fontFamily:"Inter_600SemiBold",fontSize:16,marginTop:7}}>{money(part.price_kes)}</Text>
        </View>
      </View>
      <Section title="Quantity">
        <View style={[partStyles.row,{justifyContent:"space-between"}]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity"
            onPress={()=>setQty(Math.max(1,qty-1))} style={{backgroundColor:"#EAF2FD",padding:15,borderRadius:12}}>
            <Text style={{color:BLUE,fontSize:20}}>-</Text>
          </Pressable>
          <Text style={{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:22}}>{qty}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity"
            onPress={()=>setQty(Math.min(100,part.stock_quantity,qty+1))}
            style={{backgroundColor:"#EAF2FD",padding:15,borderRadius:12}}>
            <Text style={{color:BLUE,fontSize:20}}>+</Text>
          </Pressable>
        </View>
      </Section>
      <Section title="Delivery details">
        {repairId?<Notice>The order will be linked to your active mechanic repair request.</Notice>:null}
        <Field label="Delivery address" value={location} onChangeText={setLocation}
          placeholder="Building, street, town, landmark"/>
        <Field label="Contact phone" value={phone} onChangeText={setPhone}
          keyboardType="phone-pad" placeholder="+254 7..."/>
        <Field label="Message to dealer / rider (optional)" value={note} multiline onChangeText={setNote}
          placeholder="Gate, building details or vehicle fitment notes"/>
      </Section>
      <Section title="Order summary">
        <View style={partStyles.card}>
          <Text style={partStyles.cardText}>Item total: {money(Number(part.price_kes)*qty)}</Text>
          <Text style={partStyles.cardText}>Delivery fee: not quoted yet</Text>
          <Text style={partStyles.cardText}>Payment method: Pay on delivery (pilot)</Text>
          <Notice>Placing this request does not take payment. The dealer must accept, and a registered rider must confirm pickup before you can confirm delivery. A delivery fee is not included in the part total.</Notice>
        </View>
      </Section>
      {error?<Notice tone="error">{error}</Notice>:null}
      <Action label="Place parts order" disabled={qty>part.stock_quantity} busy={busy}
        onPress={()=>void submit()}/>
    </>}
  </PartsPage>;
}
