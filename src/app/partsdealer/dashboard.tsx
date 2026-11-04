import { StaticDashboardWithSettings } from "@/components/static-dashboard-with-settings";
import { dealerScreens } from "@/data/autoassist-screens";

export default function Dashboard() {
  return <StaticDashboardWithSettings screen={dealerScreens.dashboard} />;
}
