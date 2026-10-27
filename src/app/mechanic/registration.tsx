import { StaticScreen } from "@/components/autoassist-ui";
import { mechanicScreens } from "@/data/autoassist-screens";

export default function Registration() {
  return <StaticScreen {...mechanicScreens.registration} />;
}
