import { Redirect } from "expo-router";

// Legacy route: AutoAssist now manages the provider connection only.
// Inspection, quotes, repair progress and labour payments happen offline.
export default function RedirectOldRepairFlow() {
  return <Redirect href="/mechanic/job-details" />;
}
