import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Switch, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Notice, PartsPage, Section, Status, BLUE, NAVY, partStyles } from "@/components/parts-ui";
import { type PartsShop, type PartOrder, type Part, ownShop, shopOrders,
  inventoryFor, updateShop, subscribeShopOrders, money } from "@/services/parts-data";
import { ensureJobNotifications } from "@/services/push-notifications";
import { setFloatingOffersOnline } from "@/services/floating-offers";
import { requestRiderDispatch } from "@/services/parts-orders";

export default function PartsDealerDashboard() {
  const router=useRouter();
  const {user,profile}=useAuth();
  const [shop,setShop]=useState<PartsShop|null>(null);
  const [orders,setOrders]=useState<PartOrder[]>([]);
  const [inventory,setInventory]=useState<Part[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [popup,setPopup]=useState<PartOrder|null>(null);
  const seen=useRef<Set<string>>(new Set());
  const initialized=useRef(false);
  const lastRiderMatching=useRef<Record<string,number>>({});
  const eligible=profile?.role==="partsdealer" ||
    (profile?.role==="mechanic"&&profile?.provider_type==="garage");

  const load=useCallback(async()=>{
    if(!user||!eligible){setLoading(false);return;}
    try{
      const s=await ownShop(user.id);
      setShop(s);
      if(s){
        setFloatingOffersOnline(user.id, s.verification_status==="approved" && s.is_open);
        const [o,i]=await Promise.all([shopOrders(s.id),inventoryFor(s.id)]);
        setOrders(o);setInventory(i);
        // A rider can decline or let an offer expire. Recheck only while the
        // dealer dashboard is open; the backend deduplicates active offers.
        if(s.verification_status==="approved" && s.is_open){
          const now=Date.now();
          for(const order of o.filter(order=>order.status==="ready_for_pickup").slice(0,10)){
            if(now-(lastRiderMatching.current[order.id]??0)<45000)continue;
            lastRiderMatching.current[order.id]=now;
            void requestRiderDispatch(order.id).catch(error=>{
              console.warn("Rider matching retry unavailable",error);
            });
          }
        }
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
    const timer=setInterval(()=>{void load();},12000);
    return()=>{unsub();clearInterval(timer);};
  },[shop?.id,load]);
  useEffect(()=>{
    if(!user||!shop||shop.verification_status!=="approved")return;
    void ensureJobNotifications(user.id).catch(()=>undefined);
  },[user?.id,shop?.id,shop?.verification_status]);

  const toggleOpen=async(v:boolean)=>{
    if(!shop||busy)return;setBusy(true);
    try{const updated=await updateShop(shop.id,{is_open:v});setShop(updated);
      if(user)setFloatingOffersOnline(user.id, updated.verification_status==="approved" && updated.is_open);}
    catch(e){setError(e instanceof Error?e.message:"Unable to change shop availability.");}
    finally{setBusy(false);}
  };
  const pending=orders.filter(x=>x.status==="pending_dealer");
  const ready=orders.filter(x=>["accepted","ready_for_pickup","rider_assigned","picked_up"].includes(x.status));
  const confirmed=orders.filter(x=>x.status==="delivered");
  const due=confirmed.reduce((sum,x)=>sum+Number(x.commission_status==="accrued"?x.commission_kes:0),0);

  return <PartsPage title="Parts Dealer" subtitle={shop?.shop_name||"Store dashboard"}
    settings refresh={()=>void load()} loading={loading}>
    {!eligible?<Notice tone="error">Use your Parts Dealer or verified garage account.</Notice>:
    !shop?<>
      <Notice>Set up your shop before you can offer spare parts on AutoAssist.</Notice>
      <Action label="Register parts shop" icon={{ios:"storefront.fill",android:"storefront",web:"storefront"}}
        onPress={()=>router.push("/partsdealer/registration")}/>
    </>:<>
      <View style={partStyles.card}>
        <View style={[partStyles.row,{justifyContent:"space-between"}]}>
          <View style={{flex:1}}>
            <Text style={partStyles.cardTitle}>{shop.shop_name}</Text>
            <Text style={partStyles.cardText}>{shop.location_text}</Text>
          </View>
          <Status label={shop.verification_status} good={shop.verification_status==="approved"}/>
        </View>
        {shop.verification_status==="rejected"?<Notice tone="error">{shop.verification_note||"Your application needs review."}</Notice>:null}
        {shop.verification_status==="pending"?<Notice>
          Your shop is awaiting administrator approval. You can upload your inventory now, but listings will not be shown to buyers until verification.
        </Notice>:null}
        {shop.verification_status==="approved"?(
          <View style={[partStyles.row,{justifyContent:"space-between",marginTop:16}]}>
            <View style={{flex:1}}>
              <Text style={partStyles.cardTitle}>Accepting new orders</Text>
              <Text style={partStyles.cardText}>Turn off when your store is closed.</Text>
            </View>
            <Switch value={shop.is_open} onValueChange={v=>void toggleOpen(v)}
              disabled={busy} trackColor={{true:"#A8C6F0",false:"#D0D5DD"}} thumbColor={shop.is_open?BLUE:"#FFFFFF"}/>
          </View>
        ):null}
      </View>
      <View style={[partStyles.row,{marginTop:16}]}>
        {[
          ["New orders",pending.length],
          ["In progress",ready.length],
          ["Products",inventory.length],
        ].map(([label,value])=><View key={String(label)} style={[partStyles.card,{flex:1,marginTop:0,padding:12}]}>
          <Text style={partStyles.metric}>{value}</Text>
          <Text style={partStyles.cardText}>{label}</Text>
        </View>)}
      </View>
      <Section title="Manage your business">
        <Action label="View incoming orders" icon={{ios:"bag.fill",android:"shopping_bag",web:"shopping_bag"}}
          onPress={()=>router.push("/partsdealer/orders")}/>
        <Action label="Manage inventory" variant="outline"
          icon={{ios:"shippingbox.fill",android:"inventory_2",web:"inventory_2"}}
          onPress={()=>router.push("/partsdealer/inventory")}/>
        <Action label="Add spare part" variant="outline"
          icon={{ios:"plus.circle",android:"add_circle",web:"add_circle"}}
          onPress={()=>router.push("/partsdealer/add-part")}/>
        <Action label="Store settings" variant="outline"
          onPress={()=>router.push("/partsdealer/store-profile")}/>
      </Section>
      <Section title="Your seller performance">
        <View style={partStyles.card}>
          <Text style={partStyles.cardTitle}>{Number(shop.rating)>0?Number(shop.rating).toFixed(1)+" ★":"Not yet rated"}</Text>
          <Text style={partStyles.cardText}>{shop.reviews_count} customer ratings · {shop.completed_orders} delivered orders</Text>
          <Text style={partStyles.cardText}>Commission accrued, not collected: {money(due)}</Text>
          <Notice>AutoAssist calculates its platform commission only after the motorist confirms delivery. Payment collection and commission settlement are not yet automated.</Notice>
        </View>
      </Section>
      {error?<Notice tone="error">{error}</Notice>:null}
    </>}
    <Modal visible={Boolean(popup)} transparent animationType="fade" onRequestClose={()=>setPopup(null)}>
      <View style={{flex:1,backgroundColor:"#0008",justifyContent:"center",padding:28}}>
        <View style={{backgroundColor:"#FFFFFF",borderRadius:19,padding:24}}>
          <SymbolView name={{ios:"bell.badge.fill",android:"notifications_active",web:"notifications_active"} as never}
            size={34} tintColor={BLUE}/>
          <Text style={{fontFamily:"Inter_600SemiBold",fontSize:20,color:NAVY,marginTop:12}}>New parts order</Text>
          <Text style={{color:"#667085",fontSize:13,marginTop:8}}>
            {popup?.parts_inventory?.title||"An item"} · {popup?money(popup.subtotal_kes):""}
          </Text>
          <Text style={{color:"#667085",fontSize:12,marginTop:5}}>Check the stock before accepting.</Text>
          <Action label="View and respond" onPress={()=>{
            const id=popup?.id;setPopup(null);
            if(id)router.push({pathname:"/partsdealer/order-details",params:{orderId:id}});
          }}/>
          <Action label="Dismiss" variant="outline" onPress={()=>setPopup(null)}/>
        </View>
      </View>
    </Modal>
  </PartsPage>;
}
