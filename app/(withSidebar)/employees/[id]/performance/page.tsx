"use client";

import { useParams } from "next/navigation";
import PerformancePage from "@/app/(withSidebar)/performance/page";

export default function EmployeePerformancePage() {
  const params = useParams();
  const employeeId = params?.id as string | undefined;

  if (!employeeId) {
    return null;
  }

  return <PerformancePage employeeId={employeeId} />;
}
