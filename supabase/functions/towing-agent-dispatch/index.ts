import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const reply=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{
  status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
});
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return reply({error:"Method not allowed"},405);
  const authHeader=req.headers.get("Authorization")??"";
  const endpoint=Deno.env.get("SUPABASE_URL")??"";
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!endpoint||!publicKey||!secret)return reply({error:"Dispatch unavailable"},503);
  const caller=createClient(endpoint,publicKey,{
    global:{headers:{Authorization:authHeader}},
  });
  const {data:identity,error:identityError}=await caller.auth.getUser();
  if(identityError||!identity.user)return reply({error:"Sign in required"},401);
  const body=await req.json().catch(()=>({}));
  const requestId=String(body?.requestId??"");
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId))
    return reply({error:"Invalid request ID"},400);
  // The owner is validated through the caller's RLS. A towing agent may not
  // match itself or query another Motorist's private request.
  const {data:request,error:requestError}=await caller.from("towing_requests")
    .select("id,motorist_id,status").eq("id",requestId).maybeSingle();
  if(requestError||!request)return reply({error:"Request not found"},404);
  if(request.motorist_id!==identity.user.id)return reply({error:"Not authorized"},403);
  if(request.status!=="searching")return reply({state:"not_searching"});

  const server=createClient(endpoint,secret);
  const {data:match,error:dispatchError}=await server.rpc("match_towing_agent",{
    p_request_id:requestId,
  });
  if(dispatchError){
    console.error("Towing matching failed",dispatchError.code??"unknown");
    return reply({error:"Unable to dispatch towing request"},500);
  }
  const state=String(match?.state??"unknown");
  const offerId=typeof match?.offerId==="string"?match.offerId:"";
  const agentId=typeof match?.agentId==="string"?match.agentId:"";
  if(!agentId||!offerId)return reply({state});

  if(state==="offered"){
    const {data:tokens}=await server.from("device_push_tokens")
      .select("expo_push_token").eq("user_id",agentId).eq("enabled",true);
    const messages=(tokens??[]).map((t:{expo_push_token:string})=>({
      to:t.expo_push_token,sound:"default",priority:"high",
      channelId:"incoming-requests-v2",ttl:120,
      title:"New AutoAssist towing request",
      body:"A Motorist needs roadside towing. Open AutoAssist to review the offer.",
      data:{type:"towing_offer",route:"/towing/tow-offer",requestId,offerId},
    }));
    if(messages.length){
      try{
        const response=await fetch("https://exp.host/--/api/v2/push/send",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify(messages),
        });
        if(response.ok){
          await server.from("towing_offers").update({push_sent_at:new Date().toISOString()})
            .eq("id",offerId);
        }else console.warn("Towing notification delivery provider error",response.status);
      }catch(error){console.warn("Towing push unavailable",String(error));}
    }
  }
  return reply({state,offerId});
});
