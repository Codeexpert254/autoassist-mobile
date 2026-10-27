import { StaticScreenProps } from "@/components/autoassist-ui";

export const motoristScreens: Record<string, StaticScreenProps> = {
  describeProblem: {
    title: "Describe the problem",
    inset: 20,
    blocks: [
      { type: "card", title: "Toyota Fielder • 2015", subtitle: "KDA XXX X", tone: "blue" },
      { type: "sectionTitle", title: "What are you noticing?" },
      { type: "fields", items: [{ label: "", value: "The car makes a grinding sound when braking and the pedal feels soft.", multiline: true }] },
      { type: "sectionTitle", title: "Quick symptom" },
      { type: "chips", items: ["Brakes", "Engine", "Electrical", "Other"], active: 0 },
      { type: "card", title: "Use my current location", subtitle: "Helps find nearby specialists", trailing: "ON" },
    ],
    primaryAction: "Get preliminary estimate",
  },
  preliminaryEstimate: {
    title: "Preliminary estimate",
    inset: 20,
    blocks: [
      { type: "hero", eyebrow: "LIKELY ISSUE", title: "Brake system inspection / repair", value: "KSh 10,000 – 18,000", meta: "Estimated range", tone: "blue" },
      { type: "sectionTitle", title: "Possible work" },
      { type: "timeline", items: [
        { title: "Brake pads may require replacement", status: "done" },
        { title: "Brake discs should be inspected", status: "done" },
        { title: "Brake fluid / pressure should be checked", status: "done" },
      ] },
      { type: "callout", title: "Important", text: "This is an AI-assisted estimate, not a diagnosis. A mechanic must inspect the vehicle before the final quote.", tone: "amber" },
    ],
    primaryAction: "Find matching mechanics",
  },
  mechanicResults: {
    title: "Mechanics near you",
    subtitle: "Matched for brakes • Toyota Fielder",
    inset: 20,
    blocks: [
      { type: "chips", items: ["Best match", "Nearby", "Top rated"], active: 0 },
      { type: "cards", items: [
        { title: "Nairobi Auto Care", subtitle: "Brakes • Diagnostics • Suspension", meta: "96% match   •   1.2 km   •   4.8 ★", tone: "blue", trailing: "›" },
        { title: "Westlands Motor Clinic", subtitle: "Brakes • Diagnostics • Suspension", meta: "88% match   •   4.9 km   •   4.7 ★", trailing: "›" },
        { title: "City Brake Specialists", subtitle: "Brakes • Diagnostics • Suspension", meta: "84% match   •   6.1 km   •   4.6 ★", trailing: "›" },
      ] },
    ],
    bottomNav: true,
  },
  mechanicProfile: {
    title: "Mechanic profile",
    inset: 20,
    blocks: [
      { type: "success", title: "Nairobi Auto Care", text: "VERIFIED PROVIDER\n4.8 ★  •  243 reviews  •  1.2 km away", symbol: "NA", tone: "blue" },
      { type: "sectionTitle", title: "Specialties" },
      { type: "chips", items: ["Brakes", "Diagnostics", "Suspension"], active: 0 },
      { type: "callout", title: "Labour pricing", text: "Mechanic confirms the applicable hourly rate after inspection. You approve before work starts.", tone: "neutral" },
      { type: "sectionTitle", title: "About" },
      { type: "callout", text: "Workshop-based service with roadside support for selected repair categories.", tone: "neutral" },
    ],
    primaryAction: "Request this mechanic",
  },
  requestMechanic: {
    title: "Confirm request",
    inset: 20,
    blocks: [
      { type: "card", title: "Nairobi Auto Care", subtitle: "96% match • 1.2 km • 4.8 ★", tone: "blue" },
      { type: "sectionTitle", title: "Request summary" },
      { type: "rows", items: [
        { label: "Vehicle", value: "Toyota Fielder • 2015" },
        { label: "Problem", value: "Grinding sound when braking" },
        { label: "Location", value: "Current location • Nairobi" },
        { label: "Preferred time", value: "As soon as possible" },
      ] },
      { type: "callout", title: "What happens next?", text: "The mechanic can accept the request, inspect the vehicle, then send a final quote for your approval.", tone: "green" },
    ],
    primaryAction: "Send request",
  },
  spareParts: {
    title: "Spare parts",
    subtitle: "Matched to your Toyota Fielder • Delivered by verified riders",
    inset: 20,
    blocks: [
      { type: "search", placeholder: "Search brake pads, filters, tyres..." },
      { type: "sectionTitle", title: "Categories" },
      { type: "categories", items: [{ label: "Brakes", short: "B" }, { label: "Engine", short: "E" }, { label: "Tyres", short: "T" }] },
      { type: "sectionTitle", title: "Recommended for your car" },
      { type: "products", items: [
        { label: "BRAKE", title: "Premium brake pad set", subtitle: "Nairobi Auto Parts • Verified", price: "KSh 6,800" },
        { label: "FILTER", title: "Oil filter — Toyota compatible", subtitle: "Westlands Motor Parts • Verified", price: "KSh 1,450" },
      ] },
      { type: "card", title: "1 item in cart • KSh 6,800", trailing: "Checkout ›", tone: "blue" },
    ],
  },
  partDetails: {
    title: "Part details",
    subtitle: "Verified inventory and vehicle compatibility",
    inset: 20,
    blocks: [
      { type: "success", title: "BRAKE PAD SET", symbol: "BRAKE", tone: "blue" },
      { type: "card", title: "Premium brake pad set", subtitle: "Nairobi Auto Parts", badge: "✓ VERIFIED DEALER", tone: "green" },
      { type: "callout", title: "Fits your vehicle", text: "Toyota Fielder • 2015", tone: "green" },
      { type: "hero", title: "KSh 6,800", meta: "In stock • ready in 10–15 min", tone: "blue" },
    ],
    primaryAction: "Add to cart",
  },
  partsCheckout: {
    title: "Checkout",
    subtitle: "Your spare part will be dispatched to a verified AutoAssist rider",
    inset: 20,
    blocks: [
      { type: "card", title: "DELIVER TO", subtitle: "Westlands, Nairobi", trailing: "Change", tone: "blue" },
      { type: "sectionTitle", title: "Order" },
      { type: "card", title: "Premium brake pad set", subtitle: "Nairobi Auto Parts", meta: "KSh 6,800" },
      { type: "sectionTitle", title: "Payment summary" },
      { type: "rows", strongLast: true, items: [
        { label: "Parts subtotal", value: "KSh 6,800" },
        { label: "Delivery fee", value: "KSh 350" },
        { label: "Total", value: "KSh 7,150" },
      ] },
      { type: "card", title: "M-Pesa", subtitle: "•••• 2451", meta: "Payment held securely until delivery", tone: "neutral" },
    ],
    primaryAction: "Place order • KSh 7,150",
  },
  findingRider: {
    title: "Order confirmed",
    subtitle: "Dealer prepares the part while AutoAssist finds a verified rider",
    inset: 20,
    blocks: [
      { type: "card", title: "Order #AA-48219", tone: "blue" },
      { type: "success", title: "Finding a verified rider nearby…", text: "We only send this job to riders who are registered, approved and currently online.", symbol: "•••", tone: "blue" },
      { type: "timeline", items: [
        { title: "Order sent to dealer", subtitle: "Confirmed", status: "done" },
        { title: "Dealer preparing item", subtitle: "In progress", status: "active" },
        { title: "Rider dispatch", subtitle: "Searching…", status: "pending" },
      ] },
    ],
    primaryAction: "View order status",
  },
  riderAssigned: {
    title: "Track delivery",
    subtitle: "Your rider has collected the order",
    inset: 20,
    blocks: [
      { type: "card", title: "Kevin M.", subtitle: "✓ VERIFIED RIDER", meta: "4.9 ★ • 1,248 deliveries\nBike KME 482Q", tone: "green" },
      { type: "route", eyebrow: "LIVE ROUTE", from: "PARTS DEALER", to: "YOU", meta: "Estimated arrival", eta: "18–24 min" },
      { type: "card", title: "Delivery code", subtitle: "4821", meta: "Share only when the rider arrives", tone: "blue" },
    ],
    primaryAction: "Message rider",
  },
  findingMechanic: {
    title: "Finding a mechanic",
    subtitle: "We are sending your request to nearby verified mechanics who match your vehicle and issue.",
    blocks: [
      { type: "success", title: "SEARCH", text: "Matching nearby verified providers", symbol: "⌕", tone: "blue" },
      { type: "cards", items: [
        { title: "Request sent", subtitle: "Verified mechanics nearby", tone: "green" },
        { title: "Matching skills", subtitle: "Brakes • Toyota Fielder", tone: "blue" },
        { title: "Waiting for acceptance", subtitle: "Usually under 2 minutes", tone: "neutral" },
      ] },
    ],
    secondaryAction: "Cancel request",
  },
  mechanicAssigned: {
    title: "Mechanic assigned",
    subtitle: "Your mechanic accepted the job and is heading to you.",
    blocks: [
      { type: "card", title: "Nairobi Auto Care", subtitle: "Verified • 4.8 ★ • 1.2 km away", trailing: "12 MIN", tone: "green" },
      { type: "route", eyebrow: "LIVE ROUTE", from: "Nairobi Auto Care", to: "Your location • Westlands", meta: "Estimated arrival 10:42 AM", eta: "12 min" },
    ],
    primaryAction: "Message mechanic",
    secondaryAction: "View job details",
    bottomNav: true,
    activeTab: "Jobs",
  },
  inspectionQuote: {
    title: "Inspection complete",
    subtitle: "Review the mechanic’s diagnosis and approve the repair quote before work begins.",
    blocks: [
      { type: "card", title: "Diagnosis", subtitle: "Front brake pads worn • discs serviceable", tone: "blue" },
      { type: "rows", strongLast: true, items: [
        { label: "Labour", value: "KSh 4,500" },
        { label: "Brake pad set", value: "KSh 6,800" },
        { label: "Service fee", value: "KSh 350" },
        { label: "TOTAL", value: "KSh 11,650" },
      ] },
      { type: "callout", text: "The mechanic will only start after you approve this quote.", tone: "green" },
    ],
    primaryAction: "Approve quote & continue",
    secondaryAction: "Decline / ask a question",
  },
  repairProgress: {
    title: "Repair in progress",
    subtitle: "Track milestones while your mechanic works on the vehicle.",
    blocks: [
      { type: "card", title: "Nairobi Auto Care", badge: "IN PROGRESS", tone: "blue" },
      { type: "timeline", items: [
        { title: "Inspection complete", status: "done", trailing: "10:31 AM" },
        { title: "Quote approved", status: "done", trailing: "10:40 AM" },
        { title: "Parts installed", status: "done", trailing: "11:22 AM" },
        { title: "Final checks", status: "active", trailing: "In progress" },
      ] },
    ],
    primaryAction: "Message mechanic",
    bottomNav: true,
    activeTab: "Jobs",
  },
  servicePayment: {
    title: "Service payment",
    subtitle: "Repair is complete. Confirm the final amount and pay securely.",
    blocks: [
      { type: "card", title: "Nairobi Auto Care", subtitle: "Brake service • Job #REP-1028", tone: "blue" },
      { type: "rows", strongLast: true, items: [
        { label: "Labour", value: "KSh 4,500" },
        { label: "Parts", value: "KSh 6,800" },
        { label: "AutoAssist fee", value: "KSh 350" },
        { label: "TOTAL", value: "KSh 11,650" },
      ] },
      { type: "sectionTitle", title: "Payment method" },
      { type: "card", title: "M-PESA •••• 2481" },
    ],
    primaryAction: "Pay KSh 11,650",
  },
  serviceComplete: {
    title: "Service complete",
    subtitle: "Your repair is finished and payment was successful.",
    blocks: [
      { type: "success", title: "Brake service completed", text: "Receipt REP-1028 • KSh 11,650", tone: "green" },
      { type: "rating", title: "How was your experience?" },
    ],
    primaryAction: "Submit rating",
    secondaryAction: "View service history",
  },
  requestTowing: {
    title: "Request towing",
    subtitle: "Tell us where you are and what vehicle needs help.",
    blocks: [
      { type: "fields", items: [
        { label: "Vehicle", value: "Toyota Fielder • KDA XXX X" },
        { label: "Pickup location", value: "Current location • Westlands" },
        { label: "Destination", value: "Nairobi Auto Care • Ngara" },
        { label: "Issue", value: "Vehicle will not start" },
      ] },
      { type: "hero", title: "Estimated tow", value: "KSh 2,800 – 3,600", tone: "blue" },
    ],
    primaryAction: "Find towing agents",
  },
  towAssigned: {
    title: "Tow assigned",
    subtitle: "A verified towing agent is on the way to your location.",
    blocks: [
      { type: "card", title: "Metro Tow Services", subtitle: "Verified • KDA 412T • 4.9 ★", tone: "green" },
      { type: "route", eyebrow: "LIVE LOCATION", from: "Driver: Peter K.", to: "Pickup → Nairobi Auto Care", meta: "Tow truck en route", eta: "16 min" },
    ],
    primaryAction: "Message towing agent",
    secondaryAction: "View tow status",
    bottomNav: true,
    activeTab: "Jobs",
  },
  history: {
    title: "Orders & history",
    subtitle: "Repairs, parts deliveries and towing requests in one place.",
    blocks: [
      { type: "cards", items: [
        { title: "REP-1028 • Brake service", subtitle: "Completed • KSh 11,650" },
        { title: "AAR-48219 • Brake pad set", subtitle: "Delivered • KSh 7,150" },
        { title: "TOW-3901 • Westlands → Ngara", subtitle: "Completed • KSh 3,200" },
        { title: "REP-0977 • Engine diagnostics", subtitle: "Completed • KSh 4,800" },
      ] },
    ],
    bottomNav: true,
    activeTab: "Jobs",
  },
  vehicleDetails: {
    title: "Vehicle details",
    subtitle: "Manage saved vehicles, service history and compatibility.",
    blocks: [
      { type: "hero", title: "Toyota Fielder", meta: "2015 • KDA XXX X", eyebrow: "PRIMARY", tone: "blue" },
      { type: "rows", items: [
        { label: "Next service", value: "5,000 km" },
        { label: "Last service", value: "Brake service • Oct 16" },
        { label: "Saved parts", value: "3 compatible items" },
        { label: "Documents", value: "Logbook uploaded" },
      ] },
    ],
    primaryAction: "Edit vehicle",
    secondaryAction: "Add another vehicle",
  },
};

export const mechanicScreens: Record<string, StaticScreenProps> = {
  registration: {
    title: "Mechanic registration",
    subtitle: "Create a verified professional profile before accepting repair jobs.",
    blocks: [{ type: "fields", items: [
      { label: "Full name", value: "Daniel Mwangi" },
      { label: "Phone", value: "+254 712 345 678" },
      { label: "National ID", value: "••••••••" },
      { label: "Garage / business name", value: "Nairobi Auto Care" },
      { label: "Primary location", value: "Ngara, Nairobi" },
    ] }],
    primaryAction: "Continue to documents",
  },
  verification: {
    title: "Mechanic verification",
    subtitle: "Submit the documents AutoAssist uses to verify professional providers.",
    blocks: [{ type: "cards", items: [
      { title: "National ID", subtitle: "Uploaded • clear" },
      { title: "Business permit", subtitle: "Uploaded • pending review" },
      { title: "Skill certificates", subtitle: "2 files uploaded" },
      { title: "Profile photo", subtitle: "Added" },
      { title: "Service categories", subtitle: "Brakes • diagnostics • suspension" },
    ] }],
    primaryAction: "Submit for verification",
  },
  dashboard: {
    title: "Mechanic dashboard",
    subtitle: "Go online to receive jobs matching your skills and service area.",
    blocks: [
      { type: "hero", eyebrow: "YOU ARE ONLINE", title: "Ready for repair requests", tone: "green", trailing: "ON" },
      { type: "cards", items: [
        { title: "Today’s jobs", subtitle: "3 scheduled" },
        { title: "Earnings today", subtitle: "KSh 8,400" },
        { title: "Rating", subtitle: "4.8 ★ • 243 reviews" },
      ] },
    ],
    primaryAction: "View available jobs",
    bottomNav: true,
  },
  jobOffer: {
    title: "New repair request",
    subtitle: "Review the motorist, issue and payout before accepting.",
    blocks: [
      { type: "card", badge: "NEW JOB", title: "Toyota Fielder • 2015", subtitle: "Grinding sound when braking", tone: "blue" },
      { type: "rows", items: [
        { label: "Customer", value: "Abraham M." },
        { label: "Distance", value: "1.2 km" },
        { label: "Requested time", value: "As soon as possible" },
        { label: "Estimated labour", value: "KSh 4,500" },
        { label: "AutoAssist payout", value: "KSh 4,050" },
      ] },
    ],
    primaryAction: "Accept job",
    secondaryAction: "Decline",
  },
  jobDetails: {
    title: "Job details",
    subtitle: "Accepted request • Job #REP-1028",
    blocks: [
      { type: "card", title: "Abraham M.", subtitle: "Westlands • 1.2 km away" },
      { type: "card", title: "Toyota Fielder • KDA XXX X", subtitle: "2015 • Petrol • Automatic" },
      { type: "sectionTitle", title: "Customer report" },
      { type: "callout", text: "“Grinding sound when braking and the pedal feels soft.”", tone: "neutral" },
    ],
    primaryAction: "Navigate to customer",
    secondaryAction: "Message customer",
    bottomNav: true,
    activeTab: "Jobs",
  },
  navigation: {
    title: "On the way",
    subtitle: "Navigate to the customer and confirm arrival.",
    blocks: [
      { type: "route", eyebrow: "LIVE ROUTE", from: "Nairobi Auto Care", to: "Abraham • Westlands", eta: "12 MIN" },
      { type: "card", title: "Customer contact", subtitle: "Call or message from within AutoAssist" },
    ],
    primaryAction: "I have arrived",
  },
  inspection: {
    title: "Vehicle inspection",
    subtitle: "Record findings before preparing a quote.",
    blocks: [
      { type: "cards", items: [
        { title: "Brake pads", subtitle: "Worn • replace" },
        { title: "Brake discs", subtitle: "Serviceable" },
        { title: "Brake fluid", subtitle: "Low • top up" },
        { title: "Tyres", subtitle: "No issue noted" },
      ] },
      { type: "fields", items: [{ label: "Inspection notes", value: "Front pads below safe thickness…" }] },
    ],
    primaryAction: "Create repair quote",
  },
  createQuote: {
    title: "Create repair quote",
    subtitle: "Add labour and required parts for customer approval.",
    blocks: [
      { type: "fields", items: [
        { label: "Labour description", value: "Brake pad replacement" },
        { label: "Labour amount", value: "KSh 4,500" },
      ] },
      { type: "card", title: "Premium brake pad set", subtitle: "KSh 6,800 • verified dealer stock", tone: "blue" },
      { type: "card", title: "Add another part", trailing: "+" },
      { type: "rows", strongLast: true, items: [
        { label: "Subtotal", value: "KSh 11,300" },
        { label: "AutoAssist fee", value: "KSh 350" },
        { label: "CUSTOMER TOTAL", value: "KSh 11,650" },
      ] },
    ],
    primaryAction: "Send quote",
  },
  awaitingApproval: {
    title: "Quote sent",
    subtitle: "Waiting for the customer to approve before work begins.",
    blocks: [
      { type: "hero", eyebrow: "PENDING APPROVAL", title: "KSh 11,650", meta: "Brake service • labour + parts", tone: "amber" },
      { type: "card", title: "Customer", subtitle: "Abraham M. • notified" },
    ],
    primaryAction: "Message customer",
    secondaryAction: "Edit quote",
  },
  workProgress: {
    title: "Work in progress",
    subtitle: "Customer approved the quote. Update repair milestones as you work.",
    blocks: [
      { type: "chips", items: ["APPROVED"], active: 0 },
      { type: "cards", items: [
        { title: "Vehicle secured", subtitle: "Complete", tone: "green" },
        { title: "Old pads removed", subtitle: "Complete", tone: "green" },
        { title: "New pads installed", subtitle: "In progress", tone: "blue" },
        { title: "Road test", subtitle: "Not started" },
      ] },
    ],
    primaryAction: "Update progress",
    secondaryAction: "Request a part",
  },
  requestParts: {
    title: "Request a part",
    subtitle: "Source a compatible part from verified AutoAssist dealers.",
    blocks: [
      { type: "fields", items: [
        { label: "Vehicle", value: "Toyota Fielder • 2015" },
        { label: "Part needed", value: "Front brake pad set" },
      ] },
      { type: "cards", items: [
        { title: "Nairobi Auto Parts", subtitle: "KSh 6,800 • 1.4 km • In stock", tone: "blue" },
        { title: "Westlands Spares", subtitle: "KSh 7,100 • 3.6 km • In stock" },
      ] },
      { type: "callout", text: "Delivery can be dispatched to your job location by a verified rider.", tone: "green" },
    ],
    primaryAction: "Order from Nairobi Auto Parts",
  },
  partDelivery: {
    title: "Part delivery",
    subtitle: "Track the rider bringing the requested part to the repair location.",
    blocks: [
      { type: "card", title: "Kevin M. • verified rider", subtitle: "Bike KME 482Q • 4.9 ★", tone: "green" },
      { type: "route", eyebrow: "LIVE DELIVERY", from: "Nairobi Auto Parts", to: "Job location", eta: "8 MIN" },
    ],
    primaryAction: "Message rider",
    secondaryAction: "Confirm part received",
  },
  completeJob: {
    title: "Complete repair",
    subtitle: "Confirm the work is finished and submit the final job summary.",
    blocks: [
      { type: "card", title: "Brake pad replacement", subtitle: "Completed • road test passed", tone: "green" },
      { type: "fields", items: [
        { label: "Final notes", value: "Vehicle braking normally. Recommend…" },
        { label: "Odometer", value: "126,420 km" },
      ] },
      { type: "callout", title: "Customer will be prompted to pay", text: "KSh 11,650 final total", tone: "blue" },
    ],
    primaryAction: "Mark job complete",
  },
  earnings: {
    title: "Earnings & payouts",
    subtitle: "Track completed jobs, AutoAssist fees and payout status.",
    blocks: [
      { type: "hero", eyebrow: "AVAILABLE TO WITHDRAW", title: "KSh 24,860", meta: "M-PESA", tone: "green" },
      { type: "rows", items: [
        { label: "REP-1028", value: "+ KSh 4,050" },
        { label: "REP-1014", value: "+ KSh 6,300" },
        { label: "Parts reimbursement", value: "+ KSh 6,800" },
      ] },
    ],
    primaryAction: "Withdraw earnings",
    bottomNav: true,
    activeTab: "Jobs",
  },
  profile: {
    title: "Mechanic profile",
    subtitle: "Manage public profile, services, availability and reputation.",
    blocks: [
      { type: "hero", title: "Nairobi Auto Care", meta: "4.8 ★ • 243 reviews", eyebrow: "VERIFIED", tone: "green" },
      { type: "cards", items: [
        { title: "Services", subtitle: "Brakes • diagnostics • suspension" },
        { title: "Service area", subtitle: "Nairobi • 10 km radius" },
        { title: "Availability", subtitle: "Mon–Sat • 8am–6pm" },
        { title: "Response rate", subtitle: "96%" },
      ] },
    ],
    primaryAction: "Edit public profile",
  },
  history: {
    title: "Job history",
    subtitle: "Review completed, cancelled and disputed repair jobs.",
    blocks: [{ type: "cards", items: [
      { title: "REP-1028 • Toyota Fielder", subtitle: "Completed • KSh 4,050 payout" },
      { title: "REP-1014 • Subaru Forester", subtitle: "Completed • KSh 6,300 payout" },
      { title: "REP-1002 • Nissan Note", subtitle: "Customer cancelled before arrival" },
      { title: "REP-0988 • Mazda Demio", subtitle: "Dispute resolved • no penalty" },
    ] }],
    bottomNav: true,
    activeTab: "Jobs",
  },
};

export const dealerScreens: Record<string, StaticScreenProps> = {
  registration: {
    title: "Parts dealer registration",
    subtitle: "Register your business to sell verified spare parts on AutoAssist.",
    blocks: [{ type: "fields", items: [
      { label: "Business name", value: "Nairobi Auto Parts" },
      { label: "Contact person", value: "Jane Wanjiku" },
      { label: "Phone", value: "+254 700 123 456" },
      { label: "Business location", value: "Kirinyaga Road, Nairobi" },
      { label: "KRA / business number", value: "P0••••••" },
    ] }],
    primaryAction: "Continue to verification",
  },
  verification: {
    title: "Business verification",
    subtitle: "Provide documents and shop details before products go live.",
    blocks: [{ type: "cards", items: [
      { title: "Business permit", subtitle: "Uploaded" },
      { title: "Owner / director ID", subtitle: "Uploaded" },
      { title: "Store photos", subtitle: "3 images" },
      { title: "Payout account", subtitle: "M-PESA Till ••• 482" },
      { title: "Product categories", subtitle: "Brakes • filters • engine parts" },
    ] }],
    primaryAction: "Submit for review",
  },
  dashboard: {
    title: "Dealer dashboard",
    subtitle: "Manage orders, inventory and rider pickups.",
    blocks: [
      { type: "hero", eyebrow: "TODAY", title: "KSh 46,800 sales", meta: "8 orders • 3 awaiting pickup", tone: "amber" },
      { type: "cards", items: [
        { title: "New orders", subtitle: "5 need action" },
        { title: "Low stock", subtitle: "7 products" },
        { title: "Rider pickups", subtitle: "3 today" },
      ] },
    ],
    primaryAction: "Manage orders",
    bottomNav: true,
  },
  inventory: {
    title: "Inventory",
    subtitle: "Search, filter and maintain parts available to customers.",
    blocks: [
      { type: "search", placeholder: "Brake pads, filters, spark plugs…" },
      { type: "cards", items: [
        { title: "Premium brake pad set", subtitle: "KSh 6,800 • 14 in stock" },
        { title: "Oil filter — Toyota compatible", subtitle: "KSh 1,450 • 6 in stock" },
        { title: "Air filter — Fielder 2012–18", subtitle: "KSh 1,900 • LOW: 2 left", tone: "amber" },
        { title: "Front brake disc", subtitle: "KSh 8,500 • Out of stock", tone: "red" },
      ] },
    ],
    primaryAction: "Add new part",
    bottomNav: true,
    activeTab: "Jobs",
  },
  addPart: {
    title: "Add spare part",
    subtitle: "Create a searchable product listing with compatibility and stock.",
    blocks: [{ type: "fields", items: [
      { label: "Part name", value: "Premium brake pad set" },
      { label: "Category", value: "Brakes" },
      { label: "Compatible vehicles", value: "Toyota Fielder 2012–2018" },
      { label: "Price", value: "KSh 6,800" },
      { label: "Stock quantity", value: "14" },
    ] }],
    secondaryAction: "Add product photos",
    primaryAction: "Publish part",
  },
  editStock: {
    title: "Product & stock",
    subtitle: "Update price, compatibility, visibility and stock quantity.",
    blocks: [
      { type: "card", title: "Premium brake pad set", subtitle: "Brakes • Toyota Fielder", trailing: "LIVE", tone: "green" },
      { type: "fields", items: [
        { label: "Price", value: "KSh 6,800" },
        { label: "Stock quantity", value: "14" },
        { label: "SKU", value: "NAP-BRK-2048" },
      ] },
    ],
    primaryAction: "Save changes",
    secondaryAction: "Archive product",
  },
  orders: {
    title: "Orders",
    subtitle: "Prioritize paid orders waiting for confirmation and preparation.",
    blocks: [{ type: "cards", items: [
      { title: "AAR-48219", subtitle: "PAID • Brake pad set • KSh 6,800", tone: "green" },
      { title: "AAR-48231", subtitle: "NEW • Oil filter x2 • KSh 2,900", tone: "blue" },
      { title: "AAR-48198", subtitle: "READY • Rider pickup pending", tone: "amber" },
      { title: "AAR-48174", subtitle: "DELIVERED • Completed yesterday" },
    ] }],
    bottomNav: true,
    activeTab: "Jobs",
  },
  orderDetails: {
    title: "Order AAR-48219",
    subtitle: "Paid order • customer delivery",
    blocks: [
      { type: "card", title: "Premium brake pad set", subtitle: "Qty 1 • KSh 6,800", tone: "green" },
      { type: "rows", items: [
        { label: "Customer", value: "Abraham M." },
        { label: "Vehicle", value: "Toyota Fielder • 2015" },
        { label: "Delivery", value: "Westlands, Nairobi" },
        { label: "Order paid", value: "KSh 7,150 incl. delivery" },
      ] },
      { type: "callout", text: "Confirm stock before accepting. AutoAssist will dispatch a verified rider after the item is ready.", tone: "green" },
    ],
    primaryAction: "Accept order",
    secondaryAction: "Reject / out of stock",
  },
  prepareOrder: {
    title: "Prepare order",
    subtitle: "Pack the item and confirm it is ready for pickup.",
    blocks: [
      { type: "card", badge: "ACCEPTED", title: "AAR-48219 • Brake pad set", subtitle: "Shelf B-12 • Qty 1", tone: "green" },
      { type: "cards", items: [
        { title: "Pick correct SKU", subtitle: "NAP-BRK-2048" },
        { title: "Check packaging", subtitle: "Seal and label" },
        { title: "Attach order label", subtitle: "AAR-48219" },
        { title: "Move to pickup area", subtitle: "Rider counter" },
      ] },
    ],
    primaryAction: "Mark ready for pickup",
  },
  readyPickup: {
    title: "Ready for rider pickup",
    subtitle: "AutoAssist is finding a verified rider for this delivery.",
    blocks: [
      { type: "hero", eyebrow: "READY", title: "Order AAR-48219", meta: "Pickup code: 5931", tone: "green" },
      { type: "card", title: "Rider dispatch", subtitle: "Searching nearby verified riders…", tone: "blue" },
    ],
    primaryAction: "View dispatch status",
  },
  riderHandoff: {
    title: "Rider pickup",
    subtitle: "Verify the rider and hand over the exact sealed order.",
    blocks: [
      { type: "card", title: "Kevin M. • verified rider", subtitle: "Bike KME 482Q • 4.9 ★", tone: "green" },
      { type: "fields", items: [{ label: "Rider pickup code", value: "5931" }] },
      { type: "card", title: "Order", subtitle: "AAR-48219 • Brake pad set" },
      { type: "callout", text: "Only release the package after the rider code matches the order.", tone: "amber" },
    ],
    primaryAction: "Confirm handoff",
  },
  sales: {
    title: "Sales & payouts",
    subtitle: "Track marketplace sales, fees, refunds and deposits.",
    blocks: [
      { type: "hero", eyebrow: "AVAILABLE PAYOUT", title: "KSh 67,240", meta: "Next automatic payout: Friday", tone: "green" },
      { type: "rows", items: [
        { label: "AAR-48219", value: "+ KSh 6,460 net" },
        { label: "AAR-48198", value: "+ KSh 8,075 net" },
        { label: "Refund AAR-48112", value: "− KSh 1,450" },
      ] },
    ],
    primaryAction: "View payout report",
  },
  storeProfile: {
    title: "Store profile",
    subtitle: "Manage public information, service area and fulfilment settings.",
    blocks: [
      { type: "hero", eyebrow: "VERIFIED", title: "Nairobi Auto Parts", meta: "4.7 ★ • 618 orders", tone: "green" },
      { type: "cards", items: [
        { title: "Location", subtitle: "Kirinyaga Road, Nairobi" },
        { title: "Pickup hours", subtitle: "Mon–Sat • 8am–6pm" },
        { title: "Categories", subtitle: "Brakes • filters • engine" },
        { title: "Fulfilment rate", subtitle: "98% on time" },
      ] },
    ],
    primaryAction: "Edit store profile",
  },
  returns: {
    title: "Returns & disputes",
    subtitle: "Manage returns, incorrect-part reports and marketplace disputes.",
    blocks: [
      { type: "cards", items: [
        { title: "DSP-2201 • Wrong compatibility", subtitle: "Customer claims part did not fit", tone: "red" },
        { title: "RET-1842 • Unopened return", subtitle: "Awaiting dealer response", tone: "amber" },
        { title: "DSP-2178 • Damaged packaging", subtitle: "Resolved • partial refund", tone: "green" },
      ] },
      { type: "callout", text: "AutoAssist keeps order evidence, rider handoff status and customer messages linked to each dispute.", tone: "neutral" },
    ],
    primaryAction: "Open support center",
  },
  analytics: {
    title: "Inventory analytics",
    subtitle: "Understand sales velocity, stock risk and best-performing categories.",
    blocks: [
      { type: "hero", eyebrow: "TOP CATEGORY", title: "Brakes • KSh 284k", meta: "31% of monthly parts revenue", tone: "blue" },
      { type: "cards", items: [
        { title: "Fast moving", subtitle: "Brake pads • 46 sold" },
        { title: "Low stock risk", subtitle: "7 products", tone: "amber" },
        { title: "Dead stock", subtitle: "3 products > 90 days", tone: "red" },
        { title: "Restock suggestion", subtitle: "Oil filters • +20 units", tone: "green" },
      ] },
    ],
    primaryAction: "Export inventory report",
  },
  staffBranches: {
    title: "Staff & branches",
    subtitle: "Manage branch locations and who can prepare, hand off or edit stock.",
    blocks: [{ type: "cards", items: [
      { title: "Kirinyaga Road • Main", subtitle: "Open • 8am–6pm" },
      { title: "Westlands branch", subtitle: "Open • 9am–6pm" },
      { title: "Jane Wanjiku", subtitle: "Owner • full access" },
      { title: "Mark Ochieng", subtitle: "Store staff • orders + inventory" },
    ] }],
    primaryAction: "Add staff member",
    secondaryAction: "Add branch",
  },
};

export const riderScreens: Record<string, StaticScreenProps> = {
  registration: {
    title: "Become an AutoAssist rider",
    subtitle: "Register once, submit your documents, and get verified before receiving jobs",
    inset: 20,
    blocks: [
      { type: "fields", items: [
        { label: "Full name", value: "Kevin Mwangi" },
        { label: "Phone number", value: "+254 712 345 678" },
        { label: "National ID", value: "••••••••" },
        { label: "Motorbike registration", value: "KME 482Q" },
      ] },
      { type: "sectionTitle", title: "Required documents" },
      { type: "cards", items: [
        { title: "National ID + Driving licence", subtitle: "Clear photos or PDF", trailing: "Upload ›" },
        { title: "Motorbike insurance / ownership", subtitle: "Used for rider verification", trailing: "Upload ›" },
      ] },
    ],
    primaryAction: "Submit for verification",
  },
  verification: {
    title: "Rider verification",
    subtitle: "AutoAssist reviews rider identity, licence, bike and insurance before delivery access.",
    blocks: [
      { type: "hero", eyebrow: "UNDER REVIEW", title: "Your rider account is not active yet", meta: "You can prepare your profile while verification is completed.", tone: "amber" },
      { type: "cards", items: [
        { title: "National ID", subtitle: "Received" },
        { title: "Driving licence", subtitle: "Received" },
        { title: "Bike registration", subtitle: "Received" },
        { title: "Insurance", subtitle: "Pending review", tone: "amber" },
      ] },
    ],
  },
  dashboard: {
    title: "Rider dashboard",
    subtitle: "Go online to receive nearby spare-part delivery requests.",
    blocks: [
      { type: "hero", eyebrow: "YOU ARE ONLINE", title: "Ready for delivery offers", tone: "green", trailing: "ON" },
      { type: "cards", items: [
        { title: "Today’s deliveries", subtitle: "6 completed" },
        { title: "Earnings today", subtitle: "KSh 2,520" },
        { title: "Acceptance rate", subtitle: "93%" },
      ] },
    ],
    primaryAction: "View available jobs",
    bottomNav: true,
  },
  offer: {
    title: "Rider dashboard",
    subtitle: "Verified account • Nairobi",
    inset: 20,
    blocks: [
      { type: "card", title: "You are online", subtitle: "Ready to receive delivery jobs", trailing: "ON", tone: "green" },
      { type: "sectionTitle", title: "New delivery request" },
      { type: "hero", eyebrow: "SPARE PARTS", title: "KSh 420 payout", meta: "Pickup: Nairobi Auto Parts • Industrial Area • 2.1 km\nDeliver to: Westlands • Customer Abraham • 6.4 km\nEstimated trip: 28–35 min", tone: "blue" },
    ],
    primaryAction: "Accept job",
    secondaryAction: "Decline",
  },
  jobDetails: {
    title: "Delivery details",
    subtitle: "Review pickup, destination, item and payout before starting.",
    blocks: [
      { type: "card", title: "Pickup", subtitle: "Nairobi Auto Parts • Kirinyaga Road" },
      { type: "card", title: "Drop-off", subtitle: "Abraham M. • Westlands" },
      { type: "rows", items: [
        { label: "Order", value: "AAR-48219" },
        { label: "Item", value: "Brake pad set" },
        { label: "Distance", value: "5.6 km" },
        { label: "Estimated time", value: "28–35 min" },
        { label: "Rider payout", value: "KSh 420" },
      ] },
    ],
    primaryAction: "Navigate to dealer",
  },
  pickupVerification: {
    title: "Collect order",
    subtitle: "Verify the dealer, pickup code and package before leaving.",
    blocks: [
      { type: "card", title: "Nairobi Auto Parts", subtitle: "Verified dealer • Order AAR-48219", tone: "green" },
      { type: "fields", items: [{ label: "Pickup code", value: "5931" }] },
      { type: "cards", items: [
        { title: "Check order label", subtitle: "AAR-48219" },
        { title: "Confirm sealed package", subtitle: "Required" },
        { title: "Confirm item count", subtitle: "1 parcel" },
      ] },
    ],
    primaryAction: "Confirm package collected",
  },
  activeDelivery: {
    title: "Active delivery",
    subtitle: "Order #AA-48219",
    inset: 20,
    blocks: [
      { type: "route", eyebrow: "ROUTE", from: "Pickup • Nairobi Auto Parts", to: "Deliver • Westlands", meta: "Customer Abraham • 6.4 km" },
      { type: "sectionTitle", title: "Delivery steps" },
      { type: "timeline", items: [
        { title: "Arrive at dealer", subtitle: "Completed", status: "done" },
        { title: "Confirm item collected", subtitle: "Current", status: "active" },
        { title: "Navigate to customer", subtitle: "Next", status: "pending" },
        { title: "Enter customer delivery code", subtitle: "Final", status: "pending" },
      ] },
    ],
    primaryAction: "Confirm part collected",
  },
  complete: {
    title: "Delivery complete",
    subtitle: "Customer delivery code confirmed",
    inset: 20,
    blocks: [
      { type: "success", title: "Part delivered successfully", text: "The order is complete and your payout has been added to your rider wallet.", tone: "green" },
      { type: "hero", eyebrow: "DELIVERY PAYOUT", title: "KSh 420", meta: "Available in rider wallet", tone: "green" },
      { type: "card", title: "Order", subtitle: "#AA-48219 • Spare parts" },
    ],
    primaryAction: "Back to rider dashboard",
  },
  earnings: {
    title: "Rider earnings",
    subtitle: "Track completed deliveries, bonuses and available payout balance.",
    blocks: [
      { type: "hero", eyebrow: "AVAILABLE BALANCE", title: "KSh 6,840", meta: "M-PESA", tone: "green" },
      { type: "rows", items: [
        { label: "AAR-48219", value: "+ KSh 420" },
        { label: "AAR-48203", value: "+ KSh 380" },
        { label: "Peak-hour bonus", value: "+ KSh 250" },
      ] },
    ],
    primaryAction: "Withdraw earnings",
  },
  history: {
    title: "Delivery history",
    subtitle: "Review completed, cancelled and disputed deliveries.",
    blocks: [{ type: "cards", items: [
      { title: "AAR-48219", subtitle: "Delivered • KSh 420" },
      { title: "AAR-48203", subtitle: "Delivered • KSh 380" },
      { title: "AAR-48192", subtitle: "Cancelled by customer • no penalty" },
      { title: "AAR-48177", subtitle: "Issue reported • support reviewing", tone: "amber" },
    ] }],
    bottomNav: true,
    activeTab: "Jobs",
  },
  profile: {
    title: "Rider profile",
    subtitle: "Manage delivery vehicle, documents, service area and safety settings.",
    blocks: [
      { type: "hero", eyebrow: "VERIFIED", title: "Kevin M.", meta: "4.9 ★ • 482 deliveries", tone: "green" },
      { type: "cards", items: [
        { title: "Motorbike", subtitle: "KME 482Q • Boxer 150" },
        { title: "Service area", subtitle: "Nairobi • 12 km radius" },
        { title: "Documents", subtitle: "All valid" },
        { title: "Emergency contact", subtitle: "Configured" },
      ] },
    ],
    primaryAction: "Edit rider profile",
  },
  issue: {
    title: "Report delivery issue",
    subtitle: "Use this when pickup, route, customer or package problems prevent normal delivery.",
    blocks: [
      { type: "cards", items: [
        { title: "Dealer closed", subtitle: "Cannot collect item" },
        { title: "Package mismatch", subtitle: "Order label or contents differ" },
        { title: "Customer unreachable", subtitle: "No response at destination" },
        { title: "Vehicle problem", subtitle: "Rider cannot continue trip" },
      ] },
      { type: "fields", items: [{ label: "Additional notes", value: "Describe what happened…" }] },
    ],
    primaryAction: "Contact AutoAssist support",
  },
};

export const towingScreens: Record<string, StaticScreenProps> = {
  registration: {
    title: "Towing agent registration",
    subtitle: "Register the driver and towing vehicle used for AutoAssist jobs.",
    blocks: [{ type: "fields", items: [
      { label: "Full name", value: "Peter Kariuki" },
      { label: "Phone", value: "+254 711 220 445" },
      { label: "National ID", value: "••••••••" },
      { label: "Tow truck registration", value: "KDA 412T" },
      { label: "Truck class", value: "Flatbed • light vehicles" },
    ] }],
    primaryAction: "Continue to verification",
  },
  verification: {
    title: "Towing verification",
    subtitle: "Submit required documents before accepting roadside jobs.",
    blocks: [{ type: "cards", items: [
      { title: "National ID", subtitle: "Uploaded" },
      { title: "Driving licence", subtitle: "Uploaded" },
      { title: "Vehicle logbook", subtitle: "Uploaded" },
      { title: "Insurance", subtitle: "Uploaded" },
      { title: "Inspection certificate", subtitle: "Pending review", tone: "amber" },
    ] }],
    primaryAction: "Submit for review",
  },
  dashboard: {
    title: "Towing dashboard",
    subtitle: "Go online to receive nearby towing requests.",
    blocks: [
      { type: "hero", eyebrow: "YOU ARE ONLINE", title: "Ready for tow requests", tone: "green", trailing: "ON" },
      { type: "cards", items: [
        { title: "Jobs today", subtitle: "4 completed" },
        { title: "Earnings today", subtitle: "KSh 9,800" },
        { title: "Average response", subtitle: "11 minutes" },
      ] },
    ],
    primaryAction: "View nearby requests",
    bottomNav: true,
  },
  offer: {
    title: "New towing request",
    subtitle: "Review the vehicle, pickup, destination and estimated payout.",
    blocks: [
      { type: "card", badge: "NEW TOW", title: "Toyota Fielder • KDA XXX X", subtitle: "Vehicle will not start", tone: "blue" },
      { type: "rows", items: [
        { label: "Pickup", value: "Westlands" },
        { label: "Destination", value: "Ngara" },
        { label: "Distance", value: "7.4 km" },
        { label: "Payout", value: "KSh 2,900" },
      ] },
    ],
    primaryAction: "Accept towing job",
    secondaryAction: "Decline",
  },
  details: {
    title: "Tow request details",
    subtitle: "Accepted • TOW-3901",
    blocks: [
      { type: "card", title: "Abraham M.", subtitle: "Westlands • customer waiting" },
      { type: "card", title: "Toyota Fielder • 2015", subtitle: "KDA XXX X • automatic" },
      { type: "rows", items: [
        { label: "Issue", value: "Vehicle will not start" },
        { label: "Destination", value: "Nairobi Auto Care" },
        { label: "Customer contact", value: "In-app call / chat" },
      ] },
    ],
    primaryAction: "Navigate to pickup",
    secondaryAction: "Message customer",
  },
  enRoute: {
    title: "On the way",
    subtitle: "Navigate to the stranded motorist and keep ETA updated.",
    blocks: [{ type: "route", eyebrow: "LIVE ROUTE", from: "Metro Tow Services", to: "Westlands • customer", eta: "16 MIN" }],
    primaryAction: "I have arrived",
  },
  pickupCheck: {
    title: "Vehicle pickup",
    subtitle: "Confirm the vehicle, condition and customer handoff before loading.",
    blocks: [
      { type: "card", title: "Toyota Fielder • KDA XXX X", subtitle: "Customer: Abraham M." },
      { type: "cards", items: [
        { title: "Vehicle identity", subtitle: "Registration matches" },
        { title: "Condition photos", subtitle: "4 photos added" },
        { title: "Destination", subtitle: "Nairobi Auto Care" },
        { title: "Customer approval", subtitle: "Confirmed in app" },
      ] },
    ],
    primaryAction: "Confirm vehicle loaded",
  },
  secured: {
    title: "Vehicle secured",
    subtitle: "The vehicle is loaded and ready to be transported.",
    blocks: [
      { type: "hero", eyebrow: "SECURED", title: "Toyota Fielder • KDA XXX X", meta: "Destination: Nairobi Auto Care", tone: "green" },
      { type: "fields", items: [{ label: "Pickup confirmation code", value: "2748" }] },
    ],
    primaryAction: "Start towing trip",
  },
  activeTow: {
    title: "Active tow",
    subtitle: "Track route to destination and update delivery status.",
    blocks: [
      { type: "route", eyebrow: "ACTIVE ROUTE", from: "Westlands", to: "Ngara", meta: "Vehicle secured • no incident reported", eta: "18 MIN" },
      { type: "card", title: "Destination", subtitle: "Nairobi Auto Care • Ngara" },
    ],
    primaryAction: "Arrived at destination",
  },
  complete: {
    title: "Complete towing job",
    subtitle: "Confirm vehicle handoff and final amount.",
    blocks: [
      { type: "card", title: "TOW-3901", subtitle: "Westlands → Nairobi Auto Care" },
      { type: "fields", items: [{ label: "Destination handoff code", value: "8812" }] },
      { type: "rows", items: [
        { label: "Tow charge", value: "KSh 3,200" },
        { label: "AutoAssist fee", value: "KSh 300" },
        { label: "Your payout", value: "KSh 2,900" },
      ] },
    ],
    primaryAction: "Complete job",
  },
  earnings: {
    title: "Earnings & jobs",
    subtitle: "Payouts, completed towing requests and performance.",
    blocks: [
      { type: "hero", eyebrow: "AVAILABLE PAYOUT", title: "KSh 18,900", tone: "green" },
      { type: "rows", items: [
        { label: "TOW-3901", value: "+ KSh 2,900" },
        { label: "TOW-3882", value: "+ KSh 3,450" },
        { label: "TOW-3861", value: "+ KSh 2,650" },
      ] },
    ],
    primaryAction: "Withdraw payout",
    bottomNav: true,
    activeTab: "Jobs",
  },
  profile: {
    title: "Towing profile",
    subtitle: "Manage vehicle, service area, documents and availability.",
    blocks: [
      { type: "hero", eyebrow: "VERIFIED", title: "Metro Tow Services", meta: "4.9 ★ • 327 jobs", tone: "green" },
      { type: "cards", items: [
        { title: "Tow vehicle", subtitle: "KDA 412T • flatbed" },
        { title: "Capacity", subtitle: "Light vehicles" },
        { title: "Service area", subtitle: "Nairobi • 20 km radius" },
        { title: "Documents", subtitle: "All valid" },
      ] },
    ],
    primaryAction: "Edit towing profile",
  },
};

export const sharedScreens: Record<string, StaticScreenProps> = {
  paymentMethods: {
    title: "Payment methods",
    subtitle: "Manage how you pay for services and receive eligible refunds.",
    blocks: [{ type: "cards", items: [
      { title: "M-PESA •••• 2481", subtitle: "Primary payment method", tone: "green" },
      { title: "Visa •••• 4267", subtitle: "Expires 09/29" },
      { title: "AutoAssist Wallet", subtitle: "Balance KSh 18,420", tone: "blue" },
    ] }],
    primaryAction: "Add payment method",
    secondaryAction: "Manage billing details",
  },
  addPayment: {
    title: "Add payment method",
    subtitle: "Choose a secure payment option for AutoAssist transactions.",
    blocks: [
      { type: "cards", items: [
        { title: "M-PESA", subtitle: "Link a Safaricom mobile number", tone: "green" },
        { title: "Credit / debit card", subtitle: "Visa or Mastercard" },
        { title: "AutoAssist Wallet", subtitle: "Use available wallet balance first", tone: "blue" },
      ] },
      { type: "fields", items: [{ label: "Phone or card number", value: "•••• •••• •••• 4267" }] },
    ],
    primaryAction: "Save payment method",
  },
  help: {
    title: "Help & support",
    subtitle: "Find answers or contact AutoAssist about a job, order or account.",
    blocks: [{ type: "cards", items: [
      { title: "Repair & mechanic help", subtitle: "Quotes, jobs, payments" },
      { title: "Parts & delivery help", subtitle: "Orders, returns, rider delivery" },
      { title: "Towing help", subtitle: "Pickup, route, pricing" },
      { title: "Account & verification", subtitle: "Documents, login, roles" },
      { title: "Payments & refunds", subtitle: "Charges, payouts, reversals" },
    ] }],
    primaryAction: "Contact support",
  },
  ticket: {
    title: "Support ticket",
    subtitle: "Ticket SUP-7710 • Repair charge dispute",
    blocks: [
      { type: "chips", items: ["IN REVIEW"], active: 0 },
      { type: "cards", items: [
        { title: "Related job", subtitle: "REP-1028 • Nairobi Auto Care" },
        { title: "Issue", subtitle: "Customer disputes extra labour charge" },
        { title: "Evidence", subtitle: "Quote, messages and payment attached" },
      ] },
      { type: "callout", title: "Support response", text: "We are reviewing the approved quote and mechanic notes.", tone: "blue" },
    ],
    primaryAction: "Add message / evidence",
  },
  security: {
    title: "Security & devices",
    subtitle: "Protect your account and review active sessions.",
    blocks: [{ type: "cards", items: [
      { title: "Password", subtitle: "Changed 38 days ago" },
      { title: "Two-step verification", subtitle: "Enabled", tone: "green" },
      { title: "Current device", subtitle: "Safari • Nairobi • active now" },
      { title: "Other session", subtitle: "Android • last active yesterday" },
    ] }],
    primaryAction: "Change password",
    secondaryAction: "Sign out other devices",
  },
  privacy: {
    title: "Privacy & permissions",
    subtitle: "Control location, notifications and data used to operate AutoAssist.",
    blocks: [{ type: "cards", items: [
      { title: "Location while using app", subtitle: "On • required for dispatch", tone: "green" },
      { title: "Push notifications", subtitle: "On", tone: "green" },
      { title: "Camera & photos", subtitle: "On • job evidence", tone: "green" },
      { title: "Marketing messages", subtitle: "Off" },
      { title: "Download my data", subtitle: "Available on request" },
    ] }],
    primaryAction: "Save privacy settings",
  },
  safety: {
    title: "Safety & emergency",
    subtitle: "Fast access to help during repair, towing or delivery incidents.",
    blocks: [
      { type: "hero", eyebrow: "EMERGENCY ASSISTANCE", title: "Use this when you feel unsafe or a road incident occurs.", tone: "red" },
      { type: "cards", items: [
        { title: "Share live trip", subtitle: "Send active job route to a trusted contact" },
        { title: "Report incident", subtitle: "Create a safety case with job details" },
      ] },
    ],
    primaryAction: "Call emergency contact",
    secondaryAction: "Contact AutoAssist safety",
  },
  account: {
    title: "Account management",
    subtitle: "Change role access, deactivate the account or request deletion.",
    blocks: [
      { type: "cards", items: [
        { title: "My roles", subtitle: "Motorist" },
        { title: "Provider applications", subtitle: "None pending" },
        { title: "Communication preferences", subtitle: "Manage" },
        { title: "Export account data", subtitle: "Request archive" },
      ] },
      { type: "callout", text: "Account deletion requires identity confirmation and settlement of active jobs or payouts.", tone: "amber" },
    ],
    primaryAction: "Deactivate account",
    secondaryAction: "Request account deletion",
  },
};
