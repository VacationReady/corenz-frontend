"use client";
export const dynamic = "force-dynamic";

import { PageShell } from "@/components/ui/PageShell";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { User } from "lucide-react";

export default function ProfilePage() {
  const breadcrumbs = useBreadcrumbs();

  return (
    <PageShell
      title="Profile"
      description="Manage your personal information and account settings"
      icon={<User className="w-6 h-6" />}
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-2xl">
        <p className="text-muted-foreground">
          This is your profile page. Here you can manage your personal information and account settings.
        </p>
        {/* Add profile content here */}
      </div>
    </PageShell>
  );
}
