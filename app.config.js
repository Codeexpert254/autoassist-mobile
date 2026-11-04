// Dynamic configuration keeps each developer's local app.json (Firebase,
// Supabase/EAS IDs, native overlay plugin) intact. Never commit the map key.
const base = require("./app.json").expo;
const originalPlugins = base.plugins ?? [];
const nameOf = (entry) => Array.isArray(entry) ? entry[0] : entry;
const currentLocation = originalPlugins.find((entry) => nameOf(entry) === "expo-location");
const locationOptions = Array.isArray(currentLocation) ? currentLocation[1] ?? {} : {};
const googleMapsApiKey = (process.env.GOOGLE_MAPS_API_KEY ?? "").trim();

module.exports = ({ config }) => ({
  ...config,
  ...base,
  // CI uses a sanitized app.json without its local Android package ID.
  // Match the already-installed AutoAssist Android app, while preserving
  // the developer's package if set in their local app.json.
  android: {
    ...(config.android ?? {}),
    ...(base.android ?? {}),
    package: base.android?.package || config.android?.package || "com.company.autoassist",
  },
  extra: {
    ...(config.extra ?? {}),
    ...(base.extra ?? {}),
    googleMapsConfigured: Boolean(googleMapsApiKey),
  },
  plugins: [
    ...originalPlugins.filter((entry) => !["expo-location", "react-native-maps"].includes(nameOf(entry))),
    // Preserve the single-FCM-service native overlay behavior in clean CI
    // builds as well as local app.json files.
    ...(!originalPlugins.some((entry) => nameOf(entry) === "./plugins/with-autoassist-fcm")
      ? ["./plugins/with-autoassist-fcm"] : []),
    ["expo-location", {
      ...locationOptions,
      // Android location access is requested only after the mechanic begins
      // a journey and explicitly opts into background GPS sharing.
      isAndroidBackgroundLocationEnabled: true,
      isAndroidForegroundServiceEnabled: true,
    }],
    ["react-native-maps", googleMapsApiKey ? { androidGoogleMapsApiKey: googleMapsApiKey } : {}],
  ],
});
