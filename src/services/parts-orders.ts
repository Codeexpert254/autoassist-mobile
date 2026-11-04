import { requireSupabase } from "@/lib/supabase";
const client=()=>requireSupabase();
const rpc=async (name:string,args:Record<string,unknown>)=>{
  const {data,error}=await client().rpc(name as never,args as never);
  if(error)throw error;return String(data??"");
};
export async function orderPart(partId:string,quantity:number,location:string,phone:string,repairId?:string|null,note="") {
  const orderId=await rpc("place_parts_order",{
    p_part_id:partId,p_quantity:quantity,p_delivery_location:location,
    p_delivery_phone:phone,p_repair_request_id:repairId??null,p_note:note,
  });
  // The server validates buyer ownership before sending push notifications.
  // Notification failures never undo a successfully created order.
  try {
    const result=await client().functions.invoke("parts-order-notify",{body:{orderId}});
    if(result.error)console.warn("Dealer push could not be sent",result.error.message);
  } catch(error) {
    console.warn("Parts order created, but dealer push is unavailable",error);
  }
  return orderId;
}
export const respondToPartOrder=(id:string,accept:boolean,outOfStock=false)=>
  rpc("respond_parts_order",{p_order_id:id,p_accept:accept,p_out_of_stock:outOfStock});
export const readyForRider=(id:string)=>
  rpc("mark_parts_ready",{p_order_id:id});
export const claimPartDelivery=(id:string)=>
  rpc("claim_parts_delivery",{p_order_id:id});
export const riderPickedUp=(id:string)=>
  rpc("mark_parts_picked_up",{p_order_id:id});
export const motoristReceivedPart=(id:string)=>
  rpc("confirm_parts_delivery",{p_order_id:id});
export const ratePartsOrder=(id:string,target:"dealer"|"rider",stars:number,comment:string)=>
  rpc("review_parts_delivery",{p_order_id:id,p_subject:target,p_stars:stars,p_comment:comment});
export async function existingPartRatings(orderId:string) {
  const {data,error}=await client().from("parts_order_reviews" as never)
    .select("subject_type,stars,comment").eq("order_id",orderId);
  if(error)throw error;
  return (data??[]) as {subject_type:string;stars:number;comment:string}[];
}
export async function marketplaceCommission():Promise<number> {
  const {data,error}=await client().from("parts_marketplace_config" as never)
    .select("commission_percent").eq("id",true).single();
  if(error)throw error;return Number((data as any)?.commission_percent??7.5);
}
