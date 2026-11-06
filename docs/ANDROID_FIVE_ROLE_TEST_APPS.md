# Test all five AutoAssist roles on one Samsung Android phone

## Purpose

This is a **developer-testing configuration**, not five independent Play Store products.
The original main AutoAssist remains installed and untouched.

Flavor names and resulting Android application IDs are generated from your
existing `expo.android.package` (normally `com.company.autoassist`):

| Flavor | Launcher name | Application ID |
| --- | --- | --- |
| `mainapp` | AutoAssist | `<base>` (unchanged) |
| `motorist` | AutoAssist Motorist | `<base>.test.motorist` |
| `mechanic` | AutoAssist Mechanic | `<base>.test.mechanic` |
| `dealer` | AutoAssist Dealer | `<base>.test.dealer` |
| `towing` | AutoAssist Towing | `<base>.test.towing` |
| `rider` | AutoAssist Rider | `<base>.test.rider` |

Six Gradle flavors exist so the original main flavor can still be compiled
explicitly with `:app:assembleMainappDebug`, but the test installer builds
**only the five test flavors**. Every installed flavor has its own app sandbox,
session, permissions and notification channels. All connect to the same Supabase
project, so use five distinct test accounts with the matching roles. They do
not bypass authentication or verification.

## Prerequisite: Firebase

Android FCM push notifications and Google Services require a Firebase Android
app whose package name matches the unique application ID.

1. Determine the base package from the current local Expo configuration:
   `node -e 'const c=require("./app.config.js")({config:require("./app.json").expo});console.log(c.android.package)'`
2. In the SAME Firebase project already used by main AutoAssist, register:
   `<base>.test.motorist`, `<base>.test.mechanic`,
   `<base>.test.dealer`, `<base>.test.towing`, `<base>.test.rider`.
3. Download **each app's matching google-services.json** to these local paths:
   - `firebase-test/motorist/google-services.json`
   - `firebase-test/mechanic/google-services.json`
   - `firebase-test/dealer/google-services.json`
   - `firebase-test/towing/google-services.json`
   - `firebase-test/rider/google-services.json`
4. Keep your original `google-services.json` and main AutoAssist installation
   unchanged. `firebase-test/` is gitignored.
5. Validate with `node scripts/check-role-firebase.js`.

The Expo config plugin copies these Firebase files into
`android/app/src/<flavor>/google-services.json` during native prebuild.
It also adds six Gradle product flavors and per-flavor launcher names.
Do NOT just copy the main app's Firebase JSON to every test role.

## Native preparation

Use the **preview** worktree only:
```bash
cd ~/Developer/autoassist-parts-preview
git fetch origin
# Back up any local uncommitted source edits first.
git restore --source=origin/feature/parts-dealer-dashboard -- \
  app.config.js .gitignore \
  plugins/with-autoassist-test-flavors.js \
  scripts/check-role-firebase.js \
  scripts/install-role-test-apps.sh
node scripts/check-role-firebase.js
npx tsc --noEmit
node -e 'const c=require("./app.config.js")({config:require("./app.json").expo});console.log(c.plugins)'
```

After the Firebase check passes, back up your generated native `android`
folder and run **one** new prebuild:
```bash
cp -R android "../autoassist-parts-native-backup-$(date +%Y%m%d%H%M%S)"
npx expo prebuild --platform android --clean
grep -A45 AUTOASSIST_TEST_FLAVORS_START android/app/build.gradle
```
Check that your existing custom chimes
(`assets/notifications/autoassist_alert.wav`,
`assets/notifications/autoassist_alert_backup.wav`) are still bundled.
Custom sounds require a native build.

## Build and install on the Samsung

Get the connected device serial from `adb devices`.
```bash
bash scripts/install-role-test-apps.sh "YOUR_ADB_SERIAL"
```
This calls five debug Gradle variants for arm64-v8a, then `adb install -r`
for each test app. The base app ID is NEVER used by the installer.

To build just one flavor:
```bash
cd android
./gradlew :app:assembleMotoristDebug -PreactNativeArchitectures=arm64-v8a
cd ..
```

To launch after installation, use the app icons or
`adb -s YOUR_ADB_SERIAL shell monkey -p <applicationId> -c android.intent.category.LAUNCHER 1`.

Start the shared development server using `npx expo start --clear`.
Use `adb -s YOUR_ADB_SERIAL reverse tcp:8081 tcp:8081` to connect by USB/wireless ADB.

## Notes

- All five APKs depend on one Metro server; only one phone app is displayed
  in the foreground at a time.
- On Android, background delivery depends on notification permissions, FCM,
  battery optimizations, and the OS; five concurrent background apps may be
  restricted. Log into each role to register its own Expo push token.
- The same `autoassist://` scheme is shared by all role flavors. Deep links
  and OAuth redirect flows can show an Android app chooser. Role-specific
  schemes should be added before production use.
- `expo run:android` without a variant can become ambiguous when flavors are
  enabled. Use `--variant motoristDebug --app-id <base>.test.motorist` or use
  the installer for all five.
- Firebase configs and local environment files must not be committed.
- Do not execute `adb uninstall` on the original package, and do not run
  `git reset --hard` or overwrite the original `~/Developer/autoassist` project.
