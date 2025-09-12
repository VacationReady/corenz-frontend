import { Suspense } from "react";
import ReportsPreviewClient from "./ReportsPreviewClient";

export default function ReportsPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center">Loading report preview...</div>
      }
    >
      <ReportsPreviewClient />
    </Suspense>
  );
}
