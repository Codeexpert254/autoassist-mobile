import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Status, partStyles } from "@/components/parts-ui";
import { StaticDashboardWithSettings } from "@/components/static-dashboard-with-settings";
import { towingScreens } from "@/data/autoassist-screens";
import { getTowingApplication, type TowingApplication } from "@/components/towing-verification-functional";
import { Text, View } from "react-native";

export default function Dashboard(){
 const {user,profile}=useAuth(),router=useRouter();
 const [record,setRecord]=useState<TowingApplication|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 useFocusEffect(useCallback(()=>{
   let active=true;
   if(!user||profile?.role!=="towing"){setLoading(false);return()=>{active=false;};}
   void getTowingApplication(user.id).then(r=>{if(active){setRecord(r);setError("");}})
     .catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load verification status.");})
     .finally(()=>{if(active)setLoading(false);});
   return()=>{active=false;};
 },[user?.id,profile?.role]));
 if(profile?.role==="towing"&&record?.verification_status==="approved")
   return <StaticDashboardWithSettings screen={towingScreens.dashboard}/>;
 return <PartsPage title="Towing Agent" subtitle="Account verification required" settings
    loading={loading} refresh={()=>router.push("/towing/verification")}>
   {profile?.role!=="towing"?<Notice tone="error">Sign in as a Towing Agent.</Notice>:
     <View style={partStyles.card}>
       <Text style={partStyles.cardTitle}>{record?.business_name||"Complete your towing registration"}</Text>
       {record?<Status label={record.verification_status} good={record.verification_status==="approved"}/>:null}
       <Text style={partStyles.cardText}>
         {record?.verification_status==="pending"
           ?"Awaiting approval by an AutoAssist verification administrator."
           :record?.verification_status==="rejected"
             ?record.review_note||"Documents need correction and resubmission."
             :"Submit your business, vehicle and insurance evidence before receiving jobs."}
       </Text>
       {error?<Notice tone="error">{error}</Notice>:null}
       <Action label={!record?"Register towing business":record.verification_status==="rejected"
           ?"Correct application":"View verification status"} onPress={()=>router.push("/towing/verification")}/>
     </View>}
 </PartsPage>;
}
