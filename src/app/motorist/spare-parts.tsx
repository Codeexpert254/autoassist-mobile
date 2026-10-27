import { StaticScreen } from "@/components/autoassist-ui";
import { motoristScreens } from "@/data/autoassist-screens";

export default function SpareParts() {
  return <StaticScreen {...motoristScreens.spareParts} />;
}
