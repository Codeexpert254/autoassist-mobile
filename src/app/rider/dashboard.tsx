import { StaticDashboardWithSettings } from "@/components/static-dashboard-with-settings";
import { riderScreens } from "@/data/autoassist-screens";

export default function Dashboard() {
  return <StaticDashboardWithSettings screen={riderScreens.dashboard} />;
}
