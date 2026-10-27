import { StaticScreen } from "@/components/autoassist-ui";
import { sharedScreens } from "@/data/autoassist-screens";

export default function SafetyEmergency() {
  return <StaticScreen {...sharedScreens.safety} />;
}
