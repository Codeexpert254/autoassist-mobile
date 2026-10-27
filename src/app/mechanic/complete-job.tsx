import { StaticScreen } from "@/components/autoassist-ui";
import { mechanicScreens } from "@/data/autoassist-screens";

export default function CompleteJob() {
  return <StaticScreen {...mechanicScreens.completeJob} />;
}
