import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type",
  "Access-Control-Allow-Methods":"OPTIONS,POST",
};
const respond=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{
  status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"},
});
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return respond({error:"Method not allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")??"";
  const anon=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!url||!anon||!serviceRole)return respond({error:"Service unavailable"},503);
  const authorization=req.headers.get("Authorization")??"";
  if(!authorization.startsWith("Bearer "))return respond({error:"Sign in required"},401);
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const {data:auth,error:authError}=await caller.auth.getUser();
  if(authError||!auth.user)return respond({error:"Unauthorized"},401);
  const admin=createClient(url,serviceRole);
  const {data:role,error:roleError}=await admin.rpc("get_autoassist_admin_role",{p_user_id:auth.user.id});
  if(roleError)return respond({error:"Unable to check admin role"},500);
  if(role!=="super_admin")return respond({error:"Super-admin access required"},403);
  const [fees,payments,payouts,entries]=await Promise.all([
    admin.from("marketplace_fee_policy").select("*").eq("key","pilot").maybeSingle(),
    admin.from("marketplace_payments")
      .select("id,origin_kind,origin_id,amount_kes,commission_kes,delivery_fee_kes,status,provider,verified_at,created_at")
      .order("created_at",{ascending:false}).limit(100),
    admin.from("marketplace_payouts")
      .select("id,payment_id,beneficiary_role,amount_kes,status,paid_at,created_at")
      .order("created_at",{ascending:false}).limit(100),
    admin.from("marketplace_ledger_entries")
      .select("id,event_key,entry_kind,amount_kes,direction,created_at")
      .order("created_at",{ascending:false}).limit(100),
  ]);
  const error=fees.error||payments.error||payouts.error||entries.error;
  if(error)return respond({error:error.message},500);
  const rows=payments.data??[];
  const realPaid=rows.filter(p=>p.status==="paid"&&Boolean(p.verified_at)&&p.provider!=="sandbox_simulator");
  const paidOut=(payouts.data??[]).filter(p=>p.status==="paid");
  return respond({
    policy:fees.data,
    summary:{
      paymentCount:rows.length,
      verifiedPaymentCount:realPaid.length,
      confirmedGrossKes:realPaid.reduce((s,p)=>s+Number(p.amount_kes),0),
      recordedCommissionKes:realPaid.reduce((s,p)=>s+Number(p.commission_kes),0),
      actualPayoutKes:paidOut.reduce((s,p)=>s+Number(p.amount_kes),0),
      pendingPayoutCount:(payouts.data??[]).filter(p=>["pending","processing"].includes(p.status)).length,
    },
    payments:rows,
    payouts:payouts.data??[],
    ledger:entries.data??[],
    moneyMovementEnabled:Boolean(fees.data?.collection_enabled&&fees.data?.payouts_enabled),
  });
});
