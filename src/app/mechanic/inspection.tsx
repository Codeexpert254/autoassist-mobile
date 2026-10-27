import { StaticScreen } from "@/components/autoassist-ui";
import { mechanicScreens } from "@/data/autoassist-screens";

export default function Inspection() {
  return <StaticScreen {...mechanicScreens.inspection} />;
}
