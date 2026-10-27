import { StaticScreen } from "@/components/autoassist-ui";
import { mechanicScreens } from "@/data/autoassist-screens";

export default function Verification() {
  return <StaticScreen {...mechanicScreens.verification} />;
}
