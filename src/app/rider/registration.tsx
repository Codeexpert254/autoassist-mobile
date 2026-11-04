import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Field, Notice, PartsPage, partStyles, BLUE } from "@/components/parts-ui";
import { createRiderProfile, myRiderProfile, type RiderProfile } from "@/services/parts-riders";

export default function RegisterRider(){
  const router=useRouter();const {user,profile}=useAuth();
  const [phone,setPhone]=useState(profile?.phone??""),[registration,setRegistration]=useState("");
  const [vehicle,setVehicle]=useState<RiderProfile["vehicle_type"]>("motorbike");
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{
    if(!user){setLoading(false);return;}
    void myRiderProfile(user.id).then(p=>{if(p)router.replace("/rider/dashboard");})
      .catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[user?.id]);
  const save=async()=>{
    if(!user||profile?.role!=="rider"||busy)return;
    if(phone.trim().length<9){setError("Enter a valid rider phone number.");return;}
    if(vehicle!=="bicycle"&&registration.trim().length<4){
      setError("Enter the vehicle registration number.");return;
    }
    setBusy(true);setError("");
    try{await createRiderProfile(user.id,{phone:phone.trim(),registration_number:registration.trim(),vehicle_type:vehicle});
      router.replace("/rider/dashboard");
    }catch(e){setError(e instanceof Error?e.message:"Unable to register rider.");}
    finally{setBusy(false);}
  };
  return <PartsPage title="Rider registration" subtitle="Get approved before accepting deliveries"
    back="/rider/dashboard" loading={loading}>
    {profile?.role!=="rider"?<Notice tone="error">Use your rider account to register.</Notice>:<>
      <Notice>Register your delivery vehicle and phone. An AutoAssist administrator must approve your account before you can claim a parts delivery.</Notice>
      <Text style={{color:"#102A43",fontFamily:"Inter_600SemiBold",marginTop:17}}>Vehicle type</Text>
      <View style={[partStyles.row,{marginTop:10}]}>
        {(["motorbike","bicycle","car"] as const).map(type=><Pressable key={type}
          onPress={()=>setVehicle(type)} style={{
            flex:1,borderWidth:1,borderColor:BLUE,backgroundColor:vehicle===type?BLUE:"#FFFFFF",
            paddingVertical:12,borderRadius:10,alignItems:"center",
          }}><Text style={{fontSize:11,color:vehicle===type?"#FFFFFF":BLUE,textTransform:"capitalize"}}>
            {type}</Text></Pressable>)}
      </View>
      <Field label="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone}/>
      {vehicle!=="bicycle"?<Field label="Vehicle registration number" value={registration}
        onChangeText={setRegistration} placeholder="Your vehicle plate number"/>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
      <Action label="Submit rider verification" busy={busy} onPress={()=>void save()}/>
    </>}
  </PartsPage>;
}
