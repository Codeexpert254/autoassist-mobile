import { StaticScreen } from "@/components/autoassist-ui";
import { dealerScreens } from "@/data/autoassist-screens";

export default function ReadyPickup() {
  return <StaticScreen {...dealerScreens.readyPickup} />;
}
