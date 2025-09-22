import { Suspense } from "react";
import ReportsPreviewClient from "./ReportsPreviewClient";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function ReportsPreviewPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          showHeaderAction
          showBreadcrumb={false}
          sections={[
            {
              showHeader: true,
              showToolbar: true,
              variant: "table",
              rows: 6,
            },
          ]}
        />
      }
    >
      <ReportsPreviewClient />
    </Suspense>
  );
}
