import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
});
const statuses={
  departed:{title:"Towing agent is on the way",body:"Your recovery agent has started navigating to your breakdown location."},
  arrived:{title:"Your towing agent has arrived",body:"The recovery truck is at your pickup location."},
  en_route:{title:"Your vehicle is being transported",body:"Your vehicle is on the way to the selected destination."},
  completed_by_agent:{title:"Your vehicle has been delivered",body:"The agent reports delivery complete. Open AutoAssist and confirm your vehicle arrived."},
} as const;
type EventName=keyof typeof statuses;
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const endpoint=Deno.env.get("SUPABASE_URL")??"";
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!endpoint||!publicKey||!secret)return json({error:"Notification service unavailable"},503);
  const authorization=req.headers.get("Authorization")??"";
  const client=createClient(endpoint,publicKey,{global:{headers:{Authorization:authorization}}});
  const {data:{user},error:identityError}=await client.auth.getUser();
  if(identityError||!user)return json({error:"Sign in required"},401);
  const body=await req.json().catch(()=>({}));
  const requestId=String(body?.requestId??"");
  const eventName=String(body?.eventName??"") as EventName;
  if(!/^[a-f0-9-]{36}$/i.test(requestId)||!(eventName in statuses))
    return json({error:"Invalid request or status"},400);

  const admin=createClient(endpoint,secret);
  const {data:job,error:jobError}=await admin.from("towing_requests")
    .select("id,agent_id,motorist_id,status,agent_departed_at")
    .eq("id",requestId).maybeSingle();
  if(jobError||!job)return json({error:"Towing request not found"},404);
  if(job.agent_id!==user.id)return json({error:"This towing job is not yours"},403);

  // The server validates the event against the real job, not client input.
  const valid=eventName==="departed"
    ?Boolean(job.agent_departed_at)&&["assigned","arrived","secured","en_route","completed_by_agent","completed"].includes(job.status)
    :eventName==="arrived"
      ?["arrived","secured","en_route","completed_by_agent","completed"].includes(job.status)
      :eventName==="en_route"
        ?["en_route","completed_by_agent","completed"].includes(job.status)
        :["completed_by_agent","completed"].includes(job.status);
  if(!valid)return json({error:"That towing milestone has not been reached"},409);

  const {data:previous}=await admin.from("towing_alert_deliveries")
    .select("request_id").eq("request_id",requestId).eq("event_name",eventName).maybeSingle();
  if(previous)return json({status:"already_sent"});
  const {data:tokens,error:tokenError}=await admin.from("device_push_tokens")
    .select("expo_push_token").eq("user_id",job.motorist_id).eq("enabled",true);
  if(tokenError)return json({error:"Could not read notification devices"},500);
  if(!tokens?.length)return json({status:"no_registered_devices"});

  const messages=tokens.map(token=>({
    to:token.expo_push_token,
    title:statuses[eventName].title,body:statuses[eventName].body,
    sound:"default",channelId:"autoassist-status-v1",
    priority:"high",ttl:3600,
    data:{type:"towing_status",route:"/motorist/tow-assigned",requestId,eventName},
  }));
  let response:Response;
  try{
    response=await fetch("https://exp.host/--/api/v2/push/send",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify(messages),
    });
  }catch(error){
    console.error("Towing status push network error",String(error));
    return json({error:"Push provider temporarily unreachable"},503);
  }
  if(!response.ok)return json({error:"Push provider rejected the alert"},502);
  const tickets=await response.json().catch(()=>({}));
  const receipts=Array.isArray(tickets.data)?tickets.data:[tickets.data];
  const accepted=receipts.some((entry:any)=>entry?.status==="ok"&&entry?.id);
  if(!accepted)return json({error:"No notification was accepted for delivery"},502);
  await admin.from("towing_alert_deliveries").upsert({
    request_id:requestId,event_name:eventName,sent_at:new Date().toISOString(),
  },{onConflict:"request_id,event_name",ignoreDuplicates:true});
  return json({status:"submitted",devices:tokens.length});
});
