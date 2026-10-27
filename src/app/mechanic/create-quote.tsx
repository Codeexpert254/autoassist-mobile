import { StaticScreen } from "@/components/autoassist-ui";
import { mechanicScreens } from "@/data/autoassist-screens";

export default function CreateQuote() {
  return <StaticScreen {...mechanicScreens.createQuote} />;
}
