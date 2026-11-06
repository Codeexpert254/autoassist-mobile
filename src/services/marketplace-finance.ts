import { requireSupabase } from "@/lib/supabase";

export type EarningsRole = "partsdealer"|"towing"|"rider";
export type FinanceLine = {
  id:string; reference:string; date:string; status:string;
  grossKes:number; commissionKes:number; riderKes:number; providerKes:number;
  paymentVerified:boolean; description:string;
};
export type FinanceSummary = {
  role:EarningsRole; lines:FinanceLine[]; grossKes:number;
  commissionKes:number; riderKes:number; providerKes:number;
  verifiedKes:number; pendingKes:number; paidOutKes:number;
  collectionEnabled:boolean; payoutsEnabled:boolean;
};
export const formatKes=(amount:number)=>"KES "+Math.round(amount).toLocaleString("en-KE");

/** Pilot tariff only: 150 KES pickup + 35 KES/km, no rider commission.
 * Geographic distance is an approximation; neither cash nor payouts are handled here.
 */
export function riderFareEstimate(
  shopLat:number|null|undefined,shopLon:number|null|undefined,
  customerLat:number|null|undefined,customerLon:number|null|undefined,
  baseKes=150,perKmKes=35,
):number|null{
  if(![shopLat,shopLon,customerLat,customerLon].every(x=>typeof x==="number"&&Number.isFinite(x)))return null;
  const r=Math.PI/180,lat1=Number(shopLat)*r,lat2=Number(customerLat)*r;
  const dLat=lat2-lat1,dLon=(Number(customerLon)-Number(shopLon))*r;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  const km=Math.max(1,6371*2*Math.asin(Math.min(1,Math.sqrt(a)))*1.35);
  return Math.ceil((baseKes+perKmKes*km)/10)*10;
}

type PartOrderRow={
 id:string;status:string;created_at:string;subtotal_kes:number|string;
 commission_kes:number|string;payment_status?:string|null;
 parts_shops?:{shop_name?:string;latitude?:number|null;longitude?:number|null}|null;
 delivery_latitude?:number|null;delivery_longitude?:number|null;
};
type TowRow={id:string;status:string;created_at:string;quote_kes:number|null;vehicle_registration:string};
function sum(rows:FinanceLine[],key:"grossKes"|"commissionKes"|"riderKes"|"providerKes"){
 return rows.reduce((value,row)=>value+row[key],0);
}
export async function getMarketplaceEarnings(role:EarningsRole,userId:string):Promise<FinanceSummary>{
  const db=requireSupabase();
  const lines:FinanceLine[]=[];
  const {data:policy,error:policyError}=await db.from("marketplace_fee_policy" as never)
    .select("parts_percent,towing_percent,rider_percent,rider_base_kes,rider_per_km_kes,collection_enabled,payouts_enabled")
    .eq("key","pilot").maybeSingle();
  if(policyError)throw policyError;
  const fees=(policy??{}) as {
    towing_percent?:number;rider_base_kes?:number;rider_per_km_kes?:number;
    collection_enabled?:boolean;payouts_enabled?:boolean;
  };
  const collectionEnabled=Boolean(fees.collection_enabled);
  const payoutsEnabled=Boolean(fees.payouts_enabled);
  if(role==="towing"){
    const {data,error}=await db.from("towing_requests" as never)
      .select("id,status,created_at,quote_kes,vehicle_registration")
      .eq("agent_id",userId).order("created_at",{ascending:false}).limit(100);
    if(error)throw error;
    for(const item of (data??[]) as TowRow[]){
      if(item.status==="cancelled")continue;
      const gross=Number(item.quote_kes??0);
      const commission=Math.round(gross*Number(fees.towing_percent??10)/100);
      lines.push({
        id:item.id,reference:item.id.slice(0,8).toUpperCase(),date:item.created_at,
        status:item.status,grossKes:gross,commissionKes:commission,riderKes:0,
        providerKes:gross-commission,paymentVerified:false,
        description:`Recovery · ${item.vehicle_registration||"Towing service"}`,
      });
    }
  }else{
    let query=db.from("parts_orders" as never)
      .select("id,status,created_at,subtotal_kes,commission_kes,payment_status,delivery_latitude,delivery_longitude,parts_shops(shop_name,latitude,longitude)")
      .order("created_at",{ascending:false}).limit(100);
    if(role==="rider")query=query.eq("rider_id",userId);
    else{
      const {data:shops,error:shopError}=await db.from("parts_shops" as never)
        .select("id").eq("owner_id",userId);
      if(shopError)throw shopError;
      const ids=((shops??[]) as {id:string}[]).map(s=>s.id);
      if(!ids.length)return {role,lines,grossKes:0,commissionKes:0,riderKes:0,
        providerKes:0,verifiedKes:0,pendingKes:0,paidOutKes:0,
        collectionEnabled,payoutsEnabled};
      query=query.in("shop_id",ids);
    }
    const {data,error}=await query;
    if(error)throw error;
    for(const item of (data??[]) as PartOrderRow[]){
      if(item.status==="declined")continue;
      const partPrice=Number(item.subtotal_kes)||0;
      const commission=Number(item.commission_kes)||0;
      const fare=riderFareEstimate(item.parts_shops?.latitude,item.parts_shops?.longitude,
        item.delivery_latitude,item.delivery_longitude,
        Number(fees.rider_base_kes??150),Number(fees.rider_per_km_kes??35));
      const riderAmount=fare??0;
      // "completed" is not evidence of payment. No genuine delivery-fee charge exists yet.
      lines.push({
        id:item.id,reference:item.id.slice(0,8).toUpperCase(),date:item.created_at,
        status:item.status,grossKes:role==="rider"?riderAmount:partPrice,
        commissionKes:role==="rider"?0:commission,
        riderKes:riderAmount,
        providerKes:role==="rider"?riderAmount:partPrice-commission,
        paymentVerified:false,
        description:role==="rider"?"Parts delivery · indicative fare":item.parts_shops?.shop_name||"Spare-parts order",
      });
    }
  }
  // Financial records are backend-writable only. Completion does not imply payment.
  const [{data:payments,error:paymentError},{data:payouts,error:payoutError}]=await Promise.all([
    db.from("marketplace_payments" as never)
      .select("origin_kind,origin_id,status,verified_at")
      .in("origin_id",lines.length?lines.map(line=>line.id):["00000000-0000-0000-0000-000000000000"]),
    db.from("marketplace_payouts" as never)
      .select("amount_kes,status,beneficiary_role").eq("beneficiary_id",userId),
  ]);
  if(paymentError)throw paymentError;
  if(payoutError)throw payoutError;
  const verifiedOrigins=new Set(((payments??[]) as {
    origin_kind:string;origin_id:string;status:string;verified_at:string|null;
  }[]).filter(p=>p.status==="paid"&&Boolean(p.verified_at))
    .map(p=>p.origin_id));
  lines.forEach(line=>{line.paymentVerified=verifiedOrigins.has(line.id);});
  const paidOutKes=((payouts??[]) as {status:string;amount_kes:number|string}[])
    .filter(p=>p.status==="paid")
    .reduce((value,p)=>value+Number(p.amount_kes),0);
  return {role,lines,grossKes:sum(lines,"grossKes"),commissionKes:sum(lines,"commissionKes"),
    riderKes:sum(lines,"riderKes"),providerKes:sum(lines,"providerKes"),
    verifiedKes:lines.filter(line=>line.paymentVerified)
      .reduce((value,line)=>value+line.providerKes,0),
    pendingKes:lines.filter(line=>!line.paymentVerified)
      .reduce((value,line)=>value+line.providerKes,0),
    paidOutKes,collectionEnabled,payoutsEnabled};
}
