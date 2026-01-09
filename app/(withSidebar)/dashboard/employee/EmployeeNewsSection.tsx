"use client";

import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { Megaphone } from "lucide-react";

/**
 * News section component for employee dashboard that checks feature toggle
 * Separated as a client component to use the useFeatureToggles hook
 */
export function EmployeeNewsSection({ limit = 4 }: { limit?: number }) {
  const { isFeatureEnabled, isLoading } = useFeatureToggles();
  
  // Show loading skeleton while checking feature status
  if (isLoading) {
    return (
      <DashboardWidget title="Latest News" icon={Megaphone}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </DashboardWidget>
    );
  }
  
  // If news feature is disabled, show a placeholder message
  if (!isFeatureEnabled(FEATURE_KEYS.NEWS)) {
    return (
      <DashboardWidget title="Latest News" icon={Megaphone}>
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
          News feature is not enabled for your organisation
        </div>
      </DashboardWidget>
    );
  }
  
  return <NewsWidget limit={limit} />;
}
