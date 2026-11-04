import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
});

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const authorization=req.headers.get("Authorization")??"";
  const endpoint=Deno.env.get("SUPABASE_URL")??"";
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!endpoint||!publicKey||!serviceKey)return json({error:"Dispatch unavailable"},503);
  const caller=createClient(endpoint,publicKey,{global:{headers:{Authorization:authorization}}});
  const {data:auth,error:authError}=await caller.auth.getUser();
  if(authError||!auth.user)return json({error:"Sign in required"},401);
  const body=await req.json().catch(()=>({}));
  const orderId=String(body?.orderId??"");
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(orderId))
    return json({error:"Invalid order ID"},400);

  // Read through caller RLS. Only the shop owner or customer may initiate
  // a dispatch. A rider cannot trigger arbitrarily assigned orders.
  const {data:order,error:orderError}=await caller.from("parts_orders")
    .select("id,motorist_id,shop_id,status,rider_id")
    .eq("id",orderId).maybeSingle();
  if(orderError||!order)return json({error:"Order not found"},404);
  const {data:shop,error:shopError}=await caller.from("parts_shops")
    .select("owner_id,verification_status,is_open")
    .eq("id",order.shop_id).maybeSingle();
  if(shopError||!shop)return json({error:"Shop not found"},404);
  if(auth.user.id!==shop.owner_id&&auth.user.id!==order.motorist_id)
    return json({error:"Not authorized to dispatch this order"},403);
  if(shop.verification_status!=="approved")return json({state:"shop_not_approved"});
  if(order.status!=="ready_for_pickup"||order.rider_id)
    return json({state:"not_ready"});

  const server=createClient(endpoint,serviceKey);
  const {data:result,error:dispatchError}=await server.rpc("create_parts_delivery_offer",{
    p_order_id:orderId,
  });
  if(dispatchError){
    console.error("Rider dispatch error",dispatchError.code??"unknown");
    return json({error:"Unable to dispatch rider offer"},500);
  }
  const state=String(result?.state??"unknown");
  const offerId=typeof result?.offerId==="string"?result.offerId:null;
  const riderId=typeof result?.riderId==="string"?result.riderId:null;
  if(!offerId||!riderId)return json({state});
  // Do not send personal buyer data before the rider accepts.
  if(state==="offered"){
    const {data:tokens}=await server.from("device_push_tokens")
      .select("expo_push_token")
      .eq("user_id",riderId).eq("enabled",true);
    const messages=(tokens??[]).map((token:{expo_push_token:string})=>({
      to:token.expo_push_token,sound:"default",priority:"high",
      channelId:"incoming-requests-v2",ttl:120,
      title:"New spare-parts pickup",
      body:"A verified parts dealer has an order ready for collection.",
      data:{type:"parts_rider_offer",route:"/rider/delivery-offer",
        orderId,offerId},
    }));
    if(messages.length){
      try{
        const reply=await fetch("https://exp.host/--/api/v2/push/send",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify(messages),
        });
        if(reply.ok){
          await server.from("parts_delivery_offers")
            .update({push_sent_at:new Date().toISOString()}).eq("id",offerId);
        }else console.warn("Rider push not delivered",reply.status);
      }catch(error){console.warn("Rider push unavailable",String(error));}
    }
  }
  // The caller receives only the offer ID, not the selected rider's identity.
  return json({state,offerId});
});
