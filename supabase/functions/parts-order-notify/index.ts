import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
});
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return respond({error:"Method not allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")??"";
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  const authorization=req.headers.get("Authorization")??"";
  const caller=createClient(url,publicKey,{global:{headers:{Authorization:authorization}}});
  const {data:session,error:authError}=await caller.auth.getUser();
  if(authError||!session.user)return respond({error:"Sign in required"},401);
  const body=await req.json().catch(()=>({}));
  const orderId=String(body?.orderId??"");
  if(!/^[0-9a-f-]{36}$/i.test(orderId))return respond({error:"Valid orderId required"},400);

  const server=createClient(url,serviceKey);
  const {data:order,error:orderError}=await server.from("parts_orders")
    .select("id,motorist_id,shop_id,part_id,quantity,subtotal_kes,status,notification_sent_at")
    .eq("id",orderId).maybeSingle();
  if(orderError||!order)return respond({error:"Order not found"},404);
  if(order.motorist_id!==session.user.id)return respond({error:"Forbidden"},403);
  if(order.status!=="pending_dealer")return respond({state:order.status});
  if(order.notification_sent_at)return respond({state:"already_sent"});

  const {data:shop}=await server.from("parts_shops")
    .select("owner_id,verification_status,is_open").eq("id",order.shop_id).maybeSingle();
  const {data:item}=await server.from("parts_inventory")
    .select("title").eq("id",order.part_id).maybeSingle();
  if(!shop||shop.verification_status!=="approved"||!shop.is_open)
    return respond({state:"shop_not_available"});
  const {data:updated}=await server.from("parts_orders")
    .update({notification_sent_at:new Date().toISOString()})
    .eq("id",order.id).eq("status","pending_dealer").is("notification_sent_at",null)
    .select("id").maybeSingle();
  if(!updated)return respond({state:"already_sent"});

  const {data:tokens,error:tokensError}=await server.from("device_push_tokens")
    .select("expo_push_token").eq("user_id",shop.owner_id).eq("enabled",true);
  if(tokensError)throw tokensError;
  const deadline=String(Date.now()+120000);
  const title=String(item?.title??"Spare part").slice(0,65);
  const messages=(tokens??[]).flatMap((t:any)=>[
    {to:t.expo_push_token,sound:"default",priority:"high",
      channelId:"incoming-requests-v2",
      title:"New spare-parts order",
      body:title+" × "+order.quantity+" · KES "+Number(order.subtotal_kes).toLocaleString("en-KE"),
      data:{type:"parts_order",route:"/partsdealer/order-details",orderId:order.id}},
    {to:t.expo_push_token,priority:"high",ttl:120,
      data:{type:"parts_order_overlay",recipientId:shop.owner_id,
        offerId:order.id,orderId:order.id,expiresAtMs:deadline,
        symptom:title,
        description:"Quantity "+order.quantity+" · KES "+Number(order.subtotal_kes).toLocaleString("en-KE"),
        locationText:"New customer order",preferredTime:"Respond in AutoAssist"}},
  ]);
  if(!messages.length)return respond({state:"queued_in_app_only"});
  const result=await fetch("https://exp.host/--/api/v2/push/send",{
    method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
    body:JSON.stringify(messages),
  });
  if(!result.ok){console.error("Expo push error",result.status);return respond({state:"push_unavailable"});}
  return respond({state:"sent",deviceCount:(tokens??[]).length});
});
