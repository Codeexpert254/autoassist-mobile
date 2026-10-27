import { StaticScreen } from "@/components/autoassist-ui";
import { riderScreens } from "@/data/autoassist-screens";

export default function Dashboard() {
  return <StaticScreen {...riderScreens.dashboard} />;
}
