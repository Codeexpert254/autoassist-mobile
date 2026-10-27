import { StaticScreen } from "@/components/autoassist-ui";
import { motoristScreens } from "@/data/autoassist-screens";

export default function VehicleDetails() {
  return <StaticScreen {...motoristScreens.vehicleDetails} />;
}
