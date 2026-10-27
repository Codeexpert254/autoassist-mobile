import { StaticScreen } from "@/components/autoassist-ui";
import { towingScreens } from "@/data/autoassist-screens";

export default function TowOffer() {
  return <StaticScreen {...towingScreens.offer} />;
}
