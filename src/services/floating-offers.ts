import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

type OverlayNative = {
  getDiagnostics(): Record<string, string>;
  hasPermission(): boolean;
  isEnabled(): boolean;
  enableForUser(userId: string): void;
  setOnline(userId: string, online: boolean): void;
  disable(): void;
  dismiss(): void;
  openPermissionSettings(): void;
};

const native: OverlayNative | null =
  Platform.OS === "android" ? requireOptionalNativeModule<OverlayNative>("AutoAssistOverlay") : null;

export type FloatingOfferStatus = {
  supported: boolean;
  hasPermission: boolean;
  enabled: boolean;
};

export function getFloatingOfferStatus(): FloatingOfferStatus {
  if (!native) return { supported: false, hasPermission: false, enabled: false };
  return {
    supported: true,
    hasPermission: native.hasPermission(),
    enabled: native.isEnabled(),
  };
}

export function openFloatingOfferPermissionSettings(): void {
  if (!native) throw new Error("Floating requests require an Android APK built with the AutoAssist native overlay module.");
  native.openPermissionSettings();
}

export function enableFloatingOffersForMechanic(mechanicId: string): void {
  if (!native) throw new Error("Android floating overlays are unavailable.");
  native.enableForUser(mechanicId);
}

export function disableFloatingOffers(): void {
  native?.disable();
}

export function dismissFloatingOffer(): void {
  native?.dismiss();
}

/** No personal data or notification contents are returned. */
export function getFloatingOfferDiagnostics(): Record<string, string> {
  return native?.getDiagnostics() ?? {
    lastFcmAt: "0",
    lastDecision: "native_module_not_in_build",
    enabled: "false",
    permission: "false",
  };
}

/** Keeps background overlays tied to the mechanic's saved availability. */
export function setFloatingOffersOnline(userId: string, online: boolean): void {
  native?.setOnline(userId, online);
}
