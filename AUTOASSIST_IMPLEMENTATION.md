# AutoAssist static screen implementation

This project now contains static Expo Router screen coverage for the remaining AutoAssist Figma flows.

## Preserved user-built screens

The existing screens were left in place, including:
- Splash / onboarding / login / register / role selection
- Shared account screens already present at project root
- `src/app/motorist/home.tsx`
- `src/app/motorist/addavehicle.tsx`

## Added route groups

### Motorist
Remaining flow from problem description through repair, parts, towing, history and vehicle details.

### Mechanic
Registration, verification, dashboard, job offer/details, navigation, inspection, quote, approval, work progress, parts, completion, earnings, profile and history.

### Parts dealer
Registration, verification, dashboard, inventory, product management, orders, preparation, rider handoff, sales, store profile, returns, analytics and staff/branches.

### Rider
Registration, verification, dashboard, delivery offer/details, pickup verification, active delivery, completion, earnings, history, profile and delivery issue.

### Towing
Registration, verification, dashboard, offer/details, navigation, pickup check, vehicle secured, active tow, completion, earnings and profile.

### Shared operations & safety
Payment methods, add payment method, help center, support ticket, security, privacy/permissions, safety/emergency and account management.

### Admin / Operations
Overview, verification queue/detail, live dispatch, orders/deliveries, payments/payouts, support/disputes, users, marketplace quality and analytics.

## Shared implementation

- `src/components/autoassist-ui.tsx`
- `src/data/autoassist-screens.ts`
- `src/data/admin-screens.ts`

The shared UI layer uses normal React Native layout rather than Figma absolute coordinates so it is a better base for the upcoming responsive pass.

## Intentionally not wired yet

- Button navigation / back actions
- API/backend data
- Authentication
- Dynamic marketplace data
- Location/maps
- Form validation beyond the user's existing Register work
- Keyboard handling
- Final device-by-device responsive tuning
- Reusable icon/image asset pass

These should be handled after static visual QA in Expo Go.
