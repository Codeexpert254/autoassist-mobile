import * as ImagePicker from "expo-image-picker";
import { requireSupabase } from "@/lib/supabase";
import type { PartPhoto } from "@/services/parts-data";

const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toArrayBuffer(base64:string):ArrayBuffer {
  const value=base64.replace(/\s/g,"").replace(/=+$/,"");
  const result=new Uint8Array(Math.floor(value.length*3/4));
  let bits=0,pending=0,n=0;
  for(const c of value) {
    const b=ABC.indexOf(c);
    if(b<0)throw new Error("This image could not be decoded.");
    bits=(bits<<6)|b;pending+=6;
    if(pending>=8){pending-=8;result[n++]=(bits>>>pending)&255;}
  }
  return result.buffer;
}
/** The dealer may add unlimited photographs across repeated picker sessions.
 * We process images sequentially to limit memory spikes on low-end phones.
 */
export async function addPartPhotos(userId:string,partId:string,currentCount=0):
Promise<{count:number;errors:string[]}> {
  const picked=await ImagePicker.launchImageLibraryAsync({
    mediaTypes:["images"],allowsMultipleSelection:true,selectionLimit:0,quality:0.75,base64:true,
  });
  if(picked.canceled)return {count:0,errors:[]};
  let count=0;const errors:string[]=[];
  for(const asset of picked.assets){
    try{
      if(!asset.base64)throw new Error("Could not read image. Please try another photo.");
      const bytes=toArrayBuffer(asset.base64);
      if(bytes.byteLength>5*1024*1024)throw new Error("Image exceeds 5 MB. Please choose a smaller one.");
      const path=userId+"/"+partId+"/"+Date.now()+"-"+Math.random().toString(36).slice(2)+".jpg";
      const client=requireSupabase();
      const {error:uploadError}=await client.storage.from("parts-inventory").upload(path,bytes,{
        contentType:"image/jpeg",upsert:false,
      });
      if(uploadError)throw uploadError;
      const {error}=await client.from("parts_inventory_images" as never).insert({
        part_id:partId,storage_path:path,sort_index:currentCount+count,
      } as never);
      if(error){await client.storage.from("parts-inventory").remove([path]);throw error;}
      count++;
    }catch(e){errors.push(e instanceof Error?e.message:"Unable to upload an image");}
  }
  return {count,errors};
}
export async function deletePartPhoto(photo:PartPhoto) {
  const c=requireSupabase();
  const {error}=await c.from("parts_inventory_images" as never).delete().eq("id",photo.id);
  if(error)throw error;
  await c.storage.from("parts-inventory").remove([photo.storage_path]);
}
