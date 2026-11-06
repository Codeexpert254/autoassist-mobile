import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Action, Field, Notice, PartsPage, Section, Status, partStyles, NAVY, BLUE } from "@/components/parts-ui";
import { useAuth } from "@/context/auth-context";
import { requireSupabase } from "@/lib/supabase";

type PhotoKind="license"|"insurance"|"truck";
type TowCapability="flatbed"|"wheel_lift"|"recovery";
const capabilities:TowCapability[]=["flatbed","wheel_lift","recovery"];
const capabilityLabels:Record<TowCapability,string>={flatbed:"Flatbed towing",wheel_lift:"Wheel-lift towing",recovery:"Vehicle recovery"};
type Photo={uri:string;mimeType:string;fileSize?:number};
export type TowingApplication={
 user_id:string;business_name:string;phone:string;operating_area:string;
 vehicle_type:TowCapability;service_types?:TowCapability[];vehicle_registration:string;
 license_number:string;insurance_policy:string;license_image_path:string;
 insurance_image_path:string;truck_image_path:string;
 verification_status:"pending"|"approved"|"rejected";review_note:string|null;
};
export async function getTowingApplication(id:string):Promise<TowingApplication|null>{
 const {data,error}=await requireSupabase().from("towing_agent_profiles" as never)
  .select("*").eq("user_id",id).maybeSingle();
 if(error)throw error;
 return data as TowingApplication|null;
}
const kinds:{id:PhotoKind;title:string;help:string}[]=[
 {id:"license",title:"Towing operating licence",help:"Upload a readable photo of your towing licence or permit."},
 {id:"insurance",title:"Vehicle insurance certificate",help:"Upload current insurance evidence for your towing truck."},
 {id:"truck",title:"Tow-truck photograph",help:"Upload a clear photo showing your recovery vehicle and registration."},
];
export default function TowingVerificationForm(){
 const router=useRouter(),{user,profile}=useAuth();
 const [existing,setExisting]=useState<TowingApplication|null>(null);
 const [business,setBusiness]=useState(""),[phone,setPhone]=useState(profile?.phone??"");
 const [area,setArea]=useState(""),[services,setServices]=useState<TowCapability[]>(["flatbed"]);
 const [plate,setPlate]=useState(""),[licence,setLicence]=useState(""),[insurance,setInsurance]=useState("");
 const [photos,setPhotos]=useState<Partial<Record<PhotoKind,Photo>>>({});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[message,setMessage]=useState("");
 const load=useCallback(async()=>{
   if(!user){setLoading(false);return;}
   try{
     const item=await getTowingApplication(user.id);
     setExisting(item);
     if(item){
       setBusiness(item.business_name);setPhone(item.phone);setArea(item.operating_area);
       setServices(item.service_types?.length?item.service_types:[item.vehicle_type]);setPlate(item.vehicle_registration);
       setLicence(item.license_number);setInsurance(item.insurance_policy);
     }
   }catch(e){setError(e instanceof Error?e.message:"Unable to load towing application.");}
   finally{setLoading(false);}
 },[user?.id]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const pick=async(kind:PhotoKind)=>{
   try{
     const result=await ImagePicker.launchImageLibraryAsync({
       mediaTypes:["images"],allowsMultipleSelection:false,quality:0.75,
     });
     if(result.canceled||!result.assets.length)return;
     const asset=result.assets[0];
     const mimeType=asset.mimeType??"image/jpeg";
     if(!["image/jpeg","image/png","image/webp"].includes(mimeType))
       throw new Error("Only JPEG, PNG and WebP photos are supported.");
     if(asset.fileSize&&asset.fileSize>10*1024*1024)
       throw new Error("Each document image must be under 10 MB.");
     setPhotos(old=>({...old,[kind]:{uri:asset.uri,mimeType,fileSize:asset.fileSize}}));
     setError("");
   }catch(e){setError(e instanceof Error?e.message:"Unable to select a document.");}
 };
 const upload=async(kind:PhotoKind,photo:Photo)=>{
   if(!user)throw new Error("Sign in first.");
   const ext=photo.mimeType==="image/png"?"png":photo.mimeType==="image/webp"?"webp":"jpg";
   const path=`${user.id}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
   const response=await fetch(photo.uri);
   const bytes=await response.arrayBuffer();
   if(!bytes.byteLength||bytes.byteLength>10*1024*1024)
     throw new Error("The selected image is empty or exceeds 10 MB.");
   const {error}=await requireSupabase().storage.from("towing-verification")
     .upload(path,bytes,{contentType:photo.mimeType,upsert:false});
   if(error)throw error;
   return path;
 };
 const save=async()=>{
   if(!user||profile?.role!=="towing"||busy)return;
   if(business.trim().length<3||phone.trim().length<9||area.trim().length<3||
     plate.trim().length<4||licence.trim().length<4||insurance.trim().length<4){
     setError("Complete every business, operating area, vehicle, licence and insurance field.");return;
   }
   const missing=kinds.find(k=>!photos[k.id]&&!(existing as any)?.[k.id+"_image_path"]);
   if(missing){setError("Upload "+missing.title.toLowerCase()+" before submitting.");return;}
   setBusy(true);setError("");setMessage("");
   try{
     const paths:Record<PhotoKind,string>={
       license:existing?.license_image_path??"",
       insurance:existing?.insurance_image_path??"",
       truck:existing?.truck_image_path??"",
     };
     for(const kind of kinds)if(photos[kind.id])paths[kind.id]=await upload(kind.id,photos[kind.id]!);
     const fields={
       business_name:business.trim(),phone:phone.trim(),operating_area:area.trim(),
       vehicle_type:services[0],service_types:services,vehicle_registration:plate.trim(),license_number:licence.trim(),
       insurance_policy:insurance.trim(),license_image_path:paths.license,
       insurance_image_path:paths.insurance,truck_image_path:paths.truck,
     };
     const c=requireSupabase();
     if(existing?.verification_status==="rejected"){
       const {error}=await c.rpc("resubmit_towing_application" as never,{
         p_business_name:fields.business_name,p_phone:fields.phone,
         p_operating_area:fields.operating_area,p_vehicle_type:fields.vehicle_type,
         p_vehicle_registration:fields.vehicle_registration,p_license_number:fields.license_number,
         p_insurance_policy:fields.insurance_policy,p_license_image_path:fields.license_image_path,
         p_insurance_image_path:fields.insurance_image_path,p_truck_image_path:fields.truck_image_path,
       } as never);
       if(error)throw error;
       const {error:serviceError}=await c.rpc("set_towing_capabilities" as never,{
         p_services:services,
       } as never);
       if(serviceError)throw serviceError;
     }else{
       const {error}=await c.from("towing_agent_profiles" as never)
         .insert({...fields,user_id:user.id,verification_status:"pending"} as never);
       if(error)throw error;
     }
     setPhotos({});await load();
     setMessage("Your towing verification application is pending administrator review.");
   }catch(e){setError(e instanceof Error?e.message:"Unable to submit towing verification.");}
   finally{setBusy(false);}
 };
 const underReview=existing?.verification_status==="pending";
 const approved=existing?.verification_status==="approved";
 const canApply=!existing||existing.verification_status==="rejected";
 return <PartsPage title="Towing Agent verification" subtitle="Register your recovery business securely"
    back="/towing/dashboard" loading={loading} refresh={()=>void load()}>
   {profile?.role!=="towing"?<Notice tone="error">Sign in using a Towing Agent account.</Notice>:<>
     {existing?<View style={partStyles.card}>
       <Text style={partStyles.cardTitle}>{existing.business_name}</Text>
       <Status label={existing.verification_status} good={approved}/>
       {underReview?<Notice>Your application is awaiting Super Admin review. Towing jobs remain unavailable until approval.</Notice>:null}
       {approved?<Notice tone="success">Your towing provider account has been approved. Services: {(existing.service_types?.length?existing.service_types:[existing.vehicle_type]).map(s=>capabilityLabels[s]).join(", ")}.</Notice>:null}
       {existing.verification_status==="rejected"?<Notice tone="error">
         {existing.review_note||"Your application needs corrections before resubmission."}
       </Notice>:null}
     </View>:null}
     {canApply?<Section title={existing?"Correct and resubmit":"Towing business application"}>
       <Notice>Provide valid operating, vehicle and insurance documents. Only authorized verification administrators can view these private images.</Notice>
       <Field label="Business / operator name" value={business} onChangeText={setBusiness}
         placeholder="Registered recovery business"/>
       <Field label="Contact phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>
       <Field label="Operating area" value={area} onChangeText={setArea}
         placeholder="Nairobi and surrounding counties"/>
       <Text style={{color:NAVY,fontSize:12,fontFamily:"Inter_600SemiBold",marginTop:15}}>Services and recovery equipment (choose all you offer)</Text>
       <Text style={{fontSize:11,color:"#64748B",lineHeight:18,marginTop:6}}>
         Select every capability your business can actually provide. All services require administrator verification before dispatch.
       </Text>
       <View style={[partStyles.row,{marginTop:9,flexWrap:"wrap"}]}>
         {capabilities.map(v=><Pressable key={v} accessibilityRole="checkbox"
           accessibilityState={{checked:services.includes(v)}}
           onPress={()=>setServices(current=>current.includes(v)?
             current.length>1?current.filter(s=>s!==v):current:[...current,v])}
           style={{borderColor:BLUE,borderWidth:1,backgroundColor:services.includes(v)?BLUE:"#FFFFFF",
             borderRadius:9,paddingHorizontal:12,paddingVertical:12,alignItems:"center"}}>
           <Text style={{color:services.includes(v)?"#FFFFFF":BLUE,fontSize:11}}>
             {services.includes(v)?"✓ ":""}{capabilityLabels[v]}
           </Text>
         </Pressable>)}
       </View>
       <Field label="Tow truck registration / number plate" value={plate} onChangeText={setPlate}/>
       <Field label="Towing operating licence / permit number" value={licence} onChangeText={setLicence}/>
       <Field label="Insurance policy / certificate number" value={insurance} onChangeText={setInsurance}/>
       <Section title="Document photographs">
         {kinds.map(k=><View key={k.id} style={partStyles.card}>
           <Text style={partStyles.cardTitle}>{k.title}</Text>
           <Text style={partStyles.cardText}>{k.help}</Text>
           {photos[k.id]?<Image source={{uri:photos[k.id]!.uri}}
             style={{width:"100%",height:155,borderRadius:10,marginTop:10}} contentFit="contain"/>:
             existing&&(existing as any)[k.id+"_image_path"]
               ?<Text style={[partStyles.cardText,{color:"#127047"}]}>Previously uploaded · replace only if necessary</Text>:null}
           <Action label={photos[k.id]?"Choose different image":"Select image"} variant="outline"
             onPress={()=>void pick(k.id)}/>
         </View>)}
       </Section>
       {error?<Notice tone="error">{error}</Notice>:null}
       {message?<Notice tone="success">{message}</Notice>:null}
       <Action label={existing?"Resubmit for review":"Submit towing verification"} busy={busy}
         onPress={()=>void save()}/>
     </Section>:null}
     {!canApply&&error?<Notice tone="error">{error}</Notice>:null}
     {!canApply&&message?<Notice tone="success">{message}</Notice>:null}
     {approved?<Action label="Open towing dashboard" onPress={()=>router.replace("/towing/dashboard")}/>:null}
   </>}
 </PartsPage>;
}
