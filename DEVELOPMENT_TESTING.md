# AutoAssist: test before making release APKs

**Use a development build for day-to-day testing.** Keep the existing
`motorist-mechanic-functional` branch and tested Supabase/Firebase config
until this new branch passes on-device tests.

## What requires a rebuild?

| Change | Rebuild native Android? |
| --- | --- |
| React Native screen, navigation, hooks, CSS, TypeScript | No: Metro reload |
| Supabase Edge Function or database logic | No: deploy server changes |
| Android manifest, Firebase messaging service, overlay Kotlin module | Yes: install a new native development build |
| Final APK for distribution | Only after testing and approval |

## One-time setup on the developer Mac

```sh
cd ~/Developer/autoassist
git status --short
git fetch origin feature/android-floating-mechanic-offers
git merge --ff-only FETCH_HEAD
```

Do not discard uncommitted changes in `app.json`, `eas.json` or
`google-services.json`. Confirm that `app.json` still has:
- `expo.android.package = "com.company.autoassist"`
- `expo.android.googleServicesFile = "./google-services.json"`
- the original `expo.extra.eas.projectId`
- `expo-notifications` config plugin.
- your `.env.local` still contains **only public** client variables.

This branch adds `app.config.js`, which dynamically preserves local
`app.json` while applying an Android manifest plugin. That plugin
removes Expo's default FCM service and installs AutoAssist's delegating
service, so messages do not get routed to competing service classes.

```sh
npm install
npx expo install expo-dev-client
npx expo config --type public
npx expo prebuild --platform android --clean
adb devices
npx expo run:android --device
```

The **first** local native compile is necessary to install the Kotlin
module. Make sure Android SDK / Android Studio are configured.

Important: a locally signed debug build may be **incompatible with the
signature** of an EAS preview APK installed with the same package ID.
Do not blindly uninstall a phone with unsynced app data. Prefer a
separate development device or emulator, or build a one-time EAS
`developmentClient: true` APK using the existing EAS signing
credentials. If the command reports
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`, stop and check the app's
package/signing setup before removing the installed build.

## Daily loop after the native development build is installed

```sh
npx expo start --dev-client
```

Launch AutoAssist development client on your phone. Ordinary TypeScript
and UI edits should reload over Metro (Fast Refresh) without generating
another APK. Native Kotlin / Android manifest changes still require
`npx expo run:android --device` and sometimes a clean prebuild.

## Functional test matrix (two phones / accounts)

1. **Motorist login:** Motorist dashboard never shows the mechanic popup.
2. **Mechanic login:** The mechanic dashboard displays only that
   mechanic's eligible, unexpired offer.
3. **Account switch:** After mechanic logs out, a motorist logging in
   on the same device must not receive newly issued mechanic alerts.
   Logout revokes only that device's Expo push token in Supabase.
4. **Mechanic online:** Enable job notifications and **Appear on top**
   in Android special app access; return to dashboard and explicitly
   enable **Floating job popups**.
5. **Background:** Keep mechanic online, open another app, and send a
   **new** motorist request from another phone. Native overlay should
   display without opening AutoAssist first, if Android allows it.
6. **Dashboard diagnostics:** Tap **Check background popup diagnostics**.
   Inspect last native FCM arrival, permission, enabled/online state,
   and last result. Avoid posting token strings or customer details.
7. **Tap overlay:** View & respond must open that live offer in the
   mechanic account. Server must reject expired, already assigned,
   or other-user offers.
8. **Offline / logout:** No new overlay must appear. The original
   system push notification stays the fallback for unsupported
   devices or background restrictions.
9. **Locked screen / forced-stop:** Expect normal notification on lock
   screen, not an overlay. Android force-stop prevents FCM until the
   application is opened manually.

## Android native troubleshooting

```sh
# Confirm the app's generated Android manifest contains our service and
# a tools:node remove marker for Expo's original service.
grep -n -E 'AutoAssistFirebaseMessagingService|ExpoFirebaseMessagingService' android/app/src/main/AndroidManifest.xml

# Compile native code and inspect Gradle output:
cd android
./gradlew :app:assembleDebug
cd ..

# On the connected Android phone, during a new background job request:
adb logcat -s AutoAssistOverlay:D FirebaseMessaging:D '*:S'
```

When `lastDecision = "no background data received"`, focus on FCM
delivery and the final merged Android manifest; when it says
`"overlay_permission_missing"`, enable **Appear on top**; when it says
`"app_in_foreground"`, the RN mechanic dashboard is supposed to show
its own card. `"window_manager_error"` means native window creation
failed on the phone; inspect adb logcat.

## Release only after testing

Once all relevant test cases pass in a local development build, use
the separately configured EAS `preview` APK for a pilot or EAS
`production` for store submission. Do **not** merge this draft PR
into the working branch until the on-device overlay behavior is confirmed.
