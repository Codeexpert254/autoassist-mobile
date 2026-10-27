import { AdminScreen } from "@/components/autoassist-ui";
import { adminScreens } from "@/data/admin-screens";

export default function VerificationQueue() {
  return <AdminScreen {...adminScreens.verification} />;
}
