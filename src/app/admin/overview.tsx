import { AdminScreen } from "@/components/autoassist-ui";
import { adminScreens } from "@/data/admin-screens";

export default function Overview() {
  return <AdminScreen {...adminScreens.overview} />;
}
