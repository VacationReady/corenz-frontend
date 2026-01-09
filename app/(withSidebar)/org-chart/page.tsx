export const dynamic = "force-dynamic";

import OrgChartPageClient from "./OrgChartPageClient";
import { FeatureGuardedPage } from "@/components/FeatureGuardedPage";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

export default function OrgChartPage() {
  return (
    <FeatureGuardedPage featureKey={FEATURE_KEYS.ORG_CHART}>
      <OrgChartPageClient />
    </FeatureGuardedPage>
  );
}
