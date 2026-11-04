# Android floating mechanic offers (opt-in)

The existing AutoAssist React Native offer card remains unchanged when the app is open.
Android's native overlay only runs for an authenticated mechanic who turns on
**Floating job popups** in the verified Mechanic Dashboard and manually grants
Android's **Appear on top** special access.

## Architecture

- `expo-notifications` continues to own ordinary push notifications via
  `AutoAssistFirebaseMessagingService : ExpoFirebaseMessagingService`, which
  calls `super.onMessageReceived` before processing any overlay data messages.
- The Supabase dispatch and decline-retry Edge Functions send **two** separate
  pushes per job: an ordinary FCM notification (always the fallback) and a
  short-lived, high-priority **data-only** alert with type
  `mechanic_offer_overlay`, recipient ID, offer ID and expiry.
- The Android module checks local opt-in, recipient ID, permission, expiry,
  foreground state and lock state before using `TYPE_APPLICATION_OVERLAY`.
- **Dismiss** hides the overlay locally; **View & respond** opens
  `/mechanic/job-offer?offerId=...` in AutoAssist. No direct accept from an
  unauthenticated window. The existing server function validates the mechanic,
  availability, offer ownership and expiry when accepting.
- The popup self-closes when the two-minute offer expires. Android can delay
  data-only pushes or suppress overlays on some devices/OS versions. Never
  rely on an overlay as the sole notification method. No persistent foreground
  service, accessibility service or full-screen intent is used.

## Test and deployment

1. Apply this branch **without overwriting your uncommitted** `app.json`,
   `eas.json` and `google-services.json` changes. Keep the tested package
   `com.company.autoassist`, Firebase file, EAS project ID, and EAS preview
   environment variables.
2. Build a fresh **native** Android APK using
   `npx eas-cli@latest build --platform android --profile preview`.
   An over-the-air JS update cannot install the Kotlin module or manifest.
3. Sign in as an **approved** mechanic. Tap **Go Online**, and check
   **Phone notification setup**. Tap **Enable floating job popups**.
4. In Android's special access settings, grant **Appear on top** to AutoAssist;
   return to the mechanic dashboard and tap **Enable floating job popups**
   again. You can later disable it using the same dashboard control.
5. With the mechanic online, switch to another app and create a new motorist
   repair request on a second device. You should see an optional floating
   popup when Android delivers the data-only FCM message. Confirm that
   tapping **View & respond** goes to the correct live offer.
6. Test **app open** (in-app card), **background** (floating popup plus push
   notification), **overlay disabled**, **locked screen**, **expired offer**,
   **wrong signed-in account**, and **logout** (no floating popup).
7. The two changed Edge Functions have already been deployed to the connected
   Supabase AutoAssist project (dispatch-repair-request v18 and
   respond-mechanic-offer v17). Retain these versions when testing the APK.
   A native Android APK rebuild is still required.

## Background popup diagnostics

The **Mechanic dashboard → Check background popup diagnostics** button shows
four non-sensitive fields: overlay permission, opt-in, time of last native
FCM data-only offer, and last processing result.

- `native_module_not_in_build`: reinstall a development APK with this module.
- `no background data received`: check Android merged manifest contains only
  the AutoAssist FCM service and use adb logcat to verify incoming data pushes.
- `overlay_permission_missing` / `opt_in_disabled`: enable special access and
  the app's Floating job popups toggle.
- `account_mismatch`: wrong user is signed in; log out and register current
  mechanic's token on this device.
- `app_in_foreground`: expected; the React Native mechanic dashboard handles it.
- `window_manager_error`: use adb logcat for Android device-specific failure.
- `overlay_displayed`: native window was added to WindowManager; if invisible,
  check manufacturer overlay and battery/background permissions.

## Android limitations

`SYSTEM_ALERT_WINDOW` is a sensitive, opt-in Android special access.
On Android 11+, the permission screen may be a list of apps, even when
launched with a package URI. Some manufacturer firmware can restrict overlay
windows or background data pushes. Never auto-open the permission settings,
request accessibility access, show private motorist contact details, or
launch a full-screen intrusive activity without the mechanic's consent.
