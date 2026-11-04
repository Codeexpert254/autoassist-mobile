import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Field, Notice, PartsPage, Section } from "@/components/parts-ui";
import { applyForShop, ownShop } from "@/services/parts-data";

export default function PartsDealerRegistration() {
  const router=useRouter();
  const {user,profile}=useAuth();
  const [name,setName]=useState("");
  const [phone,setPhone]=useState(profile?.phone??"");
  const [location,setLocation]=useState("");
  const [description,setDescription]=useState("");
  const [registration,setRegistration]=useState("");
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const eligible=profile?.role==="partsdealer" ||
    (profile?.role==="mechanic" && profile?.provider_type==="garage");

  useEffect(()=>{
    if(!user){setLoading(false);return;}
    void ownShop(user.id).then(s=>{if(s)router.replace("/partsdealer/dashboard");})
      .catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[user?.id]);

  const submit=async()=>{
    if(!user||!eligible||busy)return;
    if(name.trim().length<3||phone.trim().length<9||location.trim().length<3||
      registration.trim().length<4){setError("Enter the shop name, phone, address and business registration number.");return;}
    setBusy(true);setError("");
    try{
      await applyForShop(user.id,{
        shop_name:name.trim(),phone:phone.trim(),location_text:location.trim(),
        description:description.trim(),business_reg_number:registration.trim(),
      });
      router.replace("/partsdealer/dashboard");
    }catch(e){setError(e instanceof Error?e.message:"Unable to register your shop.");}
    finally{setBusy(false);}
  };
  return <PartsPage title="Register your parts shop" subtitle="One verified shop per seller account"
      back={profile?.role==="mechanic"?"/mechanic/dashboard":"/roleselection"} loading={loading}>
    {!eligible?<Notice tone="error">Sign in as a Parts Dealer or with a verified garage mechanic account.</Notice>:<>
      <Notice>Dealers and verified garages can list new, refurbished and used spare parts. Your shop must be approved before buyers can place orders.</Notice>
      <Section title="Shop information">
        <Field label="Shop or garage name" value={name} onChangeText={setName} placeholder="Example: Auto Parts Nairobi"/>
        <Field label="Business registration / permit number" value={registration} onChangeText={setRegistration} placeholder="Registered business identifier"/>
        <Field label="Shop phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+254 7..."/>
        <Field label="Physical shop address" value={location} onChangeText={setLocation} placeholder="Street, building, town or county"/>
        <Field label="About your shop (optional)" value={description} onChangeText={setDescription} multiline
          placeholder="What parts do you specialize in?"/>
      </Section>
      {error?<Notice tone="error">{error}</Notice>:null}
      <Action label="Submit shop for verification" busy={busy} onPress={()=>void submit()}/>
      <View style={{height:20}}/>
      <Text style={{color:"#667085",fontSize:11,lineHeight:18}}>
        By registering you confirm that the listed items are genuine and accurately described. Used and refurbished conditions must be disclosed.
      </Text>
    </>}
  </PartsPage>;
}
