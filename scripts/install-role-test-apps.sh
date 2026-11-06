#!/usr/bin/env bash
set -euo pipefail

# Install five independent apps on a single physically connected Android phone.
# NEVER uninstall or overwrite the base com.company.autoassist package.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PHONE="${1:-}"
if [[ -z "$PHONE" ]]; then
  echo "Usage: bash scripts/install-role-test-apps.sh <ADB_DEVICE_SERIAL>"
  echo "Check serial with: adb devices"
  exit 2
fi
if ! adb -s "$PHONE" get-state | grep -qx 'device'; then
  echo "Device $PHONE is not connected. Check adb devices."
  exit 1
fi

node scripts/check-role-firebase.js
if [[ ! -f android/app/build.gradle ]]; then
  echo "Missing Android native project. Back up Android and run Expo prebuild first."
  exit 1
fi
if ! grep -q 'AUTOASSIST_TEST_FLAVORS_START' android/app/build.gradle; then
  echo "Test flavors not found in android/app/build.gradle."
  echo "Back up android, then run: npx expo prebuild --platform android --clean"
  exit 1
fi

echo "Building five role-specific APKs for the phone. Main AutoAssist is untouched."
(
  cd android
  ./gradlew \
    :app:assembleMotoristDebug \
    :app:assembleMechanicDebug \
    :app:assembleDealerDebug \
    :app:assembleTowingDebug \
    :app:assembleRiderDebug \
    -PreactNativeArchitectures=arm64-v8a --no-daemon
)
for role in motorist mechanic dealer towing rider; do
  apk="android/app/build/outputs/apk/${role}/debug/app-${role}-debug.apk"
  if [[ ! -f "$apk" ]]; then
    echo "The expected $role APK was not found at: $apk"
    echo "Search output: find android/app/build/outputs/apk -name '*.apk'"
    exit 1
  fi
  echo "Installing $role: $apk"
  adb -s "$PHONE" install -r "$apk"
done
echo "Finished installing Motorist, Mechanic, Dealer, Towing and Rider test apps."
echo "Main AutoAssist was not uninstalled or modified."
