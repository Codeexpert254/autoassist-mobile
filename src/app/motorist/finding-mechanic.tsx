import { StaticScreen } from "@/components/autoassist-ui";
import { motoristScreens } from "@/data/autoassist-screens";

export default function FindingMechanic() {
  return <StaticScreen {...motoristScreens.findingMechanic} />;
}
