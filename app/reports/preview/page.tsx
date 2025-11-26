import { Suspense } from "react";
import ReportsPreviewClient from "./ReportsPreviewClient";
import { ReportPreviewSkeleton } from "@/components/reports/ReportSkeleton";

export default function ReportsPreviewPage() {
  return (
    <Suspense fallback={<ReportPreviewSkeleton />}>
      <ReportsPreviewClient />
    </Suspense>
  );
}
