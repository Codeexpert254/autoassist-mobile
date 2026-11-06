# Role dashboard UX and logout update (November 2026)

All five roles have a visible sign-out action on the primary dashboard:

- Motorist: existing logout button retains the demo-safe and Supabase logout logic.
- Mechanic: existing sign-out now asks for confirmation, goes offline where possible,
  and disables native floating offers before ending the session.
- Parts Dealer: visible logout action under the dashboard header.
- Towing Agent: visible logout action under the dashboard header.
- Rider: visible logout action under the dashboard header.

The common sign-out action asks for confirmation, calls the AuthProvider's
signOut (including revocation of this app installation's push token where
possible), and redirects to role-selected login. It does **not** delete the
user account or sign out sessions in the other separately installed role apps.

Usability improvements:
- Motorist: scrollable home for smaller screens, clearer service choices,
  direct towing tracking link and explanatory help text; navigation and
  repair requests are unchanged.
- Mechanic: modern dark partner status hero, more prominent availability,
  labeled performance/jobs groups and clearer action guidance.
- Dealer: next-step card to guide order processing, active fulfillment or
  inventory creation, plus working metric links from the prior fix.
- Rider and Towing: existing richer dashboard design retained; logout
  receives a separate responsive header strip to avoid narrow-phone crowding.

Testing checklist on the installed role apps:
1. Log in to each account and confirm dashboard shows the correct role.
2. On each dashboard, select Log out and cancel. Confirm you stay logged in.
3. Select Log out again and confirm; verify login screen appears.
4. Sign in again; verify no onboarding or account data was lost.
5. Confirm the Motorist page scrolls and the towing-tracking link works.
6. Check Mechanic availability switching, new offers and active jobs.
7. Check Dealer Next Steps, New Orders, In Progress and Products links.
8. Check Towing and Rider maps, live job updates and notifications.
9. Verify separate app sessions: logging out Rider does not log out Motorist.

No native Android plugin or Firebase files changed here; these are JS/TS-only
updates for the development builds. A Metro refresh normally suffices.
TypeScript compilation and Android-device UI testing still need to be run
on the developer's local checkout.

When copying code, back up local modified preview files and never reset the
original ~/Developer/autoassist folder.
