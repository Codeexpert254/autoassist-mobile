import { requireSupabase } from "@/lib/supabase";
const client=()=>requireSupabase();
const rpc=async (name:string,args:Record<string,unknown>)=>{
  const {data,error}=await client().rpc(name as never,args as never);
  if(error)throw error;return String(data??"");
};
export async function orderPart(partId:string,quantity:number,location:string,phone:string,
  repairId?:string|null,note="",coords?:{latitude:number;longitude:number}|null) {
  const argumentsBase={
    p_part_id:partId,p_quantity:quantity,p_delivery_location:location,
    p_delivery_phone:phone,p_repair_request_id:repairId??null,p_note:note,
  };
  const orderId=coords
    ? await rpc("place_parts_order_with_coordinates",{
        ...argumentsBase,p_delivery_latitude:coords.latitude,p_delivery_longitude:coords.longitude,
      })
    : await rpc("place_parts_order",argumentsBase);
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
export async function requestRiderDispatch(orderId:string):Promise<{state:string;offerId?:string}> {
  // The function authenticates the seller/buyer, selects only a ranked verified
  // available rider and sends a private pickup offer. Never return customer PII.
  const {data,error}=await client().functions.invoke("parts-rider-dispatch",{body:{orderId}});
  if(error)throw error;
  if(data?.error)throw new Error(String(data.error));
  return {state:String(data?.state??"unknown"),offerId:data?.offerId?String(data.offerId):undefined};
}
export async function readyForRider(id:string) {
  await rpc("mark_parts_ready",{p_order_id:id});
  // The item remains ready even when no riders are online. Dealer can retry
  // from the order screen; the dashboard also retries expired offers.
  try { return await requestRiderDispatch(id); }
  catch(error) {
    console.warn("Order marked ready; rider dispatch unavailable",error);
    return {state:"dispatch_unavailable"};
  }
}
export async function respondToRiderOffer(offerId:string,_orderId:string,accept:boolean) {
  // A rider can decline an offer but is not authorized to dispatch
  // the order to another rider. The dealer can Retry after a decline.
  return rpc("respond_parts_delivery_offer",{
    p_offer_id:offerId,p_accept:accept,
  });
}
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

/** Explicit second leg: called only after the assigned rider confirms pickup. */
export const startRiderCustomerTrip=(id:string)=>
  rpc("start_parts_delivery_trip",{p_order_id:id});

/** Share the Rider's position only while the second leg is active and in foreground. */
export const publishRiderDeliveryLocation=async(id:string,latitude:number,longitude:number):Promise<void>=>{
  const {error}=await client().rpc("publish_parts_rider_position" as never,{
    p_order_id:id,p_latitude:latitude,p_longitude:longitude,
  } as never);
  if(error)throw error;
};
