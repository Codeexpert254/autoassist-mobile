import * as Location from "expo-location";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/auth-context";
import { PartsTripGuide } from "@/components/parts-trip-guide";
import { validPartsCoordinate, type PartsCoordinate } from "@/components/parts-location-picker";
import { Action, Notice, PartsPage, Status, partStyles, BLUE, NAVY } from "@/components/parts-ui";
import { type PartOrder, oneOrder } from "@/services/parts-data";
import { riderPickedUp, startRiderCustomerTrip, publishRiderDeliveryLocation } from "@/services/parts-orders";

function contact(kind:"call"|"sms",phone?:string|null){
  const clean=String(phone??"").replace(/[^0-9+]/g,"");
  if(clean.length<7)return;
  void Linking.openURL((kind==="call"?"tel:":"sms:")+clean).catch(()=>undefined);
}

function ContactAction({kind,phone,label}:{
  kind:"call"|"sms";phone?:string|null;label:string;
}){
  return <Pressable style={[styles.contactButton,!phone&&{opacity:0.45}]}
    accessibilityRole="button" accessibilityLabel={label} disabled={!phone}
    onPress={()=>contact(kind,phone)}>
    <SymbolView
      name={{ios:kind==="call"?"phone.fill":"message.fill",
        android:kind==="call"?"call":"sms",web:kind==="call"?"call":"sms"} as never}
      size={19} tintColor={BLUE}/>
    <Text style={styles.contactText}>{label}</Text>
  </Pressable>;
}

export default function ActivePartDelivery(){
  const params=useLocalSearchParams<{orderId?:string}>(),router=useRouter();
  const id=Array.isArray(params.orderId)?params.orderId[0]:params.orderId;
  const {user,profile}=useAuth();
  const [order,setOrder]=useState<PartOrder|null>(null);
  const [ownPosition,setOwnPosition]=useState<PartsCoordinate|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(""),[gpsNotice,setGpsNotice]=useState("");
  const lastSent=useRef(0);
  const load=async()=>{
    if(!id||!user){setLoading(false);return;}
    try{
      const data=await oneOrder(id);
      if(data.rider_id!==user.id)throw new Error("This delivery is not assigned to your Rider account.");
      setOrder(data);setError("");
    }catch(cause){setError(cause instanceof Error?cause.message:"Unable to open delivery.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{
    void load();
    const timer=setInterval(()=>void load(),9000);
    return()=>clearInterval(timer);
  },[id,user?.id]);

  const driving=order?.status==="picked_up"&&Boolean(order.delivery_started_at);
  const active=order?.status==="rider_assigned"||order?.status==="picked_up";

  useFocusEffect(useCallback(()=>{
    if(!active||!id||profile?.role!=="rider")return;
    let disposed=false;
    let watcher:Location.LocationSubscription|null=null;
    const onFix=(fix:Location.LocationObject)=>{
      if(disposed||AppState.currentState!=="active")return;
      const point=validPartsCoordinate(fix.coords.latitude,fix.coords.longitude);
      if(!point)return;
      setOwnPosition(point);
      if(!driving || Date.now()-lastSent.current < 6500)return;
      lastSent.current=Date.now();
      void publishRiderDeliveryLocation(id,point.latitude,point.longitude).catch(e=>{
        if(!disposed)setGpsNotice(e instanceof Error?e.message:"Live GPS sharing unavailable.");
      });
    };
    void (async()=>{
      try{
        const permission=await Location.requestForegroundPermissionsAsync();
        if(!permission.granted){
          if(!disposed)setGpsNotice("Allow location access to show your position during this trip.");
          return;
        }
        const first=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
        onFix(first);
        if(!disposed)watcher=await Location.watchPositionAsync({
          accuracy:Location.Accuracy.High,timeInterval:5000,distanceInterval:10,
        },onFix,e=>{if(!disposed)setGpsNotice(e);});
        if(disposed)watcher?.remove();
      }catch(e){if(!disposed)setGpsNotice(e instanceof Error?e.message:"Unable to start GPS.");}
    })();
    return()=>{disposed=true;watcher?.remove();};
  },[id,active,driving,profile?.role]));

  const collected=()=>Alert.alert("Confirm part collection",
    "Confirm only after the dealer physically hands over the correct spare part.",
    [{text:"Not yet",style:"cancel"},{text:"I've collected the part",onPress:()=>void(async()=>{
      if(!id||busy)return;setBusy(true);setError("");
      try{await riderPickedUp(id);await load();}
      catch(cause){setError(cause instanceof Error?cause.message:"Unable to confirm pickup.");}
      finally{setBusy(false);}
    })()}]);
  const begin=async()=>{
    if(!id||busy)return;
    setBusy(true);setError("");
    try{
      await startRiderCustomerTrip(id);
      await load();
    }catch(cause){setError(cause instanceof Error?cause.message:"Unable to start customer trip.");}
    finally{setBusy(false);}
  };

  const step=order?.status==="rider_assigned"?1:2;
  const destination=step===1
    ?validPartsCoordinate(order?.parts_shops?.latitude,order?.parts_shops?.longitude)
    :validPartsCoordinate(order?.delivery_latitude,order?.delivery_longitude);
  const destinationLabel=step===1
    ?String(order?.parts_shops?.location_text??"")
    :String(order?.delivery_location??"");
  const phone=step===1?order?.parts_shops?.phone:order?.delivery_phone;

  return <PartsPage title="Your delivery" subtitle="Navigate, collect and deliver safely"
    back="/rider/dashboard" loading={loading} refresh={()=>void load()}>
    {profile?.role!=="rider"?<Notice tone="error">Sign in as a Rider to open this trip.</Notice>:
      !order?<Notice tone="error">{error||"Delivery not found."}</Notice>:<>
        <View style={styles.headerCard}>
          <View style={[partStyles.row,{justifyContent:"space-between"}]}>
            <Text style={styles.eyebrow}>ORDER #{order.id.slice(0,8).toUpperCase()}</Text>
            <Status label={order.status} good={order.status==="delivered"}/>
          </View>
          <Text style={styles.title}>{order.parts_inventory?.title||"Spare-part delivery"}</Text>
          <Text style={styles.muted}>Quantity: {order.quantity}</Text>
        </View>

        {active?<View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View style={[styles.stepBubble,step>=1&&styles.stepCurrent]}>
              <Text style={styles.stepText}>1</Text>
            </View>
            <View style={[styles.stepConnector,step===2&&{backgroundColor:"#14966A"}]}/>
            <View style={[styles.stepBubble,step===2&&styles.stepCurrent]}>
              <Text style={styles.stepText}>2</Text>
            </View>
          </View>
          <View style={[partStyles.row,{justifyContent:"space-between"}]}>
            <Text style={styles.progressText}>Collect from dealer</Text>
            <Text style={styles.progressText}>Deliver to motorist</Text>
          </View>
        </View>:null}

        {order.status==="rider_assigned"?<Notice>
          Step 1: Navigate to the Parts Dealer, contact them if needed, and confirm collection only when you receive the item.
        </Notice>:null}
        {order.status==="picked_up"&&!driving?<Notice>
          Part collected. Step 2: Start the trip toward the Motorist to share your live GPS position while this screen is open.
        </Notice>:null}
        {driving?<Notice tone="success">
          Customer trip started. Your location is shared while this screen remains open. Continue to the Motorist's pinned delivery address.
        </Notice>:null}

        {active?<>
          <View style={styles.destinationCard}>
            <Text style={styles.eyebrow}>{step===1?"PICKUP DESTINATION":"CUSTOMER DESTINATION"}</Text>
            <Text style={styles.destinationTitle}>
              {step===1?order.parts_shops?.shop_name||"Parts Dealer":"Motorist delivery address"}
            </Text>
            <Text style={styles.address}>{destinationLabel}</Text>
            <View style={styles.contacts}>
              <ContactAction kind="call" phone={phone} label={step===1?"Call dealer":"Call motorist"}/>
              <ContactAction kind="sms" phone={phone} label={step===1?"SMS dealer":"SMS motorist"}/>
            </View>
          </View>
          <PartsTripGuide key={step===1?"dealer":"motorist"}
            destination={destination} destinationLabel={destinationLabel} ownPosition={ownPosition}/>
          {!destination?<Notice>
            {step===1
              ?"The dealer has not saved a precise pickup pin. Ask the dealer to open Store profile and set their location. You can still navigate using their written address."
              :"This order has a text-only delivery address. Contact the Motorist for a precise location; use external Maps to search the written address."}
          </Notice>:null}
          {gpsNotice?<Notice>{gpsNotice}</Notice>:null}

          {order.status==="rider_assigned"?<Action label="I have collected the part"
            busy={busy} onPress={collected}
            icon={{ios:"checkmark.circle.fill",android:"check_circle",web:"check_circle"}}/>:null}
          {order.status==="picked_up"&&!driving?<Action label="Start trip to Motorist"
            busy={busy} onPress={()=>void begin()}
            icon={{ios:"location.north.fill",android:"navigation",web:"navigation"}}/>:null}
          {driving?<View style={styles.endCard}>
            <Text style={styles.endTitle}>On the way to the Motorist</Text>
            <Text style={styles.muted}>When the part is handed over, the Motorist will confirm receipt in their AutoAssist app.</Text>
          </View>:null}
        </>:null}

        {order.status==="delivered"?<Notice tone="success">
          Delivery complete — the Motorist confirmed receiving the part.
        </Notice>:null}
        {error?<Notice tone="error">{error}</Notice>:null}
      </>}
  </PartsPage>;
}

const styles=StyleSheet.create({
  headerCard:{backgroundColor:"#FFFFFF",padding:17,borderRadius:17,
    borderWidth:1,borderColor:"#E3E9F1",marginTop:4},
  eyebrow:{fontSize:10,fontFamily:"Inter_600SemiBold",color:BLUE,letterSpacing:0.7},
  title:{color:NAVY,fontSize:20,fontFamily:"Inter_600SemiBold",marginTop:12},
  muted:{color:"#667085",fontSize:12,lineHeight:19,marginTop:5},
  progressCard:{borderWidth:1,borderColor:"#E1EAF5",borderRadius:16,
    backgroundColor:"#FFFFFF",marginTop:15,padding:16},
  progressRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",
    paddingHorizontal:44,marginBottom:10},
  stepBubble:{height:34,width:34,backgroundColor:"#7893AF",borderRadius:17,
    alignItems:"center",justifyContent:"center"},
  stepCurrent:{backgroundColor:BLUE},
  stepText:{color:"#FFFFFF",fontFamily:"Inter_600SemiBold"},
  stepConnector:{flex:1,height:3,backgroundColor:"#CBD8EA",marginHorizontal:8},
  progressText:{fontSize:11,color:"#55718A",fontFamily:"Inter_600SemiBold"},
  destinationCard:{backgroundColor:"#FFFFFF",borderWidth:1,
    borderColor:"#E1E9F2",borderRadius:17,padding:16,marginTop:15},
  destinationTitle:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:16,marginTop:9},
  address:{color:"#5D7085",fontSize:12,lineHeight:19,marginTop:8},
  contacts:{flexDirection:"row",gap:9,marginTop:17},
  contactButton:{flex:1,backgroundColor:"#EAF2FD",minHeight:46,
    flexDirection:"row",gap:7,borderRadius:10,justifyContent:"center",alignItems:"center"},
  contactText:{fontSize:11,fontFamily:"Inter_600SemiBold",color:BLUE},
  endCard:{marginTop:14,padding:16,borderRadius:14,backgroundColor:"#E9FAF0"},
  endTitle:{fontFamily:"Inter_600SemiBold",color:"#106B49",fontSize:15},
});
