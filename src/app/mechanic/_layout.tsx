import { Stack } from "expo-router";

import { MechanicOfferHeadsUp } from "@/components/mechanic-offer-heads-up";

/** Only mechanic routes mount the in-app offer popup. */
export default function MechanicLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <MechanicOfferHeadsUp />
    </>
  );
}
