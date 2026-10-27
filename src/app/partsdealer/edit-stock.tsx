import { StaticScreen } from "@/components/autoassist-ui";
import { dealerScreens } from "@/data/autoassist-screens";

export default function EditStock() {
  return <StaticScreen {...dealerScreens.editStock} />;
}
