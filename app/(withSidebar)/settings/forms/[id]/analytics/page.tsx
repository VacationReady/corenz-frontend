"use client";

import { useParams } from "next/navigation";

import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

import { FormAnalyticsContent } from "./FormAnalyticsContent";

type Params = { id?: string | string[] };

export default function FormAnalyticsPage() {
  const params = useParams<Params>();
  const rawId = params?.id;
  const formId = Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  const hasFormId = typeof formId === "string" && formId.length > 0;

  const breadcrumbItems = [
    { label: "Settings", href: "/settings" },
    { label: "Forms & Surveys", href: "/settings/forms" },
    { label: "Form Analytics", isCurrentPage: true },
  ];

  return (
    <PageShell
      title="Form Analytics"
      description="View submission statistics and insights"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      {hasFormId ? (
        <FormAnalyticsContent formId={formId} />
      ) : (
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Form not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t determine which form you wanted to inspect. Please
              return to the forms list and try again.
            </p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
