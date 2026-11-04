# AutoAssist dispatch Edge Functions

The dispatch system uses these deployed functions:

- `dispatch-repair-request` — ranks verified, available mechanics and creates one expiring offer at a time.
- `respond-mechanic-offer` — accepts/declines a mechanic offer and creates the KES 500 connection-payment gate after acceptance.
- `mpesa-stk-push` — initiates Safaricom Daraja M-PESA Express for the AutoAssist connection fee.
- `mpesa-callback` — receives Safaricom payment results and unlocks the connection only after a successful callback.
- `get-connection-contact` — returns direct participant contact details only after the connection payment is confirmed.

## M-PESA secrets

Do not place Daraja credentials in the Expo application or commit them to Git.
Configure these directly as Supabase Edge Function secrets:

- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_ENV` — `sandbox` or `production`
- `MPESA_CALLBACK_URL` — `https://liiqdzsovqxxbotnbbwx.supabase.co/functions/v1/mpesa-callback`
- `MPESA_CALLBACK_SECRET` — generate a strong random value and keep it server-side only

`mpesa-stk-push` appends the callback secret to the configured callback URL. The public callback function validates that secret before it processes a result.

Until the Daraja secrets are configured, the payment function intentionally returns `mpesa_not_configured`. The application must never simulate a paid connection in live-backend mode.

## Push notifications

The React Native application uses Expo push notifications. Mechanics can still receive and respond to offers through dashboard polling when push is unavailable.

Remote push notifications require:

1. an EAS project ID for AutoAssist,
2. a development or production native build,
3. notification permission on the mechanic's device.

Do not invent or hard-code an EAS project ID. Configure the real AutoAssist EAS project and rebuild the native app when push testing begins.
