import { StaticScreen } from "@/components/autoassist-ui";
import { towingScreens } from "@/data/autoassist-screens";

export default function Registration() {
  return <StaticScreen {...towingScreens.registration} />;
}
