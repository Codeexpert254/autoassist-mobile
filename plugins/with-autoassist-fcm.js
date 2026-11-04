const { withAndroidManifest } = require("expo/config-plugins");

const EXPO_FCM = "expo.modules.notifications.service.ExpoFirebaseMessagingService";
const AUTOASSIST_FCM = "expo.modules.autoassistoverlay.AutoAssistFirebaseMessagingService";

/**
 * Expo has its own FCM service. Android must have exactly one service
 * handling MESSAGING_EVENT or the native popup handler may never run.
 *
 * tools:node="remove" prevents Android's manifest merger from restoring
 * Expo's original service from its AAR manifest after prebuild.
 * Our subclass forwards all messages to Expo before processing overlay data.
 */
module.exports = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    const app = manifest.application?.[0];
    if (!app) throw new Error("AndroidManifest.xml is missing <application>");
    const services = (app.service || []).filter(
      (service) =>
        service?.$?.["android:name"] !== EXPO_FCM &&
        service?.$?.["android:name"] !== AUTOASSIST_FCM
    );
    services.push({
      $: { "android:name": EXPO_FCM, "tools:node": "remove" },
    });
    services.push({
      $: {
        "android:name": AUTOASSIST_FCM,
        "android:exported": "false",
      },
      "intent-filter": [{
        action: [{ $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } }],
      }],
    });
    app.service = services;
    return config;
  });
