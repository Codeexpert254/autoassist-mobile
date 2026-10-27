import { StaticScreen } from "@/components/autoassist-ui";
import { sharedScreens } from "@/data/autoassist-screens";

export default function PaymentMethods() {
  return <StaticScreen {...sharedScreens.paymentMethods} />;
}
