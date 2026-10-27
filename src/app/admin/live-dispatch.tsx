import { AdminScreen } from "@/components/autoassist-ui";
import { adminScreens } from "@/data/admin-screens";

export default function LiveDispatch() {
  return <AdminScreen {...adminScreens.dispatch} />;
}
