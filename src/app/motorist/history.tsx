import { StaticScreen } from "@/components/autoassist-ui";
import { motoristScreens } from "@/data/autoassist-screens";

export default function History() {
  return <StaticScreen {...motoristScreens.history} />;
}
