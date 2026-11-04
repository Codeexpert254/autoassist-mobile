import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { Action, Field, Notice, PartsPage, Section, BLUE, NAVY, partStyles } from "@/components/parts-ui";
import { type Part, type PartPhoto, type PartsShop, conditions, imageUrl, ownShop,
  inventoryFor, saveInventory, partCategories } from "@/services/parts-data";
import { addPartPhotos, deletePartPhoto } from "@/services/parts-photos";

export default function AddOrEditPart(){
  const router=useRouter();const {user}=useAuth();
  const params=useLocalSearchParams<{partId?:string}>();
  const editId=Array.isArray(params.partId)?params.partId[0]:params.partId;
  const [shop,setShop]=useState<PartsShop|null>(null);
  const [title,setTitle]=useState(""),[category,setCategory]=useState("Brakes");
  const [condition,setCondition]=useState<Part["part_condition"]>("New");
  const [price,setPrice]=useState(""),[stock,setStock]=useState("1");
  const [compatibility,setCompatibility]=useState(""),[partNumber,setPartNumber]=useState("");
  const [description,setDescription]=useState("");
  const [photos,setPhotos]=useState<PartPhoto[]>([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  useEffect(()=>{
    if(!user){setLoading(false);return;}
    void (async()=>{
      try{
        const s=await ownShop(user.id);setShop(s);
        if(s&&editId){
          const all=await inventoryFor(s.id);
          const p=all.find(x=>x.id===editId);
          if(!p)throw new Error("This part is not in your inventory.");
          setTitle(p.title);setCategory(p.category);setCondition(p.part_condition);
          setPrice(String(p.price_kes));setStock(String(p.stock_quantity));
          setDescription(p.description);setCompatibility(p.compatibility);
          setPartNumber(p.part_number);setPhotos(p.parts_inventory_images??[]);
        }
      }catch(e){setError(e instanceof Error?e.message:"Unable to load the product.");}
      finally{setLoading(false);}
    })();
  },[user?.id,editId]);
  const save=async(withPhotos=false)=>{
    if(!user||!shop||busy)return;
    if(title.trim().length<3){setError("Enter a descriptive part name.");return;}
    if(!Number.isInteger(Number(stock))||Number(stock)<0){setError("Stock must be a whole number.");return;}
    setBusy(true);setError("");setNotice("");
    try{
      const p=await saveInventory(shop.id,{
        title:title.trim(),category,part_condition:condition,
        price_kes:Number(price),stock_quantity:Number(stock),
        description:description.trim(),compatibility:compatibility.trim(),
        part_number:partNumber.trim(),is_listed:true,
      },editId);
      if(withPhotos){
        const result=await addPartPhotos(user.id,p.id,photos.length);
        if(result.errors.length)setNotice(result.errors.join(" · "));
        else setNotice(result.count+" photos added.");
      }
      router.replace({pathname:"/partsdealer/add-part",params:{partId:p.id}});
      if(editId===p.id&&!withPhotos)router.replace("/partsdealer/inventory");
    }catch(e){setError(e instanceof Error?e.message:"Unable to save your part.");}
    finally{setBusy(false);}
  };
  const addPhotos=async()=>{
    if(!user||!editId||busy)return;
    setBusy(true);setError("");
    try{
      const result=await addPartPhotos(user.id,editId,photos.length);
      if(result.errors.length)setNotice(result.errors.join(" · "));
      const s=await ownShop(user.id);
      if(s){const all=await inventoryFor(s.id);setPhotos(all.find(x=>x.id===editId)?.parts_inventory_images??[]);}
      if(result.count)setNotice(result.count+" images uploaded. Add more at any time.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to add photos.");}
    finally{setBusy(false);}
  };
  const removePhoto=async(photo:PartPhoto)=>{
    setBusy(true);try{await deletePartPhoto(photo);setPhotos(old=>old.filter(p=>p.id!==photo.id));}
    catch(e){setError(e instanceof Error?e.message:"Unable to delete photo.");}
    finally{setBusy(false);}
  };
  return <PartsPage title={editId?"Edit spare part":"Add spare part"}
    subtitle="Accurate stock, condition and photos build customer trust" back="/partsdealer/inventory" loading={loading}>
    {!shop?<Notice tone="error">Register a shop before adding inventory.</Notice>:<>
      {shop.verification_status!=="approved"?<Notice>Save your inventory now. It will only be purchasable after your shop is approved and open.</Notice>:null}
      <Field label="Part name" value={title} onChangeText={setTitle} placeholder="Front brake pads set"/>
      <Text style={{color:NAVY,fontSize:12,fontFamily:"Inter_600SemiBold",marginTop:17}}>Condition</Text>
      <View style={[partStyles.row,{marginTop:9}]}>
        {conditions.map(c=><Pressable key={c} onPress={()=>setCondition(c)} accessibilityRole="button"
          style={{backgroundColor:condition===c?BLUE:"#FFFFFF",borderRadius:10,paddingVertical:12,flex:1,
            alignItems:"center",borderColor:BLUE,borderWidth:1}}>
          <Text style={{fontSize:11,color:condition===c?"#FFFFFF":BLUE,fontFamily:"Inter_600SemiBold"}}>{c}</Text>
        </Pressable>)}
      </View>
      <Text style={{color:NAVY,fontSize:12,fontFamily:"Inter_600SemiBold",marginTop:18}}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8}}>
        {partCategories.map(c=><Pressable key={c} onPress={()=>setCategory(c)} style={{
          backgroundColor:category===c?"#DCEBFC":"#FFFFFF",borderRadius:9,
          borderWidth:1,borderColor:category===c?BLUE:"#E4E7EC",
          paddingHorizontal:13,paddingVertical:9,marginRight:8}}>
          <Text style={{fontSize:11,color:NAVY}}>{c}</Text>
        </Pressable>)}
      </ScrollView>
      <Field label="Price (KES)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="3500"/>
      <Field label="Stock quantity" keyboardType="number-pad" value={stock} onChangeText={setStock} placeholder="10"/>
      <Field label="Compatible vehicle models" value={compatibility} onChangeText={setCompatibility}
        placeholder="Toyota Axio 2014–2019 (example)"/>
      <Field label="Part number / SKU (optional)" value={partNumber} onChangeText={setPartNumber}/>
      <Field label="Description and condition details" multiline value={description} onChangeText={setDescription}
        placeholder="Material, manufacturer and details of any repairs or wear"/>
      <Section title={"Product photos ("+photos.length+")"}>
        <Notice>Upload multiple photos of the same item. You can add more at any time; each image must be under 5 MB. Include both sides, labels and any wear on used parts.</Notice>
        <View style={{flexDirection:"row",flexWrap:"wrap",gap:9,marginTop:11}}>
          {photos.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel="Delete product photo"
            onPress={()=>void removePhoto(p)}>
            <Image source={{uri:imageUrl(p.storage_path)??""}} style={{height:99,width:99,borderRadius:10}}/>
            <Text style={{color:"#B42318",fontSize:10,marginTop:3,textAlign:"center"}}>Remove</Text>
          </Pressable>)}
        </View>
        {editId?<Action label="Add more photos" variant="outline" busy={busy}
          icon={{ios:"photo.on.rectangle.angled",android:"add_photo_alternate",web:"add_photo_alternate"}}
          onPress={()=>void addPhotos()}/>:<Notice>Save the part first, then add photos.</Notice>}
      </Section>
      {error?<Notice tone="error">{error}</Notice>:null}
      {notice?<Notice tone="success">{notice}</Notice>:null}
      <Action label={editId?"Save changes":"Create inventory item"} busy={busy} onPress={()=>void save()}/>
    </>}
  </PartsPage>;
}
