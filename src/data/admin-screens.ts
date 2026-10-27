export type AdminConfig = {
  title: string;
  subtitle: string;
  active: string;
  metrics?: Array<{ title: string; value: string; meta?: string }>;
  items?: Array<{ title: string; subtitle: string }>;
};

export const adminScreens: Record<string, AdminConfig> = {
  overview: {
    title: "Operations overview",
    subtitle: "Live health across providers, dispatch, payments and support.",
    active: "Overview",
    metrics: [
      { title: "Active jobs", value: "128", meta: "+12% today" },
      { title: "Providers online", value: "486", meta: "Nairobi region" },
      { title: "GMV today", value: "KSh 2.84M", meta: "Repairs + parts + towing" },
      { title: "Open tickets", value: "31", meta: "6 high priority" },
    ],
    items: [
      { title: "Verification queue", subtitle: "42 provider applications need review" },
      { title: "Live dispatch exceptions", subtitle: "8 jobs outside normal SLA" },
      { title: "Payment monitoring", subtitle: "3 payout holds require review" },
    ],
  },
  verification: {
    title: "Verification queue",
    subtitle: "Review mechanic, dealer, rider and towing applications.",
    active: "Verification",
    metrics: [
      { title: "Pending", value: "42" },
      { title: "High risk", value: "4" },
      { title: "Approved today", value: "27" },
    ],
    items: [
      { title: "Kevin Mwangi • Rider", subtitle: "Insurance check pending • submitted 18 min ago" },
      { title: "Nairobi Auto Care • Mechanic", subtitle: "Business permit review • submitted 46 min ago" },
      { title: "Metro Tow Services • Towing", subtitle: "Inspection certificate review" },
      { title: "Nairobi Auto Parts • Dealer", subtitle: "Store photo and ownership review" },
    ],
  },
  verificationDetail: {
    title: "Verification detail",
    subtitle: "Application VRF-22319 • Kevin Mwangi • Rider",
    active: "Verification",
    metrics: [
      { title: "Identity", value: "PASS", meta: "ID name matched" },
      { title: "Licence", value: "VALID", meta: "Expires 2028" },
      { title: "Bike", value: "KME 482Q", meta: "Ownership matched" },
      { title: "Insurance", value: "REVIEW", meta: "Manual check needed" },
    ],
    items: [
      { title: "National ID", subtitle: "Front/back uploaded • OCR complete" },
      { title: "Driving licence", subtitle: "Class F/G • valid" },
      { title: "Motorbike registration", subtitle: "KME 482Q • ownership verified" },
      { title: "Insurance document", subtitle: "Policy number detected • verify dates" },
    ],
  },
  dispatch: {
    title: "Live dispatch",
    subtitle: "Monitor active repair, delivery and towing assignments.",
    active: "Live jobs",
    metrics: [
      { title: "Unassigned", value: "11" },
      { title: "En route", value: "74" },
      { title: "In progress", value: "43" },
      { title: "SLA risk", value: "8" },
    ],
    items: [
      { title: "REP-1028 • Repair", subtitle: "Mechanic en route • ETA 12 min • Westlands" },
      { title: "AAR-48219 • Parts delivery", subtitle: "Rider collected • ETA 18 min" },
      { title: "TOW-3901 • Towing", subtitle: "Tow truck en route • ETA 16 min" },
      { title: "REP-1040 • Repair", subtitle: "No provider accepted after 4 min • intervention suggested" },
    ],
  },
  orders: {
    title: "Orders & deliveries",
    subtitle: "Marketplace orders, rider handoffs and delivery completion.",
    active: "Orders",
    metrics: [
      { title: "Orders today", value: "386" },
      { title: "Awaiting pickup", value: "29" },
      { title: "In transit", value: "61" },
      { title: "Delivery issues", value: "7" },
    ],
    items: [
      { title: "AAR-48219 • Brake pad set", subtitle: "In transit • rider Kevin M." },
      { title: "AAR-48231 • Oil filters", subtitle: "Dealer preparing • 9 min" },
      { title: "AAR-48198 • Brake disc", subtitle: "Ready for pickup • dispatch pending" },
    ],
  },
  payments: {
    title: "Payments & payouts",
    subtitle: "Monitor captures, refunds, provider settlements and payout holds.",
    active: "Payments",
    metrics: [
      { title: "Captured today", value: "KSh 2.84M" },
      { title: "Provider payouts", value: "KSh 1.92M" },
      { title: "Refunds", value: "KSh 86k" },
      { title: "On hold", value: "KSh 41k" },
    ],
    items: [
      { title: "PAY-88721 • REP-1028", subtitle: "KSh 11,650 captured • payout pending completion" },
      { title: "PAY-88703 • AAR-48219", subtitle: "KSh 7,150 captured • dealer/rider split pending" },
      { title: "PAYOUT-2201", subtitle: "Mechanic payout hold • dispute SUP-7710" },
    ],
  },
  support: {
    title: "Support & disputes",
    subtitle: "Triage customer, provider, safety and transaction issues.",
    active: "Support",
    metrics: [
      { title: "Open", value: "31" },
      { title: "High priority", value: "6" },
      { title: "Disputes", value: "12" },
      { title: "Median response", value: "7 min" },
    ],
    items: [
      { title: "SUP-7710 • Repair charge dispute", subtitle: "High • awaiting ops review" },
      { title: "SUP-7705 • Customer unreachable", subtitle: "Rider issue • active delivery" },
      { title: "SUP-7698 • Wrong spare part", subtitle: "Dealer/customer evidence received" },
    ],
  },
  users: {
    title: "User management",
    subtitle: "Search accounts, roles, verification and enforcement status.",
    active: "Users",
    metrics: [
      { title: "Motorists", value: "48.2k" },
      { title: "Mechanics", value: "1,284" },
      { title: "Dealers", value: "412" },
      { title: "Riders + towing", value: "2,106" },
    ],
    items: [
      { title: "Abraham M. • Motorist", subtitle: "Active • 8 completed jobs" },
      { title: "Nairobi Auto Care • Mechanic", subtitle: "Verified • rating 4.8" },
      { title: "Kevin M. • Rider", subtitle: "Verified • online now" },
      { title: "Metro Tow Services • Towing", subtitle: "Verified • 327 completed jobs" },
    ],
  },
  marketplace: {
    title: "Marketplace quality",
    subtitle: "Monitor parts listings, compatibility, stock and dealer quality.",
    active: "Orders",
    metrics: [
      { title: "Live listings", value: "18.4k" },
      { title: "Compatibility flags", value: "23" },
      { title: "Low-quality listings", value: "14" },
      { title: "Dealer SLA", value: "96.8%" },
    ],
    items: [
      { title: "Premium brake pad set", subtitle: "High volume • compatibility confidence 98%" },
      { title: "Front brake disc", subtitle: "Stock mismatch reported by 2 dealers" },
      { title: "Oil filter listing group", subtitle: "Duplicate SKU merge suggested" },
    ],
  },
  analytics: {
    title: "Analytics",
    subtitle: "Marketplace, service and dispatch performance trends.",
    active: "Analytics",
    metrics: [
      { title: "Monthly GMV", value: "KSh 64.8M", meta: "+18.4% MoM" },
      { title: "Completed jobs", value: "8,492", meta: "+12.1%" },
      { title: "Median match time", value: "1m 42s", meta: "−14 sec" },
      { title: "Repeat customers", value: "38%", meta: "+3.2 pts" },
    ],
    items: [
      { title: "Repairs", subtitle: "42% of GMV • strongest growth in brakes + diagnostics" },
      { title: "Parts marketplace", subtitle: "34% of GMV • delivery completion 97.2%" },
      { title: "Towing", subtitle: "24% of GMV • median response 13.4 min" },
    ],
  },
};
