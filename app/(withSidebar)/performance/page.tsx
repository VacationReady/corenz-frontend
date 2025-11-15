"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import PerformancePage from "@/components/performance/PerformancePage";

export default function PerformanceRoutePage() {
  return (
    <ErrorBoundary>
      <PerformancePage />
    </ErrorBoundary>
  );
}
