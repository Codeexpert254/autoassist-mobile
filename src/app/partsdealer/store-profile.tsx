import { StaticScreen } from "@/components/autoassist-ui";
import { dealerScreens } from "@/data/autoassist-screens";

export default function StoreProfile() {
  return <StaticScreen {...dealerScreens.storeProfile} />;
}
