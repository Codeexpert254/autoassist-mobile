import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { type PartsCoordinate } from "@/components/parts-location-picker";
import { BLUE, NAVY } from "@/components/parts-ui";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
// The OSRM demo is used only during local development. Production should
// supply its own routing backend via EXPO_PUBLIC_PARTS_ROUTING_URL.
const ROUTING_URL = process.env.EXPO_PUBLIC_PARTS_ROUTING_URL?.trim() ||
  (__DEV__ ? "https://router.project-osrm.org" : "");

function directDistance(a: PartsCoordinate,b: PartsCoordinate):number {
  const rad = Math.PI/180;
  const dLat = (b.latitude-a.latitude)*rad;
  const dLon = (b.longitude-a.longitude)*rad;
  const v = Math.sin(dLat/2)**2 +
    Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v));
}

async function openNavigation(target: PartsCoordinate|null,address:string){
  const destination=target?`${target.latitude},${target.longitude}`:address;
  if(!destination.trim())return;
  // Google Maps provides real road routing and voice instructions.
  // The in-app straight-line overlay is not turn-by-turn road guidance.
  await Linking.openURL("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination="+
    encodeURIComponent(destination));
}

export function PartsTripGuide({
  destination,destinationLabel,ownPosition,mode="rider",
}:{
  destination:PartsCoordinate|null;
  destinationLabel:string;
  ownPosition:PartsCoordinate|null;
  mode?:"rider"|"motorist"|"towing"|"tow_motorist";
}){
  const camera=useRef<CameraRef>(null);
  const [ready,setReady]=useState(false);
  const [mapError,setMapError]=useState("");
  const [openError,setOpenError]=useState("");
  const [roadRoute,setRoadRoute]=useState<{
    coordinates:number[][];distanceKm:number;durationMin:number;
  }|null>(null);
  const lastPosition=useRef(ownPosition);
  lastPosition.current=ownPosition;
  const lastFit=useRef("");
  const focus=useCallback(()=>{
    if(!ready||(!destination&&!ownPosition))return;
    const point=destination??ownPosition!;
    if(destination&&ownPosition&&directDistance(ownPosition,destination)>0.04){
      camera.current?.fitBounds([
        Math.min(destination.longitude,ownPosition.longitude),
        Math.min(destination.latitude,ownPosition.latitude),
        Math.max(destination.longitude,ownPosition.longitude),
        Math.max(destination.latitude,ownPosition.latitude),
      ],{padding:{top:48,right:40,bottom:50,left:40},duration:500});
    }else camera.current?.easeTo({center:[point.longitude,point.latitude],zoom:15,duration:500});
  },[ready,destination?.latitude,destination?.longitude,ownPosition?.latitude,ownPosition?.longitude]);

  useEffect(()=>{
    const key=destination?`${destination.latitude}:${destination.longitude}`:"location-only";
    if(!ready||lastFit.current===key||(!ownPosition&&!destination))return;
    lastFit.current=key;focus();
  },[ready,destination?.latitude,destination?.longitude,ownPosition?.latitude!=null,focus]);

  useEffect(()=>{
    if(!["rider","towing"].includes(mode)||!destination||!ownPosition||!ROUTING_URL)return;
    let disposed=false;
    const loadRoadRoute=async()=>{
      const from=lastPosition.current;
      if(!from||directDistance(from,destination)>120)return;
      const ctrl=new AbortController();
      const timeout=setTimeout(()=>ctrl.abort(),8500);
      try{
        const origin=`${from.longitude},${from.latitude}`;
        const end=`${destination.longitude},${destination.latitude}`;
        const url=(ROUTING_URL.endsWith("/") ? ROUTING_URL.slice(0,-1) : ROUTING_URL)+
          `/route/v1/driving/${origin};${end}?overview=full&geometries=geojson&steps=false`;
        const response=await fetch(url,{signal:ctrl.signal});
        if(!response.ok)throw new Error("Routing provider is unavailable");
        const json=await response.json();
        const first=json.routes?.[0];
        if(!disposed&&first?.geometry?.coordinates?.length>1){
          setRoadRoute({
            coordinates:first.geometry.coordinates as number[][],
            distanceKm:Number(first.distance)/1000,
            durationMin:Number(first.duration)/60,
          });
        }
      }catch{
        if(!disposed)setRoadRoute(null);
      }finally{clearTimeout(timeout);}
    };
    void loadRoadRoute();
    const timer=setInterval(()=>void loadRoadRoute(),90000);
    return()=>{disposed=true;clearInterval(timer);};
  },[mode,destination?.latitude,destination?.longitude,Boolean(ownPosition)]);
  const distance=destination&&ownPosition?directDistance(ownPosition,destination):null;
  const start=destination??ownPosition;

  return <View style={styles.shell}>
    <View style={styles.heading}>
      <Text style={styles.headingTitle}>{mode==="motorist"?"Rider's journey":
        mode==="tow_motorist"?"Your towing agent":"Your route"}</Text>
      {roadRoute?<Text style={styles.distance}>
        {roadRoute.distanceKm.toFixed(1)} km by road
      </Text>:distance!==null?<Text style={styles.distance}>
        {distance<1?`${Math.round(distance*1000)} m`:`${distance.toFixed(1)} km`} direct
      </Text>:null}
    </View>
    <Text style={styles.address} numberOfLines={3}>{destinationLabel||"Destination"}</Text>
    {start?<View style={styles.mapShell}>
      <Map style={StyleSheet.absoluteFill} mapStyle={STYLE_URL} androidView="texture"
        attribution compass logo={false}
        onDidFinishLoadingStyle={()=>setReady(true)}
        onDidFailLoadingMap={()=>setMapError("Map tiles unavailable. Check your internet connection.")}>
        <Camera ref={camera} initialViewState={{
          center:[start.longitude,start.latitude],zoom:13,
        }}/>
        {destination?<Marker id="part-trip-destination" lngLat={[destination.longitude,destination.latitude]}>
          <View style={styles.destinationMarker}>
            <SymbolView name={{ios:"mappin",android:"place",web:"place"} as never}
              tintColor="#FFFFFF" size={22}/>
          </View>
        </Marker>:null}
        {ownPosition?<Marker id="part-trip-rider" lngLat={[ownPosition.longitude,ownPosition.latitude]}>
          <View style={styles.riderMarker}>
            <SymbolView name={{ios:mode==="towing"||mode==="tow_motorist"?"truck.box.fill":"bicycle",
              android:mode==="towing"||mode==="tow_motorist"?"local_shipping":"two_wheeler",
              web:mode==="towing"||mode==="tow_motorist"?"local_shipping":"two_wheeler"} as never}
              tintColor="#FFFFFF" size={20}/>
          </View>
        </Marker>:null}
        {destination&&ownPosition?<GeoJSONSource id="part-trip-line" data={{
          type:"Feature",geometry:{type:"LineString",coordinates:roadRoute?.coordinates??[
            [ownPosition.longitude,ownPosition.latitude],
            [destination.longitude,destination.latitude],
          ]},properties:{},
        }}>
          <Layer id="part-trip-route-line" source="part-trip-line" type="line" paint={{
            "line-color":BLUE,"line-width":roadRoute?5:3,
            "line-dasharray":roadRoute?[1,0]:[2,2],"line-opacity":0.85,
          }}/>
        </GeoJSONSource>:null}
      </Map>
      <Pressable accessibilityRole="button" accessibilityLabel="Recenter trip map"
        style={styles.recenter} onPress={focus}>
        <SymbolView name={{ios:"location.north.fill",android:"my_location",web:"my_location"} as never}
          tintColor={BLUE} size={21}/>
      </Pressable>
    </View>:<View style={styles.mapFallback}>
      <Text style={styles.mapFallbackText}>Waiting for a GPS position to display your map.</Text>
    </View>}
    {roadRoute?<Text style={styles.helper}>
      Estimated road travel: about {Math.ceil(roadRoute.durationMin)} min without live traffic.
      The line shows a mapped driving route, but does not provide spoken directions.
    </Text>:destination&&ownPosition?<Text style={styles.helper}>
      Dashed line shows direct distance only, not a road route or arrival estimate.
      Tap the navigation button for turn-by-turn directions.
    </Text>:null}
    {!destination?<Text style={styles.helper}>
      This destination has no saved GPS pin. Ask the dealer or customer to save their precise location. You can still navigate using the written address.
    </Text>:null}
    {mapError?<Text style={styles.error}>{mapError}</Text>:null}
    {(mode==="rider"||mode==="towing")?<Pressable style={styles.navigate} accessibilityRole="button"
      onPress={()=>void openNavigation(destination,destinationLabel).catch(e=>
        setOpenError(e instanceof Error?e.message:"Could not open maps."))}>
      <SymbolView name={{ios:"arrow.triangle.turn.up.right.diamond.fill",android:"navigation",web:"navigation"} as never}
        size={18} tintColor="#FFFFFF"/>
      <Text style={styles.navigateText}>Start turn-by-turn navigation</Text>
    </Pressable>:null}
    {openError?<Text style={styles.error}>{openError}</Text>:null}
    <Pressable onPress={()=>void Linking.openURL("https://www.openstreetmap.org/copyright")}
      accessibilityRole="link">
      <Text style={styles.credit}>Map © OpenStreetMap · OpenFreeMap</Text>
    </Pressable>
  </View>;
}
const styles=StyleSheet.create({
  shell:{backgroundColor:"#FFFFFF",borderRadius:17,padding:15,borderWidth:1,
    borderColor:"#E1E9F2",marginTop:12},
  heading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},
  headingTitle:{color:NAVY,fontFamily:"Inter_600SemiBold",fontSize:16},
  distance:{color:BLUE,fontFamily:"Inter_600SemiBold",fontSize:12},
  address:{color:"#627187",fontSize:12,lineHeight:20,marginTop:7},
  mapShell:{height:290,borderRadius:14,overflow:"hidden",marginTop:13},
  mapFallback:{backgroundColor:"#EEF3F9",borderRadius:13,padding:25,
    minHeight:115,alignItems:"center",justifyContent:"center",marginTop:12},
  mapFallbackText:{fontSize:12,color:"#55687D",textAlign:"center"},
  destinationMarker:{backgroundColor:"#1857A6",width:37,height:37,borderRadius:19,
    alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:"#FFFFFF"},
  riderMarker:{backgroundColor:"#13916D",width:36,height:36,borderRadius:18,
    alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:"#FFFFFF"},
  recenter:{position:"absolute",right:12,bottom:12,width:40,height:40,
    backgroundColor:"#FFFFFF",borderRadius:12,justifyContent:"center",alignItems:"center"},
  helper:{fontSize:10,color:"#64748B",lineHeight:16,marginTop:10},
  navigate:{marginTop:15,backgroundColor:BLUE,borderRadius:12,minHeight:48,
    flexDirection:"row",gap:9,justifyContent:"center",alignItems:"center",paddingHorizontal:10},
  navigateText:{color:"#FFFFFF",fontFamily:"Inter_600SemiBold",fontSize:12},
  credit:{color:"#577693",fontSize:10,marginTop:10},
  error:{color:"#B42318",fontSize:11,marginTop:8},
});
