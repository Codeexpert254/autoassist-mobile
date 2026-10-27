import { StaticScreen } from "@/components/autoassist-ui";
import { dealerScreens } from "@/data/autoassist-screens";

export default function AddPart() {
  return <StaticScreen {...dealerScreens.addPart} />;
}
