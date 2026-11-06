# AutoAssist towing milestone alerts and custom sounds

## Files on the developer Mac

Copy the sound assets from `~/Developer/autoassist/assets/notifications` to
`~/Developer/autoassist-parts-preview/assets/notifications` before rebuilding.

Supported names (with extensions):
- `default.wav` (preferred) or `default.mp3`: primary chime
- `default1.wav` (preferred) or `default1.mp3`: backup chime

The dynamic `app.config.js` checks the actual filenames. If the primary is missing,
the backup is chosen. If both are missing, native system sounds remain in use.
A backup sound is **not** a mechanism to override the device's silent or DND mode.

Custom sounds are native resources. Expo's `expo-notifications` config plugin
bundles them during prebuild, so a native rebuild is mandatory. New Android
notification channel IDs are used because Android doesn't let an app change the
sound of an already-created channel.

## Job milestones

The Towing Agent's first tap of **Navigate in app** or **Google Maps** on an
assigned pickup saves `agent_departed_at` by the authenticated
`mark_towing_departure` RPC, then calls `towing-status-alert`.

Agent progress actions produce:
- `departed` – agent heading to customer
- `arrived` – agent at pickup
- `en_route` – customer vehicle heading to drop-off
- `completed_by_agent` – agent reports vehicle delivered; motorist must confirm

The Supabase Edge Function validates the caller and milestone, targets only the
Motorist's enabled device push tokens, and deduplicates successful submissions
in `towing_alert_deliveries`. Push submission is best-effort; downstream Expo
receipts, permissions, device network, DND and OS policies still affect delivery.

When the Motorist's tracking screen is in the foreground, it polls for updates,
shows a one-time popup for new milestones, and can play a local notification
if no current device push registration is cached.

Existing dispatch functions for mechanic, towing and rider jobs now use
`autoassist-offers-v4` so they can play the primary custom sound when bundled.
`autoassist-updates-v2` handles general updates and
`autoassist-status-v1` handles customer progress.

## Test plan
1. Verify Expo config lists both native sound assets.
2. Rebuild Android, allow notifications, sign in on two different devices.
3. Create a Motorist tow, accept it as a Towing Agent.
4. Tap **Navigate in app** on the agent device; verify the Motorist receives a
   sound/banner and the tracking page shows "Towing agent heading to you".
5. Mark arrival, start towing, and mark vehicle delivered. Verify each alert
   and the customer's confirmation action.
6. Repeat with Motorist in foreground and background. Verify no cross-account
   notification, and no alert repeats after status is unchanged.

Native worktree overlays/custom modifications must be backed up before a clean
prebuild. This code has not been successfully compiled on the developer's Mac
at the time of authoring.
