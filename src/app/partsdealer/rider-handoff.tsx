import { StaticScreen } from "@/components/autoassist-ui";
import { dealerScreens } from "@/data/autoassist-screens";

export default function RiderHandoff() {
  return <StaticScreen {...dealerScreens.riderHandoff} />;
}
