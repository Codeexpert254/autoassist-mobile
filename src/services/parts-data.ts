import { requireSupabase } from "@/lib/supabase";

export type PartsShop = {
  id: string; owner_id: string; shop_name: string; phone: string; location_text: string;
  latitude: number | null; longitude: number | null;
  description: string; business_reg_number: string | null; seller_kind: "partsdealer" | "garage";
  verification_status: "pending" | "approved" | "rejected";
  verification_note: string | null; is_open: boolean;
  rating: number; reviews_count: number; completed_orders: number;
};
export type PartPhoto = { id: string; part_id: string; storage_path: string; sort_index: number };
export type Part = {
  id: string; shop_id: string; title: string; description: string; category: string;
  compatibility: string; part_number: string; part_condition: "New" | "Refurbished" | "Used";
  price_kes: number; stock_quantity: number; is_listed: boolean;
  parts_shops?: PartsShop; parts_inventory_images?: PartPhoto[];
};
export type PartOrder = {
  id: string; motorist_id: string; shop_id: string; part_id: string; rider_id: string | null;
  repair_request_id: string | null; quantity: number; unit_price_kes: number; subtotal_kes: number;
  commission_percent: number; commission_kes: number; delivery_location: string;
  delivery_latitude: number | null; delivery_longitude: number | null;
  delivery_started_at: string | null; rider_latitude: number | null;
  rider_longitude: number | null; rider_location_updated_at: string | null;
  delivery_phone: string; note: string; status: string; decline_reason: string | null;
  payment_method: string; payment_status: string; commission_status: string; created_at: string;
  parts_inventory?: Part; parts_shops?: PartsShop;
};
const client = () => requireSupabase();
const t = (name: string) => client().from(name as never) as any;
const check = (error: any) => {
  if (!error) return;
  const message=typeof error?.message==="string" ? error.message : "Marketplace request failed.";
  const code=typeof error?.code==="string" ? " ("+error.code+")" : "";
  throw new Error(message+code);
};
export const money = (n: number | string) => "KES " + Number(n || 0).toLocaleString("en-KE");
export const conditions: Part["part_condition"][] = ["New", "Refurbished", "Used"];
export const partCategories = ["Brakes","Engine","Electrical","Suspension","Transmission",
  "Tyres & Wheels","Filters","Body & Lights","Other"];
export const imageUrl = (path: string | null | undefined) => path
  ? client().storage.from("parts-inventory").getPublicUrl(path).data.publicUrl : null;

export async function ownShop(userId: string): Promise<PartsShop | null> {
  const { data, error } = await t("parts_shops").select("*").eq("owner_id", userId).maybeSingle();
  check(error); return data;
}
export async function applyForShop(userId: string, fields: {
  shop_name: string; phone: string; location_text: string;
  description: string; business_reg_number: string;
  latitude?: number | null; longitude?: number | null;
}): Promise<PartsShop> {
  const { data, error } = await t("parts_shops").insert({ owner_id: userId, ...fields }).select("*").single();
  check(error); return data;
}
export async function updateShop(id: string, fields: Partial<Pick<PartsShop,
 "shop_name" | "phone" | "location_text" | "latitude" | "longitude" | "description" | "business_reg_number" | "is_open">>):
 Promise<PartsShop> {
  const { data, error } = await t("parts_shops").update(fields).eq("id",id).select("*").single();
  check(error);return data;
}
export async function inventoryFor(shopId: string): Promise<Part[]> {
  const { data,error } = await t("parts_inventory").select("*,parts_inventory_images(*)")
    .eq("shop_id",shopId).order("created_at",{ascending:false});
  check(error);return data ?? [];
}
export async function saveInventory(shopId: string, fields: {
  title: string; description: string; category: string; compatibility: string;
  part_number: string; part_condition: Part["part_condition"]; price_kes: number;
  stock_quantity: number; is_listed: boolean;
}, partId?: string): Promise<Part> {
  if (!Number.isFinite(fields.price_kes) || fields.price_kes<=0) throw new Error("Enter a positive price.");
  if (!Number.isInteger(fields.stock_quantity) || fields.stock_quantity<0) throw new Error("Enter a valid stock quantity.");
  const action=partId?t("parts_inventory").update(fields).eq("id",partId).eq("shop_id",shopId):
    t("parts_inventory").insert({...fields,shop_id:shopId});
  const {data,error}=await action.select("*").single();check(error);return data;
}
export async function changeStock(partId: string,qty: number) {
  if (!Number.isInteger(qty)||qty<0) throw new Error("Stock must be zero or more.");
  const {error}=await t("parts_inventory").update({stock_quantity:qty}).eq("id",partId);
  check(error);
}
export async function findParts(search="",condition="All"): Promise<Part[]> {
  let query=t("parts_inventory").select(
    "*,parts_shops(id,shop_name,owner_id,phone,location_text,latitude,longitude,rating,reviews_count,verification_status,is_open),parts_inventory_images(*)"
  ).eq("is_listed",true).gt("stock_quantity",0).limit(150);
  if(search.trim())query=query.ilike("title","%"+search.trim().slice(0,75)+"%");
  if(condition!=="All")query=query.eq("part_condition",condition);
  const {data,error}=await query;check(error);
  return ((data??[]) as Part[]).filter(p=>p.parts_shops?.verification_status==="approved"&&p.parts_shops?.is_open)
    .sort((a,b)=>{
      const score=(p:Part)=>{const n=Number(p.parts_shops?.reviews_count??0);
        return (Number(p.parts_shops?.rating??0)*n+4.2*8)/(n+8);};
      return score(b)-score(a);
    });
}
export async function partDetails(id:string): Promise<Part> {
  const {data,error}=await t("parts_inventory").select(
    "*,parts_shops(id,shop_name,owner_id,phone,location_text,latitude,longitude,rating,reviews_count,verification_status,is_open),parts_inventory_images(*)"
  ).eq("id",id).single();check(error);
  if(data?.parts_shops?.verification_status!=="approved")throw new Error("This seller is not approved.");
  return data;
}
export async function shopOrders(shopId:string): Promise<PartOrder[]> {
  const {data,error}=await t("parts_orders").select(
    "*,parts_inventory(title,part_condition,price_kes),parts_shops(shop_name,phone,location_text,latitude,longitude,owner_id)"
  ).eq("shop_id",shopId).order("created_at",{ascending:false});check(error);return data??[];
}
export async function buyerOrders(userId:string): Promise<PartOrder[]> {
  const {data,error}=await t("parts_orders").select(
    "*,parts_inventory(title,part_condition,price_kes),parts_shops(shop_name,phone,location_text,latitude,longitude,owner_id)"
  ).eq("motorist_id",userId).order("created_at",{ascending:false});check(error);return data??[];
}
export async function oneOrder(id:string): Promise<PartOrder> {
  const {data,error}=await t("parts_orders").select(
    "*,parts_inventory(title,part_condition,price_kes),parts_shops(shop_name,phone,location_text,latitude,longitude,owner_id)"
  ).eq("id",id).single();check(error);return data;
}
export function subscribeShopOrders(shopId:string,onChange:()=>void) {
  const c=client();const ch=c.channel("shop-orders:"+shopId+":"+Date.now())
    .on("postgres_changes",{event:"*",schema:"public",table:"parts_orders",filter:"shop_id=eq."+shopId},onChange)
    .subscribe();
  return ()=>{void c.removeChannel(ch);};
}
