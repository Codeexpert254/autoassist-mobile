import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Field, Notice, PartsPage, Section, Status, partStyles, BLUE, NAVY } from "@/components/parts-ui";
import { requireSupabase } from "@/lib/supabase";

type ProviderRole = "mechanic" | "partsdealer" | "rider" | "towing";
type FilterRole = "all" | ProviderRole;
type ReviewStatus = "all" | "pending" | "approved" | "rejected" | "draft";
type ProviderItem = {
  id:string;role:ProviderRole;ownerId:string;status:string;
  createdAt:string|null;displayName:string;summary:string;reviewNote:string|null;
};
type Details = {
  record?:Record<string,any>; submission?:Record<string,any>;
  profile?:Record<string,any>; mechanic?:Record<string,any>;
  identityNumber?:string|null;
  evidence?:Record<string,any>;
};
const roles:{value:FilterRole;label:string}[]=[
  {value:"all",label:"All"},{value:"mechanic",label:"Mechanics"},
  {value:"partsdealer",label:"Parts Dealers"},{value:"rider",label:"Riders"},
  {value:"towing",label:"Towing Agents"},
];
const states:{value:ReviewStatus;label:string}[]=[
  {value:"pending",label:"Pending"},{value:"approved",label:"Approved"},
  {value:"rejected",label:"Rejected"},{value:"all",label:"All"},
];
async function adminRequest(body:Record<string,unknown>){
  const {data,error}=await requireSupabase().functions.invoke("admin-verification",{body});
  if(error)throw error;
  if(data?.error)throw new Error(String(data.error));
  return data;
}
const Label=({name,value}:{name:string;value:unknown})=>
  value!==null && value!==undefined && String(value).length>0
    ?<Text style={partStyles.cardText}>{name}: {String(value)}</Text>:null;

export default function AdminVerificationQueue(){
  const {user}=useAuth();
  const [role,setRole]=useState<FilterRole>("all");
  const [status,setStatus]=useState<ReviewStatus>("pending");
  const [items,setItems]=useState<ProviderItem[]>([]);
  const [selected,setSelected]=useState<ProviderItem|null>(null);
  const [detail,setDetail]=useState<Details|null>(null);
  const [note,setNote]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const load=useCallback(async(r:FilterRole=role,s:ReviewStatus=status)=>{
    if(!user){setLoading(false);return;}
    setLoading(true);setError("");
    try {
      const response=await adminRequest({action:"list-all",role:r,status:s});
      setItems(response.items??[]);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load verification requests.");}
    finally{setLoading(false);}
  },[user?.id,role,status]);
  useFocusEffect(useCallback(()=>{void load();},[load]));

  const show=async(item:ProviderItem)=>{
    setSelected(item);setDetail(null);setNote("");setError("");setNotice("");
    setBusy(true);
    try {
      const result=item.role==="mechanic"
        ?await adminRequest({action:"detail",userId:item.id})
        :await adminRequest({action:"detail-provider",role:item.role,id:item.id});
      setDetail(result);
    }catch(e){setError(e instanceof Error?e.message:"Unable to inspect application.");}
    finally{setBusy(false);}
  };
  const review=(approve:boolean)=>{
    if(!selected||busy||!detail)return;
    if(!approve&&note.trim().length<5){
      setError("Enter a reason (at least 5 characters) before rejecting.");return;
    }
    Alert.alert(approve?"Approve applicant?":"Reject application?",
      approve?"This enables the applicant's verified provider account. Only approve after reviewing the supporting information.":
      "The applicant will be rejected. Your review note will be saved.",
      [{text:"Cancel",style:"cancel"},{text:approve?"Approve":"Reject",style:approve?"default":"destructive",
        onPress:async()=>{
          if(!selected)return;
          setBusy(true);setError("");
          try{
            await adminRequest({action:"review-provider",role:selected.role,id:selected.id,
              decision:approve?"approve":"reject",note:note.trim()});
            setNotice(selected.displayName+" "+(approve?"approved":"rejected")+".");
            setSelected(null);setDetail(null);await load();
          }catch(e){setError(e instanceof Error?e.message:"Unable to review applicant.");}
          finally{setBusy(false);}
        }}]
    );
  };
  const chooseRole=(r:FilterRole)=>{setRole(r);setSelected(null);setDetail(null);void load(r,status);};
  const chooseStatus=(s:ReviewStatus)=>{setStatus(s);setSelected(null);setDetail(null);void load(role,s);};

  const evidence=detail?.evidence??{};
  const evidenceImages=[
    {label:"National ID",url:evidence.nationalIdUrl},
    {label:"Business permit",url:evidence.businessPermitUrl},
    {label:"Profile photograph",url:evidence.profilePhotoUrl},
    {label:"Towing operator's licence",url:evidence.licenseUrl},
    {label:"Insurance evidence",url:evidence.insuranceUrl},
    {label:"Tow-truck photograph",url:evidence.truckUrl},
    ...((evidence.certificateUrls??[]) as string[]).map((url,i)=>({label:"Certificate "+(i+1),url})),
  ].filter(x=>typeof x.url==="string"&&x.url.length>0);

  return <PartsPage title="Verification" subtitle="Mechanics · Dealers · Riders · Towing"
    back="/settings" loading={loading&&!selected} refresh={()=>void load()}>
    <Section title="Provider type">
      <View style={{flexDirection:"row",flexWrap:"wrap",gap:7}}>
        {roles.map(r=><Pressable key={r.value} accessibilityRole="button" onPress={()=>chooseRole(r.value)}
          style={{paddingVertical:10,paddingHorizontal:11,borderRadius:10,
            borderWidth:1,borderColor:role===r.value?BLUE:"#D0D5DD",
            backgroundColor:role===r.value?"#EAF2FF":"#FFFFFF"}}>
          <Text style={{color:role===r.value?BLUE:NAVY,fontFamily:"Inter_600SemiBold",fontSize:11}}>{r.label}</Text>
        </Pressable>)}
      </View>
      <View style={{flexDirection:"row",gap:7,marginTop:11}}>
        {states.map(s=><Pressable key={s.value} accessibilityRole="button" onPress={()=>chooseStatus(s.value)}
          style={{paddingVertical:9,paddingHorizontal:11,borderRadius:10,
            backgroundColor:status===s.value?BLUE:"#E8EDF4"}}>
          <Text style={{color:status===s.value?"#FFFFFF":NAVY,fontSize:11}}>{s.label}</Text>
        </Pressable>)}
      </View>
    </Section>
    {error?<Notice tone="error">{error}</Notice>:null}
    {notice?<Notice tone="success">{notice}</Notice>:null}
    {selected?<>
      <Action label="Back to applications" variant="outline" onPress={()=>{setSelected(null);setDetail(null);setError("");}}/>
      <Section title={selected.displayName}>
        <View style={partStyles.card}>
          <Status label={selected.status} good={selected.status==="approved"}/>
          <Label name="Role" value={roles.find(x=>x.value===selected.role)?.label}/>
          <Label name="Description" value={selected.summary}/>
          <Label name="Submitted" value={selected.createdAt?new Date(selected.createdAt).toLocaleString():"Not supplied"}/>
          {busy&&!detail?<Notice>Loading applicant details…</Notice>:null}
          {detail?.profile?<>
            <Label name="Account name" value={detail.profile.full_name}/>
            <Label name="Phone" value={detail.profile.phone}/>
          </>:null}
          {detail?.record?<>
            <Label name="Business or shop" value={detail.record.shop_name??detail.record.business_name}/>
            <Label name="Business registration" value={detail.record.business_reg_number}/>
            <Label name="Shop address" value={detail.record.location_text}/>
            <Label name="Operating area" value={detail.record.operating_area}/>
            <Label name="Vehicle" value={detail.record.vehicle_type}/>
            <Label name="Vehicle plate" value={detail.record.vehicle_registration??detail.record.registration_number}/>
            <Label name="Operator licence" value={detail.record.license_number}/>
            <Label name="Insurance policy" value={detail.record.insurance_policy}/>
            <Label name="Phone" value={detail.record.phone}/>
            <Label name="Previous review note" value={detail.record.review_note??detail.record.verification_note}/>
          </>:null}
          {detail?.mechanic?<>
            <Label name="Mechanic location" value={detail.mechanic.location}/>
            <Label name="Services" value={JSON.stringify(detail.mechanic.services??[])}/>
            <Label name="National ID record" value={detail.identityNumber?"Available to verification admin":"Not available"}/>
            <Label name="ID checked" value={detail.submission?.national_id_confirmed?"Yes":"No"}/>
            <Label name="Permit checked" value={detail.submission?.business_permit_confirmed?"Yes":"No"}/>
            <Label name="Photo checked" value={detail.submission?.profile_photo_confirmed?"Yes":"No"}/>
          </>:null}
        </View>
      </Section>
      {evidenceImages.length?<Section title="Verification evidence">
        <Notice>Private documents are accessible through short-lived links. Review before approving.</Notice>
        {evidenceImages.map(image=><View key={image.label} style={partStyles.card}>
          <Text style={partStyles.cardTitle}>{image.label}</Text>
          <Image source={{uri:image.url}} contentFit="contain"
            style={{width:"100%",height:240,marginTop:10,borderRadius:9,backgroundColor:"#F1F5F9"}}/>
        </View>)}
      </Section>:selected.role!=="mechanic"?<Notice>
        {selected.role==="towing"
          ?"Towing evidence is unavailable. Do not approve without reviewing the required documents."
          :"This registration currently records business/vehicle information but does not upload documentary proof. Verify the applicant independently before approving."}
      </Notice>:null}
      {selected.status==="pending"&&detail?<Section title="Review decision">
        <Field label="Review note (required for rejection)" value={note} onChangeText={setNote}
          multiline placeholder="Explain missing or invalid documents, or the reason for rejection"/>
        <Action label="Approve application" busy={busy} onPress={()=>review(true)}/>
        <Action label="Reject application" variant="danger" disabled={busy}
          onPress={()=>review(false)}/>
      </Section>:null}
    </>:<>
      <Section title={"Applications ("+items.length+")"}>
        {!loading&&!items.length?<Notice>No applications match these filters.</Notice>:null}
        {items.map(item=><Pressable key={item.role+":"+item.id} accessibilityRole="button"
          onPress={()=>void show(item)} style={partStyles.card}>
          <View style={[partStyles.row,{justifyContent:"space-between"}]}>
            <Text style={[partStyles.cardTitle,{flex:1}]}>{item.displayName}</Text>
            <Status label={item.status} good={item.status==="approved"}/>
          </View>
          <Text style={partStyles.cardText}>{roles.find(r=>r.value===item.role)?.label}</Text>
          <Text style={partStyles.cardText}>{item.summary}</Text>
          <Text style={[partStyles.cardText,{color:BLUE,marginTop:10}]}>View application and evidence</Text>
        </Pressable>)}
      </Section>
    </>}
  </PartsPage>;
}
