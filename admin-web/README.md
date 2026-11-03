# AutoAssist Admin Web

This is the private operations console for AutoAssist administrators. It is intentionally separate from the React Native / Expo Router application under `src/app`.

## Security boundary

- The Android/iOS app does not import or route to this folder.
- The browser uses only the Supabase project URL and publishable key.
- The Supabase `service_role` key is never placed in the browser.
- Every privileged request is sent to a JWT-protected Edge Function.
- Edge Functions verify the signed-in user against the server-controlled `private.admin_users` table before using service-role access.
- Verification documents remain in the private `mechanic-verification` bucket and are exposed to authorized reviewers only through short-lived signed URLs.

## Local setup

1. Copy the example config:

   ```bash
   cd admin-web
   cp config.example.js config.js
   ```

2. Edit `config.js` and paste the same **publishable** Supabase key used by the mobile app. Do not put a service-role or secret key here.

3. Serve the directory over HTTP:

   ```bash
   python3 -m http.server 4173
   ```

4. Open `http://localhost:4173` in a browser and sign in with an authorized Supabase Auth account.

## Current live modules

- Overview
- Mechanic verification
- Users
- Live repair jobs
- Connection payments
- Analytics
- Admin settings / role visibility

Orders and support are shown as intentionally unconnected until corresponding production tables exist.

## Admin roles

Server-side admin roles currently supported:

- `super_admin`
- `verification_admin`
- `support_admin`
- `finance_admin`
- `ops_admin`

The initial authorized owner account is migrated to `super_admin`.
