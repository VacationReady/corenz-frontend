// app/settings/onboarding/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";

type Template = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  departments: { id: string; name: string }[];
  jobRoles: { id: string; name: string }[];
  steps: any[];
  updatedAt?: string;
  updatedBy?: { id: string; name?: string; email?: string } | null;
};

export default function OnboardingSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new integrated Journey Designer with onboarding tab
    router.replace('/settings/journeys?tab=onboarding');
  }, [router]);

  // Show loading state while redirecting
  return (
    <PageShell
      title="Onboarding Settings"
      description="Redirecting you to Journey Designer"
      breadcrumbs={breadcrumbConfigs.settingsSection("Onboarding")}
      showHomeIcon={false}
    >
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-muted-foreground">Redirecting to Journey Designer...</p>
      </div>
    </PageShell>
  );
}
