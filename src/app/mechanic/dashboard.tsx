import { StaticScreen } from "@/components/autoassist-ui";
import { mechanicScreens } from "@/data/autoassist-screens";

export default function Dashboard() {
  return <StaticScreen {...mechanicScreens.dashboard} />;
}
