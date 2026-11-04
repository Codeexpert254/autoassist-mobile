# AutoAssist spare-parts marketplace (pilot)

## Seller flow
1. Sign up with **Parts Dealer** role or use a **Mechanic / Garage** account.
2. Register the shop and await admin approval.
3. Add inventory with category, New/Refurbished/Used condition, compatible
   vehicles, SKU, KES price, stock count, and multiple product photos.
4. Approved open shops with positive stock appear in motorist search.
5. Accept only in-stock orders; decline or set stock to zero as appropriate.
6. Once an accepted order is packed, mark ready to dispatch a verified Rider.

## Motorist flow
1. Compare available parts and seller ratings.
2. Place an order; optionally associate it with a current repair request.
3. Add delivery address and phone; order placement takes no money.
4. Track status and confirm actual physical delivery.
5. Rate the seller and rider independently after delivery.

## Commission and payment boundaries
- Admin-configurable 5%–10% commission; default 7.5%.
- Each order freezes its commission rate at creation.
- Commission is marked accrued only after motorist-confirmed delivery.
- Pay-on-delivery is **pilot only**: there is no automatic platform payment,
  commission collection, rider fee collection, or seller payout.

## Access controls
- Shops and riders must pass verification.
- Dealer stock reservation occurs atomically at acceptance.
- Job-specific two-minute rider offers target a verified available rider,
  excluding busy and previously offered riders.
- Only the selected rider receives an offer; no customer contact details
  are revealed until a rider accepts.
- `parts-rider-dispatch` authenticates the requesting buyer or seller.
- `create_parts_delivery_offer` RPC is granted to service_role only.
- Notification routing is role-checked and uses private per-user device tokens.

## Manual test cases
- Verify first-time seller and garage shop registration and admin approval.
- Upload and remove multiple product photos, including Used condition.
- Place an order, approve it, then confirm its stock count decreases.
- Decline as out-of-stock; confirm zero stock and listing no longer shown.
- Order the last stock item concurrently; ensure no overselling.
- Verify other sellers cannot see or accept the order.
- Verify rider offer expires and transfers to another eligible rider.
- Confirm rider pickup, customer receipt, one dealer and one rider rating.
- Check commission at 5%, 7.5%, 10%; ensure no payment was charged.
- Re-test mechanic GPS/map, payment and floating popup behavior.

Production marketplace migrations have already been applied in the linked
Supabase project. This branch includes the newest rider dispatcher migration,
not a full clean-room schema export. Earlier marketplace migration history must
also be exported if deploying to a new project.
