import * as Location from "expo-location";
import { Camera, Map, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { BLUE, NAVY } from "@/components/parts-ui";

export type PartsCoordinate = { latitude: number; longitude: number };
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER: [number, number] = [36.8219, -1.2921];

export function validPartsCoordinate(latitude: unknown, longitude: unknown): PartsCoordinate | null {
  if (latitude == null || longitude == null) return null;
  const lat = Number(latitude), lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 ||
      lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}

function coordinateLabel(point: PartsCoordinate) {
  return `Pinned location (${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)})`;
}

async function describePoint(point: PartsCoordinate): Promise<string> {
  try {
    const first = (await Location.reverseGeocodeAsync(point))[0];
    if (first) {
      const address = [first.streetNumber, first.street, first.district,
        first.city, first.region].filter(Boolean).join(", ");
      if (address.length >= 5) return address;
    }
  } catch {
    // Device geocoding may be missing on emulators. The precise pin is retained.
  }
  return coordinateLabel(point);
}

/** A tapped GPS pin, not a guessed/geocoded coordinate from a typed address. */
export function PartsLocationPicker({
  value, onPick, title = "Delivery pin", help,
}: {
  value: PartsCoordinate | null;
  onPick: (value: PartsCoordinate, label: string) => void;
  title?: string;
  help?: string;
}) {
  const [mapVisible, setMapVisible] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const camera = useRef<CameraRef>(null);
  const center: [number, number] = value
    ? [value.longitude, value.latitude] : DEFAULT_CENTER;

  useEffect(() => {
    if (mapVisible && value) {
      camera.current?.easeTo({ center: [value.longitude, value.latitude], zoom: 15, duration: 450 });
    }
  }, [mapVisible, value?.latitude, value?.longitude]);

  const choose = async (point: PartsCoordinate) => {
    setWorking(true);setError("");
    try { onPick(point, await describePoint(point)); }
    finally { setWorking(false); }
  };

  const useCurrent = async () => {
    if (working) return;
    setWorking(true);setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Allow location access to use your current position.");
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = validPartsCoordinate(fix.coords.latitude, fix.coords.longitude);
      if (!point) throw new Error("Your device did not return valid GPS coordinates.");
      onPick(point, await describePoint(point));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to obtain a GPS position.");
    } finally { setWorking(false); }
  };

  return <View style={styles.wrapper}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {value ? <Text style={styles.saved}>PIN SAVED</Text> : null}
    </View>
    {help ? <Text style={styles.helper}>{help}</Text> : null}
    <View style={styles.controls}>
      <Pressable style={styles.primary} accessibilityRole="button" disabled={working}
        onPress={() => void useCurrent()}>
        {working ? <ActivityIndicator color="#FFFFFF" size="small" /> :
          <SymbolView name={{ ios:"location.fill",android:"my_location",web:"my_location"} as never}
            tintColor="#FFFFFF" size={16}/>}
        <Text style={styles.primaryText}>Use my location</Text>
      </Pressable>
      <Pressable style={styles.secondary} accessibilityRole="button"
        onPress={() => setMapVisible(v => !v)}>
        <SymbolView name={{ ios:"map",android:"map",web:"map"} as never}
          tintColor={BLUE} size={16}/>
        <Text style={styles.secondaryText}>{mapVisible ? "Hide map" : "Choose on map"}</Text>
      </Pressable>
    </View>
    {value ? <Text style={styles.coordinates}>
      Pin: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
    </Text> : null}
    {mapVisible ? <>
      <View style={styles.mapShell}>
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={MAP_STYLE}
          androidView="texture"
          compass attribution logo={false}
          onPress={(event) => {
            const [lon, lat] = event.nativeEvent.lngLat;
            const point = validPartsCoordinate(lat, lon);
            if (point && !working) void choose(point);
          }}
          onDidFailLoadingMap={() => setError("Map tiles unavailable. Try your device GPS instead.")}
        >
          <Camera ref={camera} initialViewState={{ center, zoom: value ? 15 : 11 }} />
          {value ? <Marker id="parts-location-pin" lngLat={[value.longitude,value.latitude]}>
            <View style={styles.pin}>
              <SymbolView name={{ios:"mappin",android:"place",web:"place"} as never}
                tintColor="#FFFFFF" size={22}/>
            </View>
          </Marker> : null}
        </Map>
      </View>
      <Text style={styles.helper}>Tap the exact pickup/delivery point to save its pin.</Text>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://www.openstreetmap.org/copyright")}>
        <Text style={styles.credit}>© OpenStreetMap · OpenFreeMap</Text>
      </Pressable>
    </> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrapper:{ backgroundColor:"#FFFFFF", borderRadius:14, borderWidth:1,
    borderColor:"#DDE7F3", padding:13, marginTop:12 },
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  title:{fontSize:13,fontFamily:"Inter_600SemiBold",color:NAVY},
  saved:{fontSize:10,fontFamily:"Inter_600SemiBold",color:"#128A58"},
  helper:{fontSize:11,lineHeight:17,color:"#64748B",marginTop:7},
  controls:{flexDirection:"row",gap:8,marginTop:12},
  primary:{backgroundColor:BLUE,flex:1,flexDirection:"row",gap:7,minHeight:41,
    justifyContent:"center",alignItems:"center",borderRadius:9},
  primaryText:{fontSize:11,color:"#FFFFFF",fontFamily:"Inter_600SemiBold"},
  secondary:{backgroundColor:"#EAF2FD",flex:1,flexDirection:"row",gap:6,minHeight:41,
    justifyContent:"center",alignItems:"center",borderRadius:9},
  secondaryText:{fontSize:11,color:BLUE,fontFamily:"Inter_600SemiBold"},
  coordinates:{color:"#51657B",fontSize:11,marginTop:10},
  mapShell:{height:260,borderRadius:12,overflow:"hidden",marginTop:12},
  pin:{height:38,width:38,borderRadius:19,backgroundColor:BLUE,alignItems:"center",justifyContent:"center"},
  credit:{color:BLUE,fontSize:10,marginTop:6},
  error:{color:"#B42318",fontSize:11,marginTop:9},
});
