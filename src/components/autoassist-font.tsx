import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { StyleSheet, Text as NativeText, type TextProps, type TextStyle } from "react-native";

export type AutoAssistFont = "system"|"inter";
const KEY = "autoassist:font-preference";
const FontContext=createContext<{
  font:AutoAssistFont;setFont:(value:AutoAssistFont)=>void;
}>({font:"inter",setFont:()=>undefined});

export function AutoAssistFontProvider({children}:{children:ReactNode}){
  const [font,setState]=useState<AutoAssistFont>(()=>{
    try{return globalThis.localStorage?.getItem(KEY)==="system"?"system":"inter";}
    catch{return "inter";}
  });
  const setFont=(value:AutoAssistFont)=>{
    setState(value);
    try{globalThis.localStorage?.setItem(KEY,value);}catch{}
  };
  const selected=useMemo(()=>({font,setFont}),[font]);
  return <FontContext.Provider value={selected}>{children}</FontContext.Provider>;
}
export const useAutoAssistFont=()=>useContext(FontContext);

/** Text primitive for migrated screens: one consistent family per preference. */
export function AppText(props:TextProps){
  const {font}=useAutoAssistFont();
  const original:TextStyle=StyleSheet.flatten(props.style)??{};
  const {fontFamily:oldFamily,...style}=original;
  const bold=String(oldFamily??"").includes("600")||
    style.fontWeight==="bold"||style.fontWeight==="600"||style.fontWeight==="700";
  return <NativeText {...props} style={[
    style,
    font==="inter"?{fontFamily:bold?"Inter_600SemiBold":"Inter_400Regular"}:
      bold?{fontWeight:"600"}:null,
  ]}/>;
}
