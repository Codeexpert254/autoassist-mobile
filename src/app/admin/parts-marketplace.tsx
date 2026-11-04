import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Section, Status, partStyles, NAVY } from "@/components/parts-ui";
import { requireSupabase } from "@/lib/supabase";
import { money, type PartsShop } from "@/services/parts-data";
type RiderReview={user_id:string;vehicle_type:string;registration_number:string;phone:string;verified:boolean};
const api=()=>requireSupabase();
const t=(name:string)=>api().from(name as never) as any;

export default function PartsMarketplaceReview(){
  const {user}=useAuth();
  const [authorized,setAuthorized]=useState<boolean|null>(null);
  const [shops,setShops]=useState<PartsShop[]>([]),[riders,setRiders]=useState<RiderReview[]>([]);
  const [fee,setFee]=useState("7.50"),[loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const load=async()=>{
    if(!user){setLoading(false);return;}
    try{
      const {data:admin,error:adminError}=await api().rpc("is_autoassist_admin" as never,{
        p_user_id:user.id,p_required_role:null,
      } as never);
      if(adminError)throw adminError;
      if(!admin){setAuthorized(false);return;}
      setAuthorized(true);
      const [shopList,riderList,config]=await Promise.all([
        t("parts_shops").select("*").order("created_at",{ascending:false}),
        t("parts_rider_profiles").select("*").order("created_at",{ascending:false}),
        t("parts_marketplace_config").select("*").eq("id",true).single(),
      ]);
      if(shopList.error)throw shopList.error;
      if(riderList.error)throw riderList.error;
      if(config.error)throw config.error;
      setShops(shopList.data??[]);setRiders(riderList.data??[]);
      setFee(String(config.data?.commission_percent??7.5));setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load marketplace approvals.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[user?.id]);
  const approve=async(kind:"shop"|"rider",id:string,yes:boolean)=>{
    if(busy)return;setBusy(true);setError("");setNotice("");
    try{
      const name=kind==="shop"?"review_parts_shop_application":"review_parts_rider_application";
      const args=kind==="shop"?{p_shop_id:id,p_approve:yes,p_note:yes?"":"Application needs valid shop details"}:
        {p_rider_id:id,p_approve:yes};
      const {error}=await api().rpc(name as never,args as never);
      if(error)throw error;
      setNotice(kind+" "+(yes?"approved":"rejected")+".");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to complete verification.");}
    finally{setBusy(false);}
  };
  const adjustFee=async()=>{
    const value=Number(fee);
    if(!Number.isFinite(value)||value<5||value>10){setError("Commission must be between 5% and 10%.");return;}
    setBusy(true);setError("");
    try{
      const {error}=await api().rpc("set_parts_commission" as never,{p_percent:value} as never);
      if(error)throw error;
      setNotice("New orders will use a "+value+"% platform commission.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not save commission.");}
    finally{setBusy(false);}
  };
  return <PartsPage title="Marketplace review" subtitle="Verified AutoAssist administrators only"
    back="/settings" loading={loading} refresh={()=>void load()}>
    {authorized===false?<Notice tone="error">You are not authorized to review sellers and riders.</Notice>:<>
      {authorized===null?<Notice>Verifying administrator permission…</Notice>:null}
      {authorized?<><Section title="Shop applications">
        {!shops.length?<Notice>No shop applications yet.</Notice>:shops.map(shop=>
          <View key={shop.id} style={partStyles.card}>
            <View style={[partStyles.row,{justifyContent:"space-between"}]}>
              <Text style={[partStyles.cardTitle,{flex:1}]}>{shop.shop_name}</Text>
              <Status label={shop.verification_status} good={shop.verification_status==="approved"}/>
            </View>
            <Text style={partStyles.cardText}>{shop.seller_kind} · {shop.phone}</Text>
            <Text style={partStyles.cardText}>Location: {shop.location_text}</Text>
            <Text style={partStyles.cardText}>Business registration: {shop.business_reg_number||"Not supplied"}</Text>
            {shop.verification_status!=="approved"?<View style={partStyles.row}>
              <View style={{flex:1}}><Action label="Approve" disabled={busy}
                onPress={()=>void approve("shop",shop.id,true)}/></View>
              <View style={{flex:1}}><Action label="Reject" variant="danger" disabled={busy}
                onPress={()=>void approve("shop",shop.id,false)}/></View>
            </View>:null}
          </View>)}
      </Section>
      <Section title="Rider applications">
        {!riders.length?<Notice>No rider applications yet.</Notice>:riders.map(r=>
          <View key={r.user_id} style={partStyles.card}>
            <View style={[partStyles.row,{justifyContent:"space-between"}]}>
              <Text style={[partStyles.cardTitle,{flex:1}]}>{r.vehicle_type} · {r.registration_number}</Text>
              <Status label={r.verified?"approved":"pending"} good={r.verified}/>
            </View>
            <Text style={partStyles.cardText}>{r.phone}</Text>
            {!r.verified?<View style={partStyles.row}>
              <View style={{flex:1}}><Action label="Approve rider" disabled={busy}
                onPress={()=>void approve("rider",r.user_id,true)}/></View>
              <View style={{flex:1}}><Action label="Reject" variant="danger" disabled={busy}
                onPress={()=>void approve("rider",r.user_id,false)}/></View>
            </View>:null}
          </View>)}
      </Section>
      <Section title="Platform commission">
        <View style={partStyles.card}>
          <Text style={partStyles.cardTitle}>Commission rate for NEW parts orders</Text>
          <Text style={partStyles.cardText}>Allowed range: 5–10%. Existing orders keep their original rate. No payment is automatically collected.</Text>
          <TextInput accessibilityLabel="Commission percent" value={fee} onChangeText={setFee}
            keyboardType="decimal-pad" style={{minHeight:45,borderWidth:1,borderColor:"#D0D5DD",
              padding:12,borderRadius:10,backgroundColor:"#FFFFFF",color:NAVY,marginTop:12}}/>
          <Action label="Update commission percentage" disabled={busy} onPress={()=>void adjustFee()}/>
        </View>
      </Section></>:null}
      {notice?<Notice tone="success">{notice}</Notice>:null}
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
  </PartsPage>;
}
