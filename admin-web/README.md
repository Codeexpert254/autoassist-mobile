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

## Sandbox payment testing (super-admin only)

The **Sandbox testing** admin section allows an authorized super-admin to simulate
success or failure of the KES 500 motorist connection fee, without invoking Daraja
or transferring money. This is **not** part of the mobile application's routes or bundle.

It is deliberately disabled unless both server-only Edge Function secrets are set:

- `MPESA_ENV=sandbox`
- `AUTOASSIST_PAYMENT_SIMULATOR_ENABLED=true`

Set these via **Supabase Dashboard → Edge Functions → Secrets**; never put the
opt-in flag or any Daraja secret in `EXPO_PUBLIC_` variables or in browser config.
Switching `MPESA_ENV` to `production` disables simulation regardless of the flag.
Turn the flag off when testing is complete.

To test:

1. With the two Android phones, create a repair request and have the mechanic accept it.
2. In this admin web console, sign in as an authorized **super_admin**.
3. Open **Sandbox testing**. Locate the accepted repair request (KES 500).
4. Choose **Simulate success** or **Simulate failure**, then type the required
   confirmation phrase exactly.
5. On the mobile devices, refresh the assignment/payment screen. A successful
   simulation unlocks contact details and attempts to push test-only notifications.

Safety limitations:

- All actions are checked on the server for admin role and sandbox opt-in.
- An actual paid/refunded transaction or an active Daraja checkout cannot be simulated.
- Simulation creates/updates a record using `provider=sandbox_simulator`, not `mpesa`.
- Simulated fee amounts are **excluded from real revenue metrics** in this console.
- The database RPC is atomic and callable only by Supabase's `service_role`.
- No genuine Safaricom payment or receipt is produced.
- The simulator is **not a substitute** for verifying Daraja settlement before launch.

## Current live modules

- Overview
- Mechanic verification
- Users
- Live repair jobs
- Connection payments
- Super-admin-only sandbox payment testing (opt-in)
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
