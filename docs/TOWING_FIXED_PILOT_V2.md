# AutoAssist fixed towing pilot tariff (November 2026)

## Live Supabase migration
The following migrations were applied to the connected AutoAssist Supabase project:
- `fixed_towing_pilot_tariff_and_multiple_capabilities`
- `restrict_new_towing_request_rpcs_to_authenticated`

The live project owns the executed SQL and migration records. Do not attempt to run the migration twice manually.

## Pricing version 2
The server owns the accepted towing price. Users see the same tariff in-app; agents do not enter their own price.
- Saloon/sedan: KES 4,000 dispatch base + KES 150/km
- SUV/pickup: KES 4,500 dispatch base + KES 180/km
- Light truck/van: KES 5,200 dispatch base + KES 220/km
- Standard recovery additional: KES 2,500 (flatbed and wheel lift no surcharge)
- Distance: GPS great-circle distance multiplied by 1.35 as a **road-distance allowance**. Minimum billable estimated distance 1 km. Total is rounded upward to the next KES 100.

**Important limitation:** This is an approximate pre-agreed tariff based on estimated distance, not actual measured or provider-verified road kilometres. Before production, implement a server-side driving-route calculator, rate governance, and a published policy for inaccessible locations, specialist recoveries, refunds, and distance disputes.

## Main RPCs and data
- `create_priced_towing_request`: validates authenticated motorist, saves estimated kilometres and fixed fare; dispatch unchanged
- `respond_towing_offer`: eligible agent accepts assigned fixed fare, without price-edit input
- `match_towing_agent`: only verified agents approved for the requested `service_type`
- `set_towing_capabilities`: allows a pending verification record to declare one to three capabilities
- `towing_agent_profiles.service_types`: text[] capabilities, supported values `flatbed`, `wheel_lift`, `recovery`
- `towing_requests.service_type`, `estimated_route_km`, `pricing_version`: price provenance and dispatch requirements

Previously created v1 towing requests still use the legacy quote state and may need cancellation/rebooking to use the new tariff. Do not automatically charge or silently alter an existing customer's price.

## Before release
- Run `npx tsc --noEmit` on the preview worktree and test on Android.
- Create a towing request with two precise GPS pins and check UI total against `quote_kes` in Supabase.
- Verify that a capability-restricted towing agent never receives an unsupported service.
- Test accepted, declined, expired, cancelled, completed and rated jobs.
- Obtain tow-operator buy-in on proposed rates and confirm VAT/fees with a Kenyan tax adviser.
- Online payment collection and net commission settlement are NOT implemented.
