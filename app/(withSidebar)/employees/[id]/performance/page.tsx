"use client";

import { useParams } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import PerformancePage from "@/components/performance/PerformancePage";

export default function EmployeePerformancePage() {
  const params = useParams();
  const employeeId = params?.id as string | undefined;

  if (!employeeId) {
    return null;
  }

  return (
    <ErrorBoundary>
      <PerformancePage employeeId={employeeId} />
    </ErrorBoundary>
  );
}
