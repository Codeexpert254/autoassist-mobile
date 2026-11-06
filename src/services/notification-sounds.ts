import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

type SoundConfig = { primary?: string; backup?: string };
const configured = (Constants.expoConfig?.extra?.notificationSounds ?? {}) as SoundConfig;

// Sound filenames are injected by app.config.js only when the matching assets
// exist at build time; otherwise "default" is the OS notification sound.
export const primaryNotificationSound = configured.primary ?? "default";
export const backupNotificationSound = configured.backup ?? "default";
export const REQUEST_CHANNEL = "autoassist-offers-v4";
export const STATUS_CHANNEL = "autoassist-status-v1";
export const BACKUP_CHANNEL = "autoassist-backup-v1";

export async function ensureAutoAssistNotificationChannels() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync("jobs", {
      name:"AutoAssist updates",importance:Notifications.AndroidImportance.HIGH,
      sound:primaryNotificationSound,vibrationPattern:[0,250,150,250],
    }),
    Notifications.setNotificationChannelAsync(REQUEST_CHANNEL,{
      name:"Incoming service offers",importance:Notifications.AndroidImportance.MAX,
      sound:primaryNotificationSound,vibrationPattern:[0,350,150,350],
      description:"Mechanic, towing, parts and rider offers that need attention.",
    }),
    Notifications.setNotificationChannelAsync(STATUS_CHANNEL,{
      name:"Customer service progress",importance:Notifications.AndroidImportance.HIGH,
      sound:primaryNotificationSound,vibrationPattern:[0,250,150,250],
      description:"Arrival and delivery updates from AutoAssist providers.",
    }),
    Notifications.setNotificationChannelAsync(BACKUP_CHANNEL,{
      name:"Backup alert sound",importance:Notifications.AndroidImportance.HIGH,
      sound:backupNotificationSound,vibrationPattern:[0,250,150,250],
      description:"Alternate AutoAssist chime for troubleshooting.",
    }),
  ]);
}

export async function showLocalTowUpdate(
  title:string,body:string,requestId:string,eventName:string,
) {
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted)return;
  await ensureAutoAssistNotificationChannels();
  await Notifications.scheduleNotificationAsync({
    content:{
      title,body,sound:primaryNotificationSound,
      data:{route:"/motorist/tow-assigned",requestId,type:"towing_status",eventName},
      priority:Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger:Platform.OS==="android" ? {channelId:STATUS_CHANNEL} : null,
  });
}
