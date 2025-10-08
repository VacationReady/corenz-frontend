// app/settings/onboarding/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import OnboardingTemplateEditor from "@/components/onboarding/OnboardingTemplateEditor";
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to Journey Designer...</p>
      </div>
    </div>
  );
}
