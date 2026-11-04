import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Field, Notice, PartsPage, Section, Status, partStyles, NAVY } from "@/components/parts-ui";
import { ownShop, updateShop, type PartsShop } from "@/services/parts-data";
export default function StoreProfile(){
  const router=useRouter(),{user,profile}=useAuth();
  const [shop,setShop]=useState<PartsShop|null>(null);
  const [name,setName]=useState(""),[phone,setPhone]=useState(""),[location,setLocation]=useState("");
  const [desc,setDesc]=useState(""),[permit,setPermit]=useState("");
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{
    if(!user){setLoading(false);return;}
    void ownShop(user.id).then(s=>{
      setShop(s);if(s){setName(s.shop_name);setPhone(s.phone);setLocation(s.location_text);
        setDesc(s.description);setPermit(s.business_reg_number??"");}
    }).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[user?.id]);
  const save=async()=>{
    if(!shop||busy)return;setBusy(true);setError("");setNotice("");
    try{
      const s=await updateShop(shop.id,{
        shop_name:name.trim(),phone:phone.trim(),location_text:location.trim(),
        description:desc.trim(),business_reg_number:permit.trim(),
      });setShop(s);setNotice("Your shop profile was saved.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to save profile.");}
    finally{setBusy(false);}
  };
  return <PartsPage title="Store profile" subtitle="Business identity, contact and reputation"
    back="/partsdealer/dashboard" loading={loading}>
    {!shop?<Action label="Register your shop" onPress={()=>router.push("/partsdealer/registration")}/>:<>
      <View style={partStyles.card}>
        <View style={[partStyles.row,{justifyContent:"space-between"}]}>
          <Text style={[partStyles.cardTitle,{flex:1}]}>{shop.shop_name}</Text>
          <Status label={shop.verification_status} good={shop.verification_status==="approved"}/>
        </View>
        <Text style={partStyles.cardText}>Account type: {shop.seller_kind==="garage"?"Verified garage":"Parts Dealer shop"}</Text>
        <Text style={partStyles.cardText}>Customer rating: {Number(shop.rating)>0?
          Number(shop.rating).toFixed(1)+" ★ from "+shop.reviews_count+" reviews":"New seller"}</Text>
        {shop.verification_note?<Notice>{shop.verification_note}</Notice>:null}
      </View>
      <Section title="Shop information">
        <Field label="Shop name" value={name} onChangeText={setName}/>
        <Field label="Phone number" value={phone} keyboardType="phone-pad" onChangeText={setPhone}/>
        <Field label="Physical address" value={location} onChangeText={setLocation}/>
        <Field label="Registration / permit number" value={permit} onChangeText={setPermit}/>
        <Field label="Description" value={desc} multiline onChangeText={setDesc}/>
      </Section>
      {error?<Notice tone="error">{error}</Notice>:null}
      {notice?<Notice tone="success">{notice}</Notice>:null}
      <Action label="Save shop profile" busy={busy} onPress={()=>void save()}/>
      <Notice>AutoAssist verifies every shop before making products available for orders. Ratings are calculated from customer reviews, not edited by sellers.</Notice>
    </>}
  </PartsPage>;
}
