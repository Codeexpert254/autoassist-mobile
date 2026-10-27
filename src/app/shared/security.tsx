import { StaticScreen } from "@/components/autoassist-ui";
import { sharedScreens } from "@/data/autoassist-screens";

export default function Security() {
  return <StaticScreen {...sharedScreens.security} />;
}
