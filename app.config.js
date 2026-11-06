const fs = require("node:fs");
const path = require("node:path");
// Dynamic configuration keeps each developer's local app.json (Firebase,
// Supabase/EAS IDs, native overlay plugin) intact. No map key is needed.
const base = require("./app.json").expo;
const originalPlugins = base.plugins ?? [];
// Use local custom chimes when assets/notifications/autoassist_alert(.wav/.mp3) and
// autoassist_alert_backup(.wav/.mp3) have been copied into this worktree. Otherwise use
// the Android/iOS system notification sound without breaking CI.
const folder = path.join(__dirname, "assets", "notifications");
const available = fs.existsSync(folder) ? fs.readdirSync(folder) : [];
const findSound = stem => available.find(name =>
  new RegExp("^" + stem + "\\.(wav|mp3|aiff)$", "i").test(name)) || null;
const primarySound = findSound("autoassist_alert");
const backupSound = findSound("autoassist_alert_backup");
const soundPaths = [...new Set([primarySound, backupSound].filter(Boolean))]
  .map(name => "./assets/notifications/" + name);

const nameOf = (entry) => Array.isArray(entry) ? entry[0] : entry;
const currentLocation = originalPlugins.find((entry) => nameOf(entry) === "expo-location");
const locationOptions = Array.isArray(currentLocation) ? currentLocation[1] ?? {} : {};

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
    notificationSounds: { primary: primarySound || backupSound || "default", backup: backupSound || primarySound || "default" },
  },
  plugins: [
    ...originalPlugins.filter(entry => !["expo-location","react-native-maps",
      "@maplibre/maplibre-react-native","expo-notifications"].includes(nameOf(entry))),
    ["expo-notifications", {
      ...(Array.isArray(originalPlugins.find(entry => nameOf(entry) === "expo-notifications"))
        ? originalPlugins.find(entry => nameOf(entry) === "expo-notifications")[1] : {}),
      sounds: soundPaths,
      defaultChannel: "autoassist-updates-v2",
    }],
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
    "./plugins/with-autoassist-test-flavors",
    // MapLibre loads OpenFreeMap tiles directly. No Google key or billing.
    "@maplibre/maplibre-react-native",
  ],
});
