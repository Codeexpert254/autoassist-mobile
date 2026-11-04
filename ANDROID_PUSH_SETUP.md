# AutoAssist Samsung push notifications

This document complements the working **foreground in-app request card**.
The foreground card uses Supabase Realtime and a 5-second fallback poll.
For notifications when AutoAssist is backgrounded or not open, the Android
app must register for Firebase Cloud Messaging (FCM) through Expo's push service.

## 1. Why Android background notifications may not arrive

The backend calls Expo's push service when a mechanic is offered a job,
but messages can only be delivered to Expo push tokens registered in
`public.device_push_tokens`. A user granting notification permission does
not itself create a token.

The `src/services/push-notifications.ts` registration code requires
`Constants.easConfig.projectId` or `expo.extra.eas.projectId`.
Without an EAS project ID, it reports the missing link. It also needs a
native Android build configured with Firebase Cloud Messaging.

Open **Mechanic dashboard → Check phone notification setup** for registration
diagnostics; do not copy device tokens or credentials into chat.

## 2. Link AutoAssist to Expo

In the AutoAssist repository on the developer Mac:

```bash
npx eas-cli login
npx eas-cli init
```

The CLI creates or links the EAS project and writes
`expo.extra.eas.projectId` to `app.json`.
If you already have an Expo project for AutoAssist, link it rather than
making a second project. Commit the resulting nonsecret app config change.

## 3. Set up Firebase Cloud Messaging v1

1. Find the existing Android application ID in the local native
   `android/app/build.gradle` file. Reuse the **same** ID in Firebase
   and in `expo.android.package`, rather than changing the package ID
   of a working installation without planning a migration.
2. In Firebase Console, create or select a project, add an Android app
   with that application ID and download `google-services.json`.
3. Put `google-services.json` in the AutoAssist project and set
   `expo.android.googleServicesFile` to `./google-services.json`.
   This file contains client application configuration, not the private
   FCM service-account credential.
4. In Firebase Console → Project settings → Service accounts, generate an
   FCM v1 service-account JSON key. Upload this **privately** through
   Expo dashboard → Project settings → Credentials → Android →
   FCM v1 service-account credentials (or `npx eas-cli credentials`).
   **Never commit or share the private service-account JSON file.**
5. Rebuild/reinstall the Android native app after changing Firebase
   native configuration. A Metro restart alone cannot add FCM to an
   already-installed APK. Local `npx expo run:android --device` or an
   EAS development build can be used once the native configuration is ready.

## 4. Confirm on the Samsung

1. Allow AutoAssist notifications in Android Settings.
2. Under AutoAssist notification categories/channels, enable sound and
   **Incoming service requests** (channel `incoming-requests-v2`).
   Ensure the phone isn't on silent/DND and check any Samsung background
   battery restrictions.
3. In the mechanic dashboard, tap **Check phone notification setup**.
4. Once an Expo push token has been registered, place AutoAssist in the
   background and make a **new** motorist request.
5. Open the notification to navigate to the offer's **Accept/Decline**
   screen. It should not reveal motorist phone/contact before payment.

## 5. Matching after decline

A decline automatically attempts another eligible untried mechanic.
If there are no other suitable online mechanics, the motorist can tap
**Retry matching — keep this request**, rather than describing the issue
again. A manual retry can offer the same still-eligible mechanic again
when there is no alternative, with a 10-second cooldown and no more than
three offers to that mechanic for that request. This prevents automated
spam while still supporting a two-phone test.

## References

- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/push-notifications/fcm-credentials/
- https://docs.expo.dev/versions/v58.0.0/sdk/notifications/
