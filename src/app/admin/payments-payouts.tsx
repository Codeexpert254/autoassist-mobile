import { AdminScreen } from "@/components/autoassist-ui";
import { adminScreens } from "@/data/admin-screens";

export default function PaymentsPayouts() {
  return <AdminScreen {...adminScreens.payments} />;
}
