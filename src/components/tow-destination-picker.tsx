import * as Location from "expo-location";
import { Camera, Map, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { validPartsCoordinate, type PartsCoordinate } from "@/components/parts-location-picker";
import { BLUE, NAVY } from "@/components/parts-ui";

type Place = { label: string; point: PartsCoordinate };
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const NAIROBI: [number, number] = [36.8219, -1.2921];
// The public Photon server is for small-scale development only. Set a
// contracted/owned geocoder URL in production.
const GEOCODER = process.env.EXPO_PUBLIC_PLACES_SEARCH_URL?.trim() ||
  (__DEV__ ? "https://photon.komoot.io/api" : "");

function placeLabel(properties: Record<string, unknown>): string {
  const parts = [properties.name, properties.street, properties.housenumber,
    properties.district, properties.city, properties.state, properties.country]
    .filter((part): part is string => typeof part === "string" && Boolean(part.trim()));
  return [...new Set(parts)].join(", ");
}

export function TowDestinationPicker({
  value, label, onPick, onTextChange,
}: {
  value: PartsCoordinate | null;
  label: string;
  onPick: (point: PartsCoordinate, label: string) => void;
  onTextChange: (text: string) => void;
}) {
  const [query, setQuery] = useState(label);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [mapChoice, setMapChoice] = useState<PartsCoordinate | null>(null);
  const requestNumber = useRef(0);
  const camera = useRef<CameraRef>(null);
  const chosen = mapChoice ?? value;

  useEffect(() => {
    if (label && label !== query && value) setQuery(label);
  }, [label, value?.latitude, value?.longitude]);

  useEffect(() => {
    if (!GEOCODER || query.trim().length < 3 || value) {
      setResults([]);
      setSearching(false);
      return;
    }
    const currentRequest = ++requestNumber.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setMessage("");
      try {
        const separator = GEOCODER.includes("?") ? "&" : "?";
        const url = GEOCODER + separator + "q=" + encodeURIComponent(query.trim()) +
          "&limit=6&lat=-1.2921&lon=36.8219";
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Search temporarily unavailable.");
        const json = await response.json();
        const found: Place[] = (Array.isArray(json.features) ? json.features : [])
          .map((feature: any) => {
            const [lon, lat] = feature.geometry?.coordinates ?? [];
            const point = validPartsCoordinate(lat, lon);
            const name = placeLabel(feature.properties ?? {});
            return point && name ? { point, label: name } : null;
          })
          .filter((item: Place | null): item is Place => item !== null);
        if (currentRequest === requestNumber.current) setResults(found);
      } catch (error) {
        if (!controller.signal.aborted && currentRequest === requestNumber.current)
          setMessage("Place search is unavailable. Choose the destination manually on the map.");
      } finally {
        if (currentRequest === requestNumber.current) setSearching(false);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
      requestNumber.current++;
    };
  }, [query, Boolean(value)]);

  const choose = (place: Place) => {
    setQuery(place.label);
    setResults([]);
    setMessage("");
    setMapChoice(null);
    onPick(place.point, place.label);
    camera.current?.easeTo({
      center: [place.point.longitude, place.point.latitude], zoom: 16, duration: 400,
    });
  };

  const edit = (text: string) => {
    setQuery(text);
    setMapChoice(null);
    onTextChange(text); // Invalidate the previously saved coordinate on every edit.
  };

  const pinOnMap = async (point: PartsCoordinate) => {
    setMapChoice(point);
    setMessage("");
    // Tapping the map only stages a pin. The user confirms it before saving.
  };

  const confirmPin = async () => {
    if (!mapChoice) return;
    let description = `Pinned destination (${mapChoice.latitude.toFixed(5)}, ${mapChoice.longitude.toFixed(5)})`;
    try {
      const address = (await Location.reverseGeocodeAsync(mapChoice))[0];
      if (address) {
        description = [address.name, address.street, address.district, address.city]
          .filter(Boolean).join(", ") || description;
      }
    } catch {
      // The coordinate, not an approximate address, is the source of truth.
    }
    choose({ point: mapChoice, label: description });
  };

  return <View style={styles.box}>
    <Text style={styles.title}>Destination garage or address</Text>
    <View style={styles.searchBar}>
      <SymbolView name={{ios:"magnifyingglass",android:"search",web:"search"} as never}
        tintColor={BLUE} size={19}/>
      <TextInput value={query} onChangeText={edit}
        autoCorrect={false} placeholder="Search garage, street or destination"
        placeholderTextColor="#8291A5" style={styles.input}/>
      {searching ? <ActivityIndicator size="small" color={BLUE}/> : null}
    </View>
    {!GEOCODER ? <Text style={styles.note}>Search is not configured in this build. Use the map to choose a destination.</Text> : null}
    {results.length > 0 ? <View style={styles.results}>
      {results.map((place, index) => <Pressable key={index}
        accessibilityRole="button" onPress={() => choose(place)} style={styles.result}>
        <SymbolView name={{ios:"mappin",android:"place",web:"place"} as never}
          tintColor={BLUE} size={18}/>
        <Text style={styles.resultText} numberOfLines={2}>{place.label}</Text>
      </Pressable>)}
    </View> : null}
    {value ? <Text style={styles.saved}>✓ Precise destination saved · {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}</Text> : null}
    <Pressable style={styles.mapToggle} accessibilityRole="button"
      onPress={() => setMapVisible(v => !v)}>
      <SymbolView name={{ios:"map",android:"map",web:"map"} as never}
        tintColor={BLUE} size={18}/>
      <Text style={styles.mapToggleText}>{mapVisible ? "Close destination map" : "Choose on map"}</Text>
    </Pressable>
    {mapVisible ? <>
      <Text style={styles.note}>Search above to move the map to a place, or tap the map for an exact drop-off pin.</Text>
      <View style={styles.mapWrap}>
        <Map style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE} androidView="texture"
          attribution compass logo={false}
          onPress={event => {
            const [lon, lat] = event.nativeEvent.lngLat;
            const point = validPartsCoordinate(lat, lon);
            if (point) void pinOnMap(point);
          }}
          onDidFailLoadingMap={() => setMessage("Map tiles unavailable. Check your connection.")}>
          <Camera ref={camera} initialViewState={{
            center: chosen ? [chosen.longitude, chosen.latitude] : NAIROBI,
            zoom: chosen ? 15 : 11,
          }}/>
          {chosen ? <Marker id="tow-destination" lngLat={[chosen.longitude,chosen.latitude]}>
            <View style={styles.pin}>
              <SymbolView name={{ios:"mappin",android:"place",web:"place"} as never}
                tintColor="#FFFFFF" size={23}/>
            </View>
          </Marker> : null}
        </Map>
      </View>
      {mapChoice ? <Pressable style={styles.confirm} accessibilityRole="button"
        onPress={() => void confirmPin()}>
        <Text style={styles.confirmText}>Confirm this destination pin</Text>
      </Pressable> : null}
    </> : null}
    {message ? <Text style={styles.warning}>{message}</Text> : null}
    <Text style={styles.note}>Verify the suggested business and pin before requesting your tow. © OpenStreetMap contributors.</Text>
  </View>;
}

const styles = StyleSheet.create({
  box:{marginTop:12,backgroundColor:"#FFFFFF",borderRadius:17,borderWidth:1,
    borderColor:"#DDE7F3",padding:15},
  title:{fontFamily:"Inter_600SemiBold",fontSize:13,color:NAVY,marginBottom:10},
  searchBar:{borderWidth:1,borderColor:"#D1E0F0",backgroundColor:"#F8FBFF",
    minHeight:49,borderRadius:12,flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:12},
  input:{flex:1,color:NAVY,fontSize:13,paddingVertical:8},
  results:{borderWidth:1,borderColor:"#E0E9F3",borderRadius:12,marginTop:7,overflow:"hidden"},
  result:{padding:13,borderBottomWidth:1,borderBottomColor:"#ECF1F7",
    flexDirection:"row",alignItems:"center",gap:10},
  resultText:{flex:1,fontSize:12,lineHeight:19,color:NAVY},
  saved:{color:"#11845B",fontSize:11,marginTop:11},
  mapToggle:{marginTop:13,minHeight:44,borderRadius:11,
    backgroundColor:"#EAF2FD",flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center"},
  mapToggleText:{fontFamily:"Inter_600SemiBold",color:BLUE,fontSize:12},
  note:{color:"#687A8F",fontSize:11,lineHeight:17,marginTop:9},
  mapWrap:{height:300,borderRadius:13,overflow:"hidden",marginTop:10},
  pin:{width:40,height:40,borderRadius:20,backgroundColor:BLUE,
    justifyContent:"center",alignItems:"center",borderWidth:2,borderColor:"#FFFFFF"},
  confirm:{backgroundColor:BLUE,borderRadius:11,minHeight:45,alignItems:"center",
    justifyContent:"center",marginTop:10},
  confirmText:{fontFamily:"Inter_600SemiBold",color:"#FFFFFF",fontSize:12},
  warning:{color:"#A35C12",fontSize:11,marginTop:9},
});
