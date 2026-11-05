import { requireSupabase } from "@/lib/supabase";
const t=(table:string)=>requireSupabase().from(table as never) as any;
export type RiderProfile={
  user_id:string;vehicle_type:"motorbike"|"bicycle"|"car";registration_number:string;phone:string;
  verified:boolean;is_available:boolean;rating:number;reviews_count:number;completed_deliveries:number;
  verification_status:"pending"|"approved"|"rejected";verification_note:string|null;
};
export type DeliveryLead={offer_id:string;order_id:string;part_title:string;shop_name:string;
  pickup_location:string;listed_at:string;expires_at:string;score:number};
export async function myRiderProfile(id:string):Promise<RiderProfile|null>{
  const {data,error}=await t("parts_rider_profiles").select("*").eq("user_id",id).maybeSingle();
  if(error)throw error;return data;
}
export async function createRiderProfile(id:string,values:{
  vehicle_type:RiderProfile["vehicle_type"];registration_number:string;phone:string;
}):Promise<RiderProfile>{
  const {data,error}=await t("parts_rider_profiles").insert({user_id:id,...values}).select("*").single();
  if(error)throw error;return data;
}
export async function setRiderAvailable(userId:string,available:boolean):Promise<RiderProfile>{
  const {data,error}=await t("parts_rider_profiles")
    .update({is_available:available}).eq("user_id",userId).select("*").single();
  if(error)throw error;return data;
}
export async function availableDeliveries():Promise<DeliveryLead[]>{
  const {data,error}=await requireSupabase().rpc("available_part_deliveries" as never);
  if(error)throw error;return (data??[]) as DeliveryLead[];
}
export async function assignedDeliveries(userId:string){
  const {data,error}=await t("parts_orders").select(
    "*,parts_inventory(title,part_condition,price_kes),parts_shops(shop_name,phone,location_text,owner_id)"
  ).eq("rider_id",userId).order("created_at",{ascending:false}).limit(40);
  if(error)throw error;return data??[];
}
