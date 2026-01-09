"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import PerformancePage from "@/components/performance/PerformancePage";
import { FeatureGuardedPage } from "@/components/FeatureGuardedPage";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

export default function PerformanceRoutePage() {
  return (
    <ErrorBoundary>
      <FeatureGuardedPage featureKey={FEATURE_KEYS.PERFORMANCE_MANAGEMENT}>
        <PerformancePage />
      </FeatureGuardedPage>
    </ErrorBoundary>
  );
}
