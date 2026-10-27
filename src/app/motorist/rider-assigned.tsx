import { StaticScreen } from "@/components/autoassist-ui";
import { motoristScreens } from "@/data/autoassist-screens";

export default function RiderAssigned() {
  return <StaticScreen {...motoristScreens.riderAssigned} />;
}
