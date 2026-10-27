import { StaticScreen } from "@/components/autoassist-ui";
import { motoristScreens } from "@/data/autoassist-screens";

export default function InspectionQuote() {
  return <StaticScreen {...motoristScreens.inspectionQuote} />;
}
