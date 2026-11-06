import { requireSupabase } from "@/lib/supabase";
import type { PartsCoordinate } from "@/components/parts-location-picker";

export type TowStatus = "searching"|"quote_pending"|"assigned"|"arrived"|"secured"|
  "en_route"|"completed_by_agent"|"completed"|"cancelled";
export type VehicleCategory = "saloon"|"suv"|"light_truck";
export type TowServiceType = "flatbed"|"wheel_lift"|"recovery";
export const towServiceLabels:Record<TowServiceType,string>={flatbed:"Flatbed towing",wheel_lift:"Wheel-lift towing",recovery:"Vehicle recovery"};
export type TowDistanceBand = "0_10"|"10_20"|"20_30"|"30_40"|"40_50"|"above_50";
export type TowRequest = {
  id:string;motorist_id:string;agent_id:string|null;
  pickup_text:string;pickup_latitude:number;pickup_longitude:number;
  destination_text:string;destination_latitude:number|null;destination_longitude:number|null;
  vehicle_class:VehicleCategory;vehicle_registration:string;estimated_distance_band:TowDistanceBand;
  estimate_low_kes:number|null;estimate_high_kes:number|null;
  description:string;motorist_phone:string;status:TowStatus;
  service_type?:TowServiceType;estimated_route_km?:number|null;pricing_version?:number;
  quote_kes:number|null;quoted_at:string|null;quote_approved_at:string|null;
  agent_latitude:number|null;agent_longitude:number|null;agent_position_updated_at:string|null;
  agent_departed_at?:string|null;
  created_at:string;updated_at:string;
};
export type TowOffer = {
  offer_id:string;request_id:string;vehicle_class:VehicleCategory;
  vehicle_registration:string;pickup_area:string;destination_area:string;issue_notes:string;
  expires_at:string;
  estimate_low_kes:number|null;estimate_high_kes:number|null;
};
export type TowingPresence = {agent_id:string;is_online:boolean;updated_at:string};

const client=()=>requireSupabase();
const rpc=async<T=string>(name:string,args:Record<string,unknown>={})=>{
  const {data,error}=await client().rpc(name as never,args as never);
  if(error)throw new Error(error.message);
  return data as T;
};
export const towMoney=(x:number|null|undefined)=>x==null?"Custom quote":
  "KES "+Number(x).toLocaleString("en-KE");
export const vehicleNames:Record<VehicleCategory,string>={
  saloon:"Saloon / sedan",suv:"SUV / pickup",light_truck:"Light truck / van",
};
export const distanceLabels:Record<TowDistanceBand,string>={
  "0_10":"0–10 km","10_20":"10–20 km","20_30":"20–30 km",
  "30_40":"30–40 km","40_50":"40–50 km","above_50":"Over 50 km",
};
// Nairobi pilot tariff. Distance is a geodesic estimate with a 35% road allowance;
// actual road routing must replace this before guaranteed road-kilometre billing.
export function towingEstimatedKm(pickup:PartsCoordinate|null,destination:PartsCoordinate|null){
  if(!pickup||!destination)return null;
  const rad=Math.PI/180;
  const deltaLat=(destination.latitude-pickup.latitude)*rad;
  const deltaLon=(destination.longitude-pickup.longitude)*rad;
  const a=Math.sin(deltaLat/2)**2+Math.cos(pickup.latitude*rad)*
    Math.cos(destination.latitude*rad)*Math.sin(deltaLon/2)**2;
  const km=6371*2*Math.asin(Math.min(1,Math.sqrt(Math.max(0,a))))*1.35;
  return Math.max(1,Math.round(km*100)/100);
}
export function towingFixedPrice(km:number,vehicle:VehicleCategory,service:TowServiceType){
  const base=vehicle==="saloon"?4000:vehicle==="suv"?4500:5200;
  const rate=vehicle==="saloon"?150:vehicle==="suv"?180:220;
  return Math.ceil((base+Math.max(1,km)*rate+(service==="recovery"?2500:0))/100)*100;
}
export function distanceBandForKm(km:number):TowDistanceBand{
  return km<=10?"0_10":km<=20?"10_20":km<=30?"20_30":km<=40?"30_40":km<=50?"40_50":"above_50";
}
export function towIndicativePrice(vehicle:VehicleCategory,band:TowDistanceBand){
  const base:Record<TowDistanceBand,[number,number]|null>={
    "0_10":[5000,6000],"10_20":[6000,9000],"20_30":[8000,12000],
    "30_40":[10000,15000],"40_50":[12000,17000],"above_50":null,
  };
  const entry=base[band];if(!entry)return null;
  const extras=vehicle==="saloon"?[0,0]:vehicle==="suv"?[500,500]:[1500,2000];
  return [entry[0]+extras[0],entry[1]+extras[1]] as const;
}
export async function requestTow(fields:{
  pickup:PartsCoordinate;pickupText:string;destination:PartsCoordinate|null;
  destinationText:string;vehicle:VehicleCategory;plate:string;band:TowDistanceBand;
  description:string;phone:string;service:TowServiceType;
}){
  const id=await rpc<string>("create_priced_towing_request",{
    p_pickup_text:fields.pickupText,p_lat:fields.pickup.latitude,p_lon:fields.pickup.longitude,
    p_destination_text:fields.destinationText,
    p_dest_lat:fields.destination?.latitude??null,p_dest_lon:fields.destination?.longitude??null,
    p_vehicle_class:fields.vehicle,p_plate:fields.plate,p_band:fields.band,
    p_description:fields.description,p_phone:fields.phone,p_service_type:fields.service,
  });
  try{await dispatchTow(id);}
  catch(e){console.warn("Towing request created; agent dispatch unavailable",e);}
  return id;
}
export async function dispatchTow(requestId:string):Promise<{state:string}>{
  const {data,error}=await client().functions.invoke("towing-agent-dispatch",{
    body:{requestId},
  });
  if(error)throw new Error(error.message);
  if(data?.error)throw new Error(String(data.error));
  return {state:String(data?.state??"unknown")};
}
export async function myTowRequests(userId:string):Promise<TowRequest[]> {
  const {data,error}=await client().from("towing_requests" as never)
    .select("*").eq("motorist_id",userId).order("created_at",{ascending:false}).limit(30);
  if(error)throw new Error(error.message);
  return (data??[]) as TowRequest[];
}
export async function myTowingJobs(agentId:string):Promise<TowRequest[]>{
  const {data,error}=await client().from("towing_requests" as never)
    .select("*").eq("agent_id",agentId).order("created_at",{ascending:false}).limit(30);
  if(error)throw new Error(error.message);
  return (data??[]) as TowRequest[];
}
export async function towDetails(id:string):Promise<TowRequest>{
  const {data,error}=await client().from("towing_requests" as never)
    .select("*").eq("id",id).single();
  if(error)throw new Error(error.message);
  return data as TowRequest;
}
export async function towingOffers():Promise<TowOffer[]> {
  return (await rpc<TowOffer[]>("my_towing_offers"))??[];
}
export async function towingPresence(userId:string):Promise<TowingPresence|null>{
  const {data,error}=await client().from("towing_presence" as never)
    .select("*").eq("agent_id",userId).maybeSingle();
  if(error)throw new Error(error.message);
  return (data??null) as TowingPresence|null;
}
export const setTowingOnline=(online:boolean)=>rpc<boolean>("towing_set_online",{p_online:online});
export const respondToTow=(offerId:string,accept:boolean,quoteKes?:number)=>
  rpc<string>("respond_towing_offer",{p_offer_id:offerId,p_accept:accept,
    p_quote_kes:quoteKes??null});
export const approveTowQuote=(id:string,approved:boolean)=>
  rpc<string>("approve_towing_quote",{p_request_id:id,p_approve:approved});
export async function markTowingDeparture(id:string):Promise<boolean>{
  return rpc<boolean>("mark_towing_departure",{p_request_id:id});
}
export async function notifyTowMilestone(
  requestId:string,eventName:"departed"|"arrived"|"en_route"|"completed_by_agent",
):Promise<void>{
  const {data,error}=await client().functions.invoke("towing-status-alert",{
    body:{requestId,eventName},
  });
  if(error)throw error;
  if(data?.error)throw new Error(String(data.error));
}
export const updateTowStatus=(id:string,status:TowStatus)=>
  rpc<string>("update_towing_job",{p_request_id:id,p_next_status:status});
export const confirmTowComplete=(id:string)=>
  rpc<string>("complete_towing_request",{p_request_id:id});
export const cancelTow=(id:string)=>
  rpc<string>("cancel_towing_request",{p_request_id:id});
export const publishTowGPS=(id:string,latitude:number,longitude:number)=>
  rpc<void>("publish_towing_position",{p_request_id:id,p_lat:latitude,p_lon:longitude});
export const rateTow=(id:string,stars:number,comment:string)=>
  rpc<void>("rate_towing_request",{p_request_id:id,p_stars:stars,p_comment:comment});
export async function myTowReview(id:string){
  const {data,error}=await client().from("towing_reviews" as never).select("stars,comment")
    .eq("request_id",id).maybeSingle();
  if(error)throw new Error(error.message);
  return data as {stars:number;comment:string}|null;
}
