import { StaticScreen } from "@/components/autoassist-ui";
import { dealerScreens } from "@/data/autoassist-screens";

export default function Dashboard() {
  return <StaticScreen {...dealerScreens.dashboard} />;
}
