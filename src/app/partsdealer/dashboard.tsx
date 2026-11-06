import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Switch, View } from "react-native";
import { AppText as Text } from "@/components/autoassist-font";

import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Status, BLUE, NAVY } from "@/components/parts-ui";
import { type PartsShop, type PartOrder, type Part, ownShop, shopOrders,
  inventoryFor, updateShop, subscribeShopOrders, money } from "@/services/parts-data";
import { ensureJobNotifications } from "@/services/push-notifications";
import { startOfferAlert, stopOfferAlert } from "@/services/offer-attention";
import { setFloatingOffersOnline } from "@/services/floating-offers";

const C={blue:BLUE,navy:NAVY,muted:"#6A7D91",stroke:"#E1E9F2",white:"#FFFFFF",
  mint:"#E9F9F1",green:"#11845B",sky:"#E9F3FF"};
function Glyph({ios,android,size=21,color=BLUE}:{ios:string;android:string;size?:number;color?:string}){
  return <SymbolView name={{ios,android,web:android} as never} size={size} tintColor={color}/>;
}
function Metric({label,value,icon}:{label:string;value:string|number;icon:{ios:string;android:string}}){
  return <View style={styles.metric}>
    <View style={styles.metricIcon}><Glyph {...icon} size={18}/></View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>;
}
const labelStatus=(status:string)=>({
  pending_dealer:"New order",accepted:"Preparing",ready_for_pickup:"Finding rider",
  rider_assigned:"Rider assigned",picked_up:"On the way",delivered:"Delivered",
  declined:"Declined",
} as Record<string,string>)[status]??status.replace(/_/g," ");
export default function PartsDealerDashboard(){
  const router=useRouter(),{user,profile}=useAuth();
  const [shop,setShop]=useState<PartsShop|null>(null);
  const [orders,setOrders]=useState<PartOrder[]>([]);
  const [inventory,setInventory]=useState<Part[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[popup,setPopup]=useState<PartOrder|null>(null);
  const seen=useRef<Set<string>>(new Set()),initialized=useRef(false);
  const eligible=profile?.role==="partsdealer"||
    (profile?.role==="mechanic"&&profile?.provider_type==="garage");
  const load=useCallback(async()=>{
    if(!user||!eligible){setLoading(false);return;}
    try{
      const s=await ownShop(user.id);
      setShop(s);
      if(s){
        setFloatingOffersOnline(user.id,s.verification_status==="approved"&&s.is_open);
        const [o,i]=await Promise.all([shopOrders(s.id),inventoryFor(s.id)]);
        setOrders(o);setInventory(i);
        const pending=o.filter(order=>order.status==="pending_dealer");
        if(!initialized.current){pending.forEach(order=>seen.current.add(order.id));initialized.current=true;}
        else{
          const fresh=pending.find(order=>!seen.current.has(order.id));
          pending.forEach(order=>seen.current.add(order.id));
          if(fresh)setPopup(fresh);
        }
      }
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Could not load your shop.");}
    finally{setLoading(false);}
  },[user?.id,eligible]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  useEffect(()=>{
    if(!shop?.id)return;
    const unsub=subscribeShopOrders(shop.id,()=>{void load();});
    const timer=setInterval(()=>void load(),12000);
    return()=>{unsub();clearInterval(timer);};
  },[shop?.id,load]);
  useEffect(()=>{
    if(!user||!shop||shop.verification_status!=="approved")return;
    void ensureJobNotifications(user.id).catch(()=>undefined);
  },[user?.id,shop?.id,shop?.verification_status]);
  useEffect(()=>{
    if(!popup)return;
    void startOfferAlert(popup.id,"New spare-parts order","A customer order needs your response.");
    return()=>stopOfferAlert(popup.id);
  },[popup?.id]);
  const toggle=async(next:boolean)=>{
    if(!shop||busy)return;setBusy(true);setError("");
    try{
      const s=await updateShop(shop.id,{is_open:next});
      setShop(s);
      if(user)setFloatingOffersOnline(user.id,s.verification_status==="approved"&&s.is_open);
    }catch(e){setError(e instanceof Error?e.message:"Unable to change shop availability.");}
    finally{setBusy(false);}
  };
  const resubmit=async()=>{
    if(!shop||busy)return;setBusy(true);setError("");
    try{
      const {error:e}=await (await import("@/lib/supabase")).requireSupabase()
        .rpc("resubmit_parts_shop_application" as never,{p_shop_id:shop.id} as never);
      if(e)throw e;
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Unable to resubmit shop.");}
    finally{setBusy(false);}
  };
  const waiting=orders.filter(x=>x.status==="pending_dealer");
  const ongoing=orders.filter(x=>["accepted","ready_for_pickup","rider_assigned","picked_up"].includes(x.status));
  const completed=orders.filter(x=>x.status==="delivered");
  const revenue=completed.reduce((sum,x)=>sum+Number(x.subtotal_kes),0);
  const commissionDue=completed.reduce((sum,x)=>sum+Number(x.commission_status==="accrued"?x.commission_kes:0),0);
  const openOrder=(id:string)=>router.push({pathname:"/partsdealer/order-details",params:{orderId:id}});
  const shortcuts=[
    {title:"Orders",detail:"Manage requests",ios:"bag.fill",android:"shopping_bag",route:"/partsdealer/orders"},
    {title:"Inventory",detail:"Parts and stock",ios:"shippingbox.fill",android:"inventory_2",route:"/partsdealer/inventory"},
    {title:"Add item",detail:"List new stock",ios:"plus.circle.fill",android:"add_circle",route:"/partsdealer/add-part"},
    {title:"My shop",detail:"Store settings",ios:"storefront.fill",android:"storefront",route:"/partsdealer/store-profile"},
  ];
  return <PartsPage title="Dealer workspace" subtitle="AutoAssist parts marketplace"
    settings loading={loading&&!shop} refresh={()=>void load()}>
    {!eligible?<Notice tone="error">Use a Parts Dealer or approved garage account.</Notice>:
    !shop?<View style={styles.emptyCard}>
      <View style={styles.emptyIcon}><Glyph ios="storefront.fill" android="storefront" size={32}/></View>
      <Text style={styles.emptyTitle}>Create your parts business</Text>
      <Text style={styles.emptyDescription}>Register a store and get verified to reach AutoAssist motorists.</Text>
      <Action label="Register my store" onPress={()=>router.push("/partsdealer/registration")}/>
    </View>:<>
      <View style={styles.welcome}>
        <View style={{flex:1}}>
          <Text style={styles.eyebrow}>YOUR BUSINESS TODAY</Text>
          <Text style={styles.welcomeTitle}>{shop.shop_name}</Text>
          <Text style={styles.welcomeSubtitle} numberOfLines={2}>{shop.location_text}</Text>
        </View>
        <View style={styles.welcomeAvatar}><Glyph ios="storefront.fill" android="storefront" size={25}/></View>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Glyph ios="bag.fill" android="shopping_bag"
            color={C.white} size={25}/></View>
          <View style={[styles.heroBadge,{backgroundColor:shop.verification_status==="approved"
            ?shop.is_open?"#165D52":"#31556F":"#594A38"}]}>
            <Text style={styles.heroBadgeText}>
              {shop.verification_status!=="approved"?"● VERIFICATION "+shop.verification_status.toUpperCase()
                :shop.is_open?"● SHOP OPEN":"○ SHOP CLOSED"}
            </Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>
          {shop.verification_status!=="approved"?"Your store is almost ready":
            shop.is_open?"Ready to make a sale?":"Your store is taking a break"}
        </Text>
        <Text style={styles.heroDescription}>
          {shop.verification_status==="rejected"?"Review the application feedback and resubmit.":
          shop.verification_status==="pending"?"Once approved, buyers can order the parts you list.":
          shop.is_open?"New orders appear here. Confirm stock, pack the item, and dispatch a rider.":
          "Go online to make your inventory visible to buyers again."}
        </Text>
        {shop.verification_status==="approved"?<View style={styles.switchRow}>
          <View style={{flex:1}}>
            <Text style={styles.switchTitle}>Accepting new orders</Text>
            <Text style={styles.switchSubtitle}>{shop.is_open?"Store online":"Store offline"}</Text>
          </View>
          <Switch value={shop.is_open} disabled={busy} onValueChange={v=>void toggle(v)}
            trackColor={{true:"#B0E7D0",false:"#D4DCE7"}}
            thumbColor={shop.is_open?"#108B64":"#FFFFFF"}/>
        </View>:null}
      </View>
      {shop.verification_status==="rejected"?<>
        <Notice tone="error">{shop.verification_note||"Your shop needs corrections before approval."}</Notice>
        <Action label="Update shop application" variant="outline" onPress={()=>router.push("/partsdealer/store-profile")}/>
        <Action label="Resubmit for verification" busy={busy} onPress={()=>void resubmit()}/>
      </>:shop.verification_status==="pending"?<Notice>
        Your business verification is pending. You may prepare inventory meanwhile.
      </Notice>:null}
      <View style={styles.metrics}>
        <Metric label="New orders" value={waiting.length}
          icon={{ios:"bell.badge.fill",android:"notifications_active"}}/>
        <Metric label="In progress" value={ongoing.length}
          icon={{ios:"shippingbox.fill",android:"local_shipping"}}/>
        <Metric label="Products" value={inventory.length}
          icon={{ios:"square.stack.3d.up.fill",android:"inventory_2"}}/>
      </View>
      <View style={styles.sectionHeading}>
        <Text style={styles.heading}>Manage your shop</Text>
        <Text style={styles.sectionHint}>Quick access</Text>
      </View>
      <View style={styles.quickGrid}>
        {shortcuts.map(x=><Pressable key={x.title} accessibilityRole="button"
          onPress={()=>router.push(x.route as never)}
          style={({pressed})=>[styles.shortcut,pressed&&{opacity:0.82}]}>
          <View style={styles.shortcutIcon}><Glyph ios={x.ios} android={x.android} size={21}/></View>
          <Text style={styles.shortcutTitle}>{x.title}</Text>
          <Text style={styles.shortcutDetail}>{x.detail}</Text>
        </Pressable>)}
      </View>
      <View style={styles.sectionHeading}>
        <Text style={styles.heading}>Orders that need you</Text>
        <Pressable accessibilityRole="button" onPress={()=>router.push("/partsdealer/orders")}>
          <Text style={styles.link}>View all</Text>
        </Pressable>
      </View>
      {[...waiting,...ongoing].slice(0,4).length?
        [...waiting,...ongoing].slice(0,4).map(o=><Pressable key={o.id} style={styles.orderCard}
          accessibilityRole="button" onPress={()=>openOrder(o.id)}>
          <View style={styles.orderHeader}>
            <View style={[styles.orderPill,{backgroundColor:o.status==="pending_dealer"?C.mint:C.sky}]}>
              <Text style={[styles.orderPillText,{color:o.status==="pending_dealer"?C.green:BLUE}]}>
                {labelStatus(o.status)}
              </Text>
            </View>
            <Glyph ios="arrow.up.right" android="arrow_forward" size={20}/>
          </View>
          <Text style={styles.orderTitle}>{o.parts_inventory?.title||"Spare part"}</Text>
          <Text style={styles.orderDetail}>{o.quantity} unit(s) · {money(o.subtotal_kes)}</Text>
          <Text style={styles.orderDetail} numberOfLines={1}>To: {o.delivery_location}</Text>
          <Text style={styles.orderLink}>Open order →</Text>
        </Pressable>):<View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Glyph ios="tray" android="inbox" size={27}/></View>
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptyDescription}>New orders and active deliveries will appear here.</Text>
        </View>}
      <View style={styles.sectionHeading}><Text style={styles.heading}>Business overview</Text></View>
      <View style={styles.revenue}>
        <View style={styles.financeRow}><Text style={styles.financeLabel}>Completed sales</Text>
          <Text style={styles.financeValue}>{money(revenue)}</Text></View>
        <View style={styles.financeRow}><Text style={styles.financeLabel}>Delivered orders</Text>
          <Text style={styles.financeValue}>{completed.length}</Text></View>
        <View style={styles.financeRow}><Text style={styles.financeLabel}>Recorded platform commission due</Text>
          <Text style={[styles.financeValue,{color:"#9A6013"}]}>{money(commissionDue)}</Text></View>
        <Text style={styles.fine}>Pilot: AutoAssist does not yet collect the customer's payment or automatically deduct commission. Recorded sales are not verified cash receipts.</Text>
      </View>
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
    <Modal visible={Boolean(popup)} transparent animationType="fade" onRequestClose={()=>setPopup(null)}>
      <View style={styles.overlay}><View style={styles.modal}>
        <View style={styles.modalIcon}><Glyph ios="bell.badge.fill" android="notifications_active"
          color="#FFFFFF" size={27}/></View>
        <Text style={styles.eyebrow}>NEW CUSTOMER ORDER</Text>
        <Text style={styles.modalTitle}>You've received a parts request</Text>
        <Text style={styles.orderDetail}>{popup?.parts_inventory?.title||"Spare part"} ·
          {" "}{popup?money(popup.subtotal_kes):""}</Text>
        <Notice>Check the item and stock before accepting.</Notice>
        <Action label="View and respond" onPress={()=>{
          const id=popup?.id;setPopup(null);if(id)openOrder(id);
        }}/>
        <Action label="Dismiss" variant="outline" onPress={()=>setPopup(null)}/>
      </View></View>
    </Modal>
  </PartsPage>;
}
const styles=StyleSheet.create({
 eyebrow:{fontSize:10,fontFamily:"Inter_600SemiBold",color:BLUE,letterSpacing:1.1},
 welcome:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:18},
 welcomeTitle:{color:NAVY,fontSize:22,fontFamily:"Inter_600SemiBold",marginTop:5},
 welcomeSubtitle:{color:C.muted,fontSize:11,marginTop:5},
 welcomeAvatar:{width:49,height:49,backgroundColor:C.sky,borderRadius:16,
  alignItems:"center",justifyContent:"center"},
 hero:{backgroundColor:NAVY,borderRadius:23,padding:21},
 heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},
 heroIcon:{width:47,height:47,borderRadius:15,backgroundColor:"#286AA7",
  alignItems:"center",justifyContent:"center"},
 heroBadge:{paddingHorizontal:10,paddingVertical:8,borderRadius:20},
 heroBadgeText:{fontFamily:"Inter_600SemiBold",color:C.white,fontSize:10},
 heroTitle:{fontFamily:"Inter_600SemiBold",color:C.white,fontSize:21,marginTop:19},
 heroDescription:{color:"#C7DBED",fontSize:12,lineHeight:19,marginTop:8},
 switchRow:{flexDirection:"row",backgroundColor:C.white,borderRadius:15,padding:14,
  alignItems:"center",marginTop:19},
 switchTitle:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:13},
 switchSubtitle:{color:C.muted,fontSize:11,marginTop:4},
 metrics:{flexDirection:"row",gap:9,marginTop:18},
 metric:{flex:1,backgroundColor:C.white,borderRadius:16,borderWidth:1,
  borderColor:C.stroke,paddingHorizontal:12,paddingVertical:14},
 metricIcon:{height:34,width:34,borderRadius:11,backgroundColor:C.sky,
  justifyContent:"center",alignItems:"center"},
 metricValue:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:25,marginTop:11},
 metricLabel:{color:C.muted,fontSize:11,marginTop:5},
 sectionHeading:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",
  marginTop:28,marginBottom:12},
 heading:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:18},
 sectionHint:{color:C.muted,fontSize:11},
 link:{fontFamily:"Inter_600SemiBold",color:BLUE,fontSize:13},
 quickGrid:{flexDirection:"row",flexWrap:"wrap",gap:11},
 shortcut:{width:"48%",backgroundColor:C.white,borderRadius:17,borderWidth:1,
  borderColor:C.stroke,padding:16,minHeight:129},
 shortcutIcon:{width:39,height:39,borderRadius:12,backgroundColor:C.sky,
  alignItems:"center",justifyContent:"center"},
 shortcutTitle:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:14,marginTop:11},
 shortcutDetail:{fontSize:11,color:C.muted,marginTop:5},
 orderCard:{borderRadius:17,backgroundColor:C.white,padding:17,
  borderWidth:1,borderColor:C.stroke,marginBottom:11},
 orderHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 orderPill:{borderRadius:8,paddingVertical:7,paddingHorizontal:10},
 orderPillText:{fontFamily:"Inter_600SemiBold",fontSize:10},
 orderTitle:{fontFamily:"Inter_600SemiBold",fontSize:16,color:NAVY,marginTop:14},
 orderDetail:{color:C.muted,fontSize:12,lineHeight:19,marginTop:7},
 orderLink:{color:BLUE,fontFamily:"Inter_600SemiBold",fontSize:12,marginTop:13},
 emptyCard:{backgroundColor:C.white,borderWidth:1,borderColor:C.stroke,
  borderRadius:18,padding:24,alignItems:"center",marginTop:12},
 emptyIcon:{backgroundColor:C.sky,height:52,width:52,borderRadius:16,
  justifyContent:"center",alignItems:"center"},
 emptyTitle:{fontFamily:"Inter_600SemiBold",fontSize:15,color:NAVY,marginTop:14},
 emptyDescription:{fontSize:12,color:C.muted,lineHeight:19,marginTop:7,textAlign:"center"},
 revenue:{backgroundColor:C.white,borderWidth:1,borderColor:C.stroke,borderRadius:17,padding:18},
 financeRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:9,marginBottom:17},
 financeLabel:{color:C.muted,fontSize:11,flex:1},
 financeValue:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:13},
 fine:{color:"#8190A4",fontSize:10,lineHeight:18,borderTopWidth:1,
  borderColor:C.stroke,paddingTop:13},
 overlay:{flex:1,backgroundColor:"#0B2138CC",justifyContent:"center",padding:22},
 modal:{backgroundColor:C.white,borderRadius:22,padding:22},
 modalIcon:{width:53,height:53,borderRadius:16,backgroundColor:BLUE,
  alignItems:"center",justifyContent:"center",marginBottom:17},
 modalTitle:{fontFamily:"Inter_600SemiBold",color:NAVY,fontSize:21,marginTop:8},
});
