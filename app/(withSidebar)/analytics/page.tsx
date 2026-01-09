import AnalyticsDashboard from "./AnalyticsDashboard";
import { FeatureGuardedPage } from "@/components/FeatureGuardedPage";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

export const metadata = {
  title: "People Analytics",
  description: "Enterprise-grade insights for your workforce",
};

export default function AnalyticsPage() {
  return (
    <FeatureGuardedPage featureKey={FEATURE_KEYS.ANALYTICS}>
      <AnalyticsDashboard />
    </FeatureGuardedPage>
  );
}
