# AutoAssist backend activation

The app currently keeps the presentation-safe local Motorist/Mechanic state while the Supabase backend layer is ready to be activated.

## Stack

- Supabase Auth for Motorist and Mechanic accounts
- PostgreSQL for profiles, vehicles, repair requests, inspections, quotes, ratings and repair status history
- Row Level Security so motorists/mechanics only access repair records they participate in
- Supabase Realtime for repair request, inspection and quote updates
- Expo SQLite localStorage polyfill for persisted Supabase sessions

## Environment

Copy `.env.example` to `.env` and set:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Never put a Supabase secret/service-role key in the Expo application.

## Install dependencies

```bash
npm install
```

The branch includes these backend packages in `package.json`:

- `@supabase/supabase-js`
- `react-native-url-polyfill`
- `expo-sqlite`

## Database

Apply:

```text
supabase/migrations/20261102_initial_autoassist.sql
```

The migration creates the Motorist/Mechanic data model, indexes, triggers, RLS policies and realtime publication entries.

## App integration files

- `src/lib/supabase.ts` — guarded Supabase client
- `src/services/repair-backend.ts` — auth and repair service calls
- `src/context/repair-flow-context.tsx` — current presentation-safe local repair state

The next integration step is to make `repair-flow-context.tsx` use `repair-backend.ts` when Supabase is configured while retaining local state as a development fallback.
