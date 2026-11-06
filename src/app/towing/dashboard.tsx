import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { type ComponentRef, useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { AppText as Text } from "@/components/autoassist-font";

import { useAuth } from "@/context/auth-context";
import { getTowingApplication, type TowingApplication } from "@/components/towing-verification-functional";
import { Action, Notice, PartsPage, Status, BLUE, NAVY } from "@/components/parts-ui";
import { ensureJobNotifications } from "@/services/push-notifications";
import { startOfferAlert, stopOfferAlert } from "@/services/offer-attention";
import { myTowingJobs,setTowingOnline,towingOffers,towingPresence,towMoney,
  type TowOffer,type TowRequest } from "@/services/towing-jobs";

const ongoing=["quote_pending","assigned","arrived","secured","en_route","completed_by_agent"];
function Icon({ios,android,size=21,color=BLUE}:{
  ios:string;android:string;size?:number;color?:string;
}){return <SymbolView name={{ios,android,web:android} as never} size={size} tintColor={color}/>;}
export default function TowingDashboard(){
  const {user,profile}=useAuth(),router=useRouter();
  const [record,setRecord]=useState<TowingApplication|null>(null);
  const [jobs,setJobs]=useState<TowRequest[]>([]);
  const [offers,setOffers]=useState<TowOffer[]>([]);
  const [online,setOnline]=useState(false);
  const [popup,setPopup]=useState<TowOffer|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const seen=useRef(new Set<string>()),fetching=useRef(false);
  const scrollRef=useRef<ComponentRef<typeof ScrollView>>(null);
  const sections=useRef<Record<"active"|"offers"|"completed",number>>({active:0,offers:0,completed:0});
  const jump=(name:"active"|"offers"|"completed")=>scrollRef.current?.scrollTo({y:Math.max(0,sections.current[name]-12),animated:true});
  const selected=jobs.find(j=>ongoing.includes(j.status));
  const approved=record?.verification_status==="approved";

  const load=useCallback(async()=>{
    if(!user||profile?.role!=="towing"){setLoading(false);return;}
    if(fetching.current)return;fetching.current=true;
    try{
      const provider=await getTowingApplication(user.id);
      setRecord(provider);
      if(provider?.verification_status==="approved"){
        const [presence,work,newOffers]=await Promise.all([
          towingPresence(user.id),myTowingJobs(user.id),towingOffers(),
        ]);
        setOnline(Boolean(presence?.is_online));setJobs(work);setOffers(newOffers);
        setPopup(current=>current&&newOffers.some(x=>x.offer_id===current.offer_id)?current:null);
        const fresh=newOffers.find(x=>!seen.current.has(x.offer_id));
        if(fresh){seen.current.add(fresh.offer_id);setPopup(fresh);}
      }else{setJobs([]);setOffers([]);setOnline(false);setPopup(null);}
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load towing jobs.");}
    finally{fetching.current=false;setLoading(false);}
  },[user?.id,profile?.role]);
  useEffect(()=>{seen.current.clear();setPopup(null);},[user?.id]);
  useFocusEffect(useCallback(()=>{
    void load();
    const timer=setInterval(()=>{if(AppState.currentState==="active")void load();},5000);
    return()=>clearInterval(timer);
  },[load]));
  useEffect(()=>{
    if(!user||!approved||!online)return;
    void ensureJobNotifications(user.id).then(result=>{
      if(!result.registered)console.info("Towing foreground notifications active:",result.message);
    }).catch(e=>console.warn("Towing push token unavailable",e));
  },[user?.id,approved,online]);
  useEffect(()=>{
    if(!popup||!approved||!online)return;
    void startOfferAlert(popup.offer_id,"New towing request",`${popup.vehicle_registration} · ${popup.pickup_area}`);
    return()=>stopOfferAlert(popup.offer_id);
  },[popup?.offer_id,approved,online]);
  const toggle=async(next:boolean)=>{
    if(busy||selected)return;
    setBusy(true);setError("");
    try{setOnline(await setTowingOnline(next));await load();}
    catch(e){setError(e instanceof Error?e.message:"Unable to update availability.");}
    finally{setBusy(false);}
  };
  const openOffer=(offer:TowOffer)=>{
    setPopup(null);
    router.push({pathname:"/towing/tow-offer",params:{offerId:offer.offer_id}});
  };
  const jobsDone=jobs.filter(j=>j.status==="completed");
  return <PartsPage title="Recovery workspace" subtitle="AutoAssist towing partner" settings logoutRole="towing"
    refresh={()=>void load()} loading={loading&&!record} scrollRef={scrollRef}>
    {profile?.role!=="towing"?<Notice tone="error">Sign in as a verified Towing Agent.</Notice>:
    !approved?<View style={styles.verification}>
      <View style={styles.heroIcon}><Icon ios="truck.box.fill" android="local_shipping"
        color="#FFFFFF" size={29}/></View>
      <Text style={styles.heroTitle}>Your recovery business</Text>
      <Text style={styles.heroSubtitle}>
        {record?.business_name||"Join the AutoAssist towing network"}
      </Text>
      <Status label={record?.verification_status??"Registration required"}/>
      <Text style={styles.verificationInfo}>
        {record?.verification_status==="pending"
          ?"Verification is underway. Once approved, you can go online and receive recovery requests."
          :record?.verification_status==="rejected"
            ?record.review_note??"Your application needs corrections."
            :"Complete business, tow-truck and insurance verification to receive jobs."}
      </Text>
      {error?<Notice tone="error">{error}</Notice>:null}
      <Action label={record?.verification_status==="rejected"?"Correct verification":"Manage verification"}
        onPress={()=>router.push("/towing/verification")}/>
    </View>:<>
      <View style={styles.greeting}>
        <View style={{flex:1}}>
          <Text style={styles.eyebrow}>VERIFIED RECOVERY PARTNER</Text>
          <Text style={styles.greetingName}>{record.business_name}</Text>
          <Text style={styles.subtitle}>{record.vehicle_registration} · {(record.service_types?.length?record.service_types:[record.vehicle_type]).map(type=>type.replace("_"," ")).join(" · ")}</Text>
        </View>
        <View style={styles.avatar}><Icon ios="checkmark.shield.fill" android="verified_user" size={26}/></View>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}><Icon ios="truck.box.fill" android="local_shipping"
            color="#FFFFFF" size={28}/></View>
          <View style={[styles.pill,{backgroundColor:online?"#155D50":"#294760"}]}>
            <Text style={styles.pillText}>{selected?"ACTIVE ASSIGNMENT":online?"● ONLINE":"○ OFFLINE"}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>
          {selected?"Stay on top of your recovery":online?"Ready for towing requests?":"You're currently offline"}
        </Text>
        <Text style={styles.heroSubtitle}>
          {selected?"Continue your assigned service before accepting another job.":
            online?"Incoming offers appear here automatically while the app is open.":
            "Switch online to receive new Motorist towing requests."}
        </Text>
        <View style={styles.switchRow}>
          <View style={{flex:1}}>
            <Text style={styles.switchLabel}>Accepting recovery jobs</Text>
            <Text style={styles.switchHint}>{online?"Available for dispatch":"No new offers while offline"}</Text>
          </View>
          <Switch value={online} onValueChange={v=>void toggle(v)} disabled={busy||Boolean(selected)}
            trackColor={{true:"#B1E7D1",false:"#D4DBE3"}} thumbColor={online?"#148C63":"#FFFFFF"}/>
        </View>
      </View>
      <View style={styles.metrics}>
        <Pressable accessibilityRole="button" accessibilityLabel="Jump to active jobs"
          onPress={()=>jump("active")} style={styles.metric}><Icon ios="bolt.circle.fill" android="work" size={21}/>
          <Text style={styles.metricValue}>{selected?1:0}</Text><Text style={styles.metricLabel}>Active jobs ↓</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Jump to new offers"
          onPress={()=>jump("offers")} style={styles.metric}><Icon ios="bell.badge.fill" android="notifications" size={21}/>
          <Text style={styles.metricValue}>{offers.length}</Text><Text style={styles.metricLabel}>New offers ↓</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Jump to completed jobs"
          onPress={()=>jump("completed")} style={styles.metric}><Icon ios="checkmark.circle.fill" android="check_circle" size={21}/>
          <Text style={styles.metricValue}>{jobsDone.length}</Text><Text style={styles.metricLabel}>Completed ↓</Text></Pressable>
      </View>
      <View style={styles.section} onLayout={e=>{sections.current.active=e.nativeEvent.layout.y;}}>
        <Text style={styles.sectionTitle}>Active jobs</Text>
        {!selected?<Text style={styles.jobDesc}>No active recovery jobs yet.</Text>:null}
      </View>
      {selected?<View style={styles.section}>
        <Text style={styles.sectionTitle}>Current assignment</Text>
        <Pressable style={styles.jobCard} accessibilityRole="button"
          onPress={()=>router.push({pathname:"/towing/active-tow",params:{requestId:selected.id}})}>
          <View style={styles.jobHead}>
            <Text style={styles.jobLabel}>#{selected.id.slice(0,8).toUpperCase()} · {selected.status.replace(/_/g," ")}</Text>
            <Icon ios="arrow.up.right" android="arrow_forward"/>
          </View>
          <Text style={styles.jobTitle}>{selected.vehicle_registration}</Text>
          <Text style={styles.jobDesc}>{selected.pickup_text}</Text>
          <Text style={styles.link}>Continue towing job →</Text>
        </Pressable>
      </View>:null}
      <View style={styles.section} onLayout={e=>{sections.current.offers=e.nativeEvent.layout.y;}}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>New towing requests</Text>
          <View style={styles.count}><Text style={styles.countText}>{offers.length}</Text></View>
        </View>
        {!online?<View style={styles.empty}>
          <Icon ios="wifi.slash" android="wifi_off" size={26}/>
          <Text style={styles.emptyTitle}>Go online to start receiving offers</Text>
          <Text style={styles.emptyText}>Only verified, online towing partners are eligible for dispatch.</Text>
        </View>:offers.length===0?<View style={styles.empty}>
          <Icon ios="car.side.rear.open" android="local_shipping" size={27}/>
          <Text style={styles.emptyTitle}>Waiting for a recovery request</Text>
          <Text style={styles.emptyText}>Your dashboard checks for new jobs every few seconds.</Text>
        </View>:offers.map(offer=><Pressable key={offer.offer_id} style={styles.jobCard}
          accessibilityRole="button" onPress={()=>openOffer(offer)}>
          <View style={styles.jobHead}><Text style={styles.newLabel}>NEW REQUEST</Text>
            <Icon ios="arrow.up.right" android="arrow_forward"/></View>
          <Text style={styles.jobTitle}>{offer.vehicle_registration} · {offer.vehicle_class}</Text>
          <Text style={styles.jobDesc}>From: {offer.pickup_area}</Text>
          <Text style={styles.jobDesc}>To: {offer.destination_area}</Text>
          <Text style={styles.link}>Review fixed-fare job →</Text>
        </Pressable>)}
      </View>
      <View style={styles.section} onLayout={e=>{sections.current.completed=e.nativeEvent.layout.y;}}>
        <Text style={styles.sectionTitle}>Completed recovery jobs</Text>
        {jobsDone.length===0?<Text style={styles.jobDesc}>Completed recoveries will appear here.</Text>:
          jobsDone.map(job=><View key={job.id} style={styles.jobCard}>
            <Text style={styles.jobLabel}>#{job.id.slice(0,8).toUpperCase()} · COMPLETED</Text>
            <Text style={styles.jobTitle}>{job.vehicle_registration}</Text>
            <Text style={styles.jobDesc}>{job.pickup_text} → {job.destination_text}</Text>
            <Text style={styles.link}>{towMoney(job.quote_kes)}</Text>
          </View>)}
      </View>
      <View style={styles.account}>
        <Icon ios="checkmark.shield.fill" android="verified_user" color="#13815E" size={23}/>
        <View style={{flex:1}}>
          <Text style={styles.accountTitle}>Approved towing partner</Text>
          <Text style={styles.accountText}>AutoAssist fixes towing fares before dispatch. Operators cannot negotiate the customer price. In-app collection is not yet active.</Text>
        </View>
      </View>
      <Action label="View verification & business profile" variant="outline"
        onPress={()=>router.push("/towing/verification")}/>
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
    <Modal visible={Boolean(popup&&approved&&online)} transparent animationType="fade"
      onRequestClose={()=>setPopup(null)}>
      <View style={styles.scrim}><View style={styles.modal}>
        <View style={styles.modalIcon}><Icon ios="bell.badge.fill" android="notifications_active"
          color="#FFFFFF" size={27}/></View>
        <Text style={styles.eyebrow}>NEW TOWING REQUEST</Text>
        <Text style={styles.modalTitle}>A Motorist needs recovery</Text>
        <Text style={styles.jobDesc}>{popup?.vehicle_registration} · {popup?.pickup_area}</Text>
        <Notice>Open this request and submit your final towing quote. Offers expire after two minutes.</Notice>
        <Action label="View towing offer" onPress={()=>{if(popup)openOffer(popup);}}/>
        <Action label="Dismiss alert" variant="outline" onPress={()=>setPopup(null)}/>
      </View></View>
    </Modal>
  </PartsPage>;
}
const styles=StyleSheet.create({
 verification:{backgroundColor:"#FFFFFF",borderRadius:22,padding:22,
  borderWidth:1,borderColor:"#E1E8F2",marginTop:8},
 verificationInfo:{fontSize:12,color:"#61738A",lineHeight:20,marginVertical:15},
 greeting:{flexDirection:"row",gap:12,alignItems:"center",marginBottom:18},
 eyebrow:{fontSize:10,color:BLUE,letterSpacing:1.1,fontFamily:"Inter_600SemiBold"},
 greetingName:{fontSize:22,color:NAVY,fontFamily:"Inter_600SemiBold",marginTop:7},
 subtitle:{fontSize:11,color:"#657990",marginTop:6},
 avatar:{height:49,width:49,backgroundColor:"#EDF4FD",borderRadius:16,
  alignItems:"center",justifyContent:"center"},
 hero:{backgroundColor:NAVY,borderRadius:23,padding:20},
 heroRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 heroIcon:{height:51,width:51,borderRadius:16,backgroundColor:"#2F6496",
  alignItems:"center",justifyContent:"center",marginBottom:4},
 pill:{borderRadius:30,paddingHorizontal:11,paddingVertical:9},
 pillText:{fontSize:10,color:"#FFFFFF",fontFamily:"Inter_600SemiBold"},
 heroTitle:{fontFamily:"Inter_600SemiBold",fontSize:22,color:"#FFFFFF",marginTop:18},
 heroSubtitle:{color:"#C7D8EC",fontSize:12,lineHeight:20,marginTop:9},
 switchRow:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#FFFFFF",
  borderRadius:15,marginTop:20,padding:14},
 switchLabel:{fontFamily:"Inter_600SemiBold",fontSize:13,color:NAVY},
 switchHint:{fontSize:11,color:"#667085",marginTop:5},
 metrics:{flexDirection:"row",gap:9,marginTop:16},
 metric:{flex:1,backgroundColor:"#FFFFFF",borderRadius:17,
  borderWidth:1,borderColor:"#E0E9F2",padding:12},
 metricValue:{fontFamily:"Inter_600SemiBold",fontSize:25,color:NAVY,marginTop:8},
 metricLabel:{fontSize:11,color:"#6B7E92",marginTop:5},
 section:{marginTop:26},
 sectionTitle:{fontFamily:"Inter_600SemiBold",fontSize:18,color:NAVY},
 sectionRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 count:{backgroundColor:"#EAF2FD",borderRadius:9,paddingHorizontal:11,paddingVertical:7},
 countText:{fontFamily:"Inter_600SemiBold",color:BLUE},
 jobCard:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#DDE8F6",
  borderRadius:17,padding:17,marginTop:12},
 jobHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 jobLabel:{fontFamily:"Inter_600SemiBold",color:BLUE,fontSize:11},
 newLabel:{fontFamily:"Inter_600SemiBold",color:"#10825D",fontSize:10,letterSpacing:0.8},
 jobTitle:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:17,marginTop:12},
 jobDesc:{fontSize:12,color:"#65778B",lineHeight:20,marginTop:9},
 link:{color:BLUE,fontFamily:"Inter_600SemiBold",fontSize:13,marginTop:16},
 empty:{backgroundColor:"#FFFFFF",borderColor:"#E0E9F2",borderWidth:1,
  alignItems:"center",borderRadius:18,padding:25,marginTop:12},
 emptyTitle:{fontFamily:"Inter_600SemiBold",fontSize:14,color:NAVY,marginTop:12,textAlign:"center"},
 emptyText:{fontSize:12,color:"#6B7E92",lineHeight:19,marginTop:8,textAlign:"center"},
 account:{flexDirection:"row",gap:11,backgroundColor:"#EBF9F1",
  borderRadius:15,padding:15,marginTop:27,alignItems:"center"},
 accountTitle:{fontFamily:"Inter_600SemiBold",color:"#126D4E",fontSize:13},
 accountText:{fontSize:11,color:"#487963",lineHeight:17,marginTop:6},
 scrim:{flex:1,backgroundColor:"#0B2138CC",justifyContent:"center",padding:22},
 modal:{backgroundColor:"#FFFFFF",borderRadius:22,padding:22},
 modalIcon:{height:53,width:53,borderRadius:17,backgroundColor:BLUE,
  justifyContent:"center",alignItems:"center",marginBottom:20},
 modalTitle:{fontFamily:"Inter_600SemiBold",fontSize:23,color:NAVY,marginTop:9},
});
