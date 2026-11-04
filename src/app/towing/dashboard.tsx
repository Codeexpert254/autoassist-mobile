import { StaticDashboardWithSettings } from "@/components/static-dashboard-with-settings";
import { towingScreens } from "@/data/autoassist-screens";

export default function Dashboard() {
  return <StaticDashboardWithSettings screen={towingScreens.dashboard} />;
}
