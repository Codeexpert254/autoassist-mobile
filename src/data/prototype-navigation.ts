export const primaryNext: Record<string, string> = {
  "/motorist/describe-problem": "/motorist/preliminary-estimate",
  "/motorist/preliminary-estimate": "/motorist/mechanic-results",
  "/motorist/mechanic-profile": "/motorist/confirm-request",
  "/motorist/confirm-request": "/motorist/finding-mechanic",
  "/motorist/finding-mechanic": "/motorist/mechanic-assigned",
  "/motorist/mechanic-assigned": "/motorist/inspection-quote",
  "/motorist/inspection-quote": "/motorist/repair-progress",
  "/motorist/repair-progress": "/motorist/service-payment",
  "/motorist/service-payment": "/motorist/service-complete",
  "/motorist/service-complete": "/motorist/history",
  "/motorist/part-details": "/motorist/parts-checkout",
  "/motorist/parts-checkout": "/motorist/finding-rider",
  "/motorist/finding-rider": "/motorist/rider-assigned",
  "/motorist/rider-assigned": "/messages",
  "/motorist/request-towing": "/motorist/tow-assigned",
  "/motorist/tow-assigned": "/messages",
  "/motorist/vehicle-details": "/motorist/addavehicle",

  "/mechanic/registration": "/mechanic/verification",
  "/mechanic/verification": "/mechanic/dashboard",
  "/mechanic/dashboard": "/mechanic/job-offer",
  "/mechanic/job-offer": "/mechanic/job-details",
  "/mechanic/job-details": "/mechanic/navigation",
  "/mechanic/navigation": "/mechanic/inspection",
  "/mechanic/inspection": "/mechanic/create-quote",
  "/mechanic/create-quote": "/mechanic/awaiting-approval",
  "/mechanic/awaiting-approval": "/mechanic/work-progress",
  "/mechanic/work-progress": "/mechanic/complete-job",
  "/mechanic/request-parts": "/mechanic/part-delivery",
  "/mechanic/part-delivery": "/mechanic/complete-job",
  "/mechanic/complete-job": "/mechanic/earnings",

  "/partsdealer/registration": "/partsdealer/verification",
  "/partsdealer/verification": "/partsdealer/dashboard",
  "/partsdealer/dashboard": "/partsdealer/orders",
  "/partsdealer/orders": "/partsdealer/order-details",
  "/partsdealer/order-details": "/partsdealer/prepare-order",
  "/partsdealer/prepare-order": "/partsdealer/ready-pickup",
  "/partsdealer/ready-pickup": "/partsdealer/rider-handoff",
  "/partsdealer/rider-handoff": "/partsdealer/sales",
  "/partsdealer/inventory": "/partsdealer/add-part",

  "/rider/registration": "/rider/verification",
  "/rider/verification": "/rider/dashboard",
  "/rider/dashboard": "/rider/delivery-offer",
  "/rider/delivery-offer": "/rider/job-details",
  "/rider/job-details": "/rider/pickup-verification",
  "/rider/pickup-verification": "/rider/active-delivery",
  "/rider/active-delivery": "/rider/delivery-complete",
  "/rider/delivery-complete": "/rider/earnings",

  "/towing/registration": "/towing/verification",
  "/towing/verification": "/towing/dashboard",
  "/towing/dashboard": "/towing/tow-offer",
  "/towing/tow-offer": "/towing/tow-details",
  "/towing/tow-details": "/towing/en-route",
  "/towing/en-route": "/towing/pickup-check",
  "/towing/pickup-check": "/towing/vehicle-secured",
  "/towing/vehicle-secured": "/towing/active-tow",
  "/towing/active-tow": "/towing/complete-tow",
  "/towing/complete-tow": "/towing/earnings",

  "/shared/help-center": "/shared/support-ticket",
  "/shared/payment-methods": "/shared/add-payment-method",
};

export const secondaryNext: Record<string, string> = {
  "/motorist/service-complete": "/motorist/history",
  "/motorist/mechanic-assigned": "/motorist/history",
  "/motorist/tow-assigned": "/motorist/history",
  "/mechanic/job-details": "/messages",
  "/mechanic/work-progress": "/mechanic/request-parts",
  "/mechanic/part-delivery": "/mechanic/complete-job",
};

export function getCardTarget(pathname: string, blockType: string, itemIndex: number) {
  if (pathname === "/motorist/mechanic-results" && blockType === "cards") {
    return "/motorist/mechanic-profile";
  }
  if (pathname === "/motorist/spare-parts" && blockType === "products" && itemIndex === 0) {
    return "/motorist/part-details";
  }
  if (pathname === "/partsdealer/orders" && blockType === "cards") {
    return "/partsdealer/order-details";
  }
  return undefined;
}

export function getBottomTarget(
  pathname: string,
  item: "Home" | "Jobs" | "Messages" | "Profile",
) {
  const role = pathname.startsWith("/mechanic")
    ? "mechanic"
    : pathname.startsWith("/partsdealer")
      ? "partsdealer"
      : pathname.startsWith("/rider")
        ? "rider"
        : pathname.startsWith("/towing")
          ? "towing"
          : "motorist";

  if (item === "Messages") return "/messages";
  if (item === "Profile") return role === "motorist" ? "/profile" : `/${role}/profile`;

  if (item === "Jobs") {
    if (role === "motorist") return "/motorist/history";
    if (role === "mechanic") return "/mechanic/history";
    if (role === "partsdealer") return "/partsdealer/orders";
    if (role === "rider") return "/rider/history";
    return "/towing/earnings";
  }

  return role === "motorist" ? "/motorist/home" : `/${role}/dashboard`;
}
