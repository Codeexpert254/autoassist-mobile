# AutoAssist Marketplace Payments & Provider Earnings — Pilot Foundation

**Implementation state (2026-11-06):** The finance *reporting foundation* is active. **No real marketplace collection, commission settlement, cash-debt recovery or rider payouts are active.** This is not a cash wallet.

## Live feature flags

The Supabase `public.marketplace_fee_policy` row `pilot` contains:
- Parts seller commission: **10%** of part subtotal (the existing `parts_orders.commission_kes` snapshot remains authoritative for historical parts orders).
- Proposed towing commission: **10%** of the locked towing fare (can be changed before activation).
- Rider commission: **0%**.
- Indicative rider fare: **KES 150 pickup + KES 35 per approximate kilometre**, calculated from coordinates when both are available. This is **not** the customer's agreed, collected delivery fee and is **not** payable without a confirmed order quote.
- `collection_enabled=false`, `payouts_enabled=false`, `cash_fallback_enabled=false`.

Do **not** set these flags to true until the payment gateway, callback verification, payout process and reconciliation are configured, tested, and approved.

## What's implemented

- A restricted finance schema in Supabase using additive migration
  `marketplace_finance_foundation_no_money_movement`:
  - `marketplace_fee_policy`: published pilot pricing and feature switches;
  - `marketplace_payments`: payment attempts and confirmed receipts;
  - `marketplace_payouts`: provider/rider disbursement records;
  - `marketplace_ledger_entries`: idempotent accounting events.
- Row-level security: authenticated users can read only authorized payment, payout and ledger rows. Ordinary application users cannot INSERT/UPDATE/DELETE financial records. Secrets are server-side only.
- Existing Parts Dealer, Towing, and Rider dashboards link to `/earnings`.
- `/earnings` distinguishes **indicative fees** from **verified receipts** and **actually paid payouts**; it cannot initiate money movement.
- Restricted super-admin report: `marketplace-finance-admin` Edge Function deployed with JWT verification and a server-side `get_autoassist_admin_role` check; the admin web project has a Marketplace Finance tab.
- No changes to the five native Android test package IDs, build variants or Firebase configurations.

## Financial design: planned collection, not yet available

**Parts:** Customer is shown spare-part subtotal + *approved delivery quote* and pays via an authorized provider. Backend creates a unique payment attempt, verifies the provider's authenticated settlement result and recorded amount, and then posts the commission, dealer payable and rider payable as separate idempotent ledger entries. After delivery confirmation and dispute checks, authorized B2C disbursements can be released. Do not confuse a customer delivery acknowledgment with a receipt.

**Towing:** Offer the already-locked towing fare. When prepaid, collect before payable settlement and deduct configured commission. For approved cash jobs, record a verified provider-declared cash receipt and a commission debt **only after an explicit reconciliation process**; use debt limits and an appeal/override process. Never block urgent roadside safety assistance without a fallback.

**Rider:** Show an agreed fixed quote **before accepting** a delivery, including eligibility and distance/effort. Do not collect a rider commission during the pilot. Confirm pickup, delivery and customer acceptance. Pay to rider M-PESA number after payment and delivery verification. Proposed scheduled payout frequency: daily or weekly, dependent on the authorized partner's B2C terms. Ensure double-payout prevention.

## Not implemented: must complete before using real funds

1. Select a licensed PSP or eligible Safaricom Daraja account and validate merchant/marketplace settlement permissions, M-PESA collections, refunds and B2C payout capability.
2. Implement server-only STK initiation with amount computed from locked server-side price. Check phone format and authorize the owning Motorist.
3. Add verified callback handling or authenticated payment-status reconciliation; match exact amount/reference; enforce one valid paid attempt per order; never trust screenshots or client-set payment flags.
4. Add order/tow invoicing with locked rider-delivery quote and explicit payment-choice consent. Connect completion and dispute states to payout eligibility.
5. Implement double-entry balance reconciliation, provider commission-wallet collections for explicitly approved cash jobs, reminders, grace periods and an appeal mechanism.
6. Add B2C payout initiation **only** after available funds and verified completion, with idempotency, callback confirmation, payout failure/retry and administrator audit log.
7. Run provider sandbox tests, failure/retry/double-POST tests, reversals/refunds and accounting reconciliation; obtain legal/tax and PSP review.
8. Only then enable production flags through an audited administrator process.

**Never** seed fake "paid" rows into live tables for UI testing. Use a dedicated sandbox project and label test records.

## Applying app changes from GitHub

Developer uses a locally modified branch `test/autoassist-parts-preview` in `~/Developer/autoassist-parts-preview`, which differs from the remote `feature/parts-dealer-dashboard`.

Back up conflicting files first. Fetch and restore **only**:
- `src/services/marketplace-finance.ts` (new)
- `src/app/earnings.tsx` (new)
- `src/app/partsdealer/dashboard.tsx`
- `src/app/towing/dashboard.tsx`
- `src/app/rider/dashboard.tsx`
- `admin-web/app.js`
- `admin-web/index.html`

Run `npx tsc --noEmit` and `npx expo start --clear`. Changes do not require an Android native rebuild in the existing dev clients.

Never run `git add -A` from a project with `google-services.json`, `firebase-test/**` or `modules/**/build` present before auditing the staging list. Do not push the previously reversed accidental commit containing generated artifacts.
