# AutoAssist free in-app maps

AutoAssist uses [MapLibre React Native](https://maplibre.org/maplibre-react-native/)
with the public [OpenFreeMap Liberty style](https://openfreemap.org/quick_start/).
**No Google Maps key, Google Cloud billing account, or registration is required.**

## Android development build

The renderer is a native module. It needs a fresh development APK after
installing dependencies; Expo Go and the old native APK cannot load MapLibre.

```sh
npm install
npx tsc --noEmit
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug && cd ..
```

Install `android/app/build/outputs/apk/debug/app-debug.apk` on the phones,
then start Metro with `npx expo start --dev-client`.

Preserve your local Firebase, package ID, signing keys, native popup module,
and other app settings. Avoid `prebuild --clean` until any custom native edits
have been backed up.

## Map behavior

- Customer destination and live mechanic location markers are displayed.
- Both markers fit on the initial map and can be recentered.
- Supabase job-scoped GPS tracking is unchanged.
- The dashed line shows **straight-line distance**, not a driving route.
- No turn-by-turn instructions, traffic ETA or routing service is included.
- Background tracking still needs the mechanic's approval and OS permissions.
- Internet is required to load tiles from the public OpenFreeMap endpoint.
