"use client";

import React from "react";
import useSWR from "swr";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { UnifiedActionItems } from "@/components/dashboard/UnifiedActionItems";
import { TodaysShiftWidgetCompact } from "@/components/dashboard/TodaysShiftWidgetCompact";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";
import { getEventCategoryIcon } from "@/lib/event-category-icons";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { EnhancedWidget } from "@/components/ui/EnhancedWidget";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function UpcomingLeave({ employeeId }: { employeeId: string }) {
  const { data, error, isLoading } = useSWR(
    employeeId
      ? `/api/employees/${employeeId}/leave-requests?upcoming=true&limit=3`
      : null,
    fetcher,
  );

  const items = Array.isArray(data) ? data : [];

  return (
    <DashboardWidget
      title="Upcoming Leave"
      icon={Calendar}
      action={
        <Link href={`/employees/${employeeId}/leave`} className="text-sm underline">
          View all leave
        </Link>
      }
    >
      {isLoading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message="Failed to load." />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming leave.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((lr: any) => {
            const start = new Date(lr.startDate);
            const end = new Date(lr.endDate);
            // End date is exclusive, so subtract 1 day to get the actual last day of leave
            const lastDay = new Date(end);
            lastDay.setDate(lastDay.getDate() - 1);
            const isSingleDay = start.toDateString() === lastDay.toDateString();
            
            // Handle both casing to be safe
            const category = lr.EventCategory || lr.eventCategory;
            const Icon = getEventCategoryIcon(category?.iconKey);

            return (
              <li
                key={lr.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {category?.name ?? "Leave"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isSingleDay
                      ? start.toLocaleDateString("en-NZ")
                      : `${start.toLocaleDateString("en-NZ")} — ${lastDay.toLocaleDateString("en-NZ")}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardWidget>
  );
}

// Removed old ActionItems component - now using UnifiedActionItems

export default function EmployeeDashboardClient({
  employeeId,
  section,
}: {
  employeeId?: string;
  section?: "top" | "bottom";
}) {
  const { isFeatureEnabled } = useFeatureToggles();
  
  // Check if time tracking features are enabled (either timesheets or rota/shifts)
  const showTimeTracking = isFeatureEnabled(FEATURE_KEYS.TIMESHEETS) || isFeatureEnabled(FEATURE_KEYS.ROTA_SHIFTS);

  // Top row: Today's Shift + Upcoming Leave
  if (section === "top") {
    return (
      <>
        {employeeId && showTimeTracking && (
          <EnhancedWidget size="small" delay={0.1}>
            <TodaysShiftWidgetCompact employeeId={employeeId} />
          </EnhancedWidget>
        )}
        {employeeId && (
          <EnhancedWidget size="small" delay={0.15}>
            <UpcomingLeave employeeId={employeeId} />
          </EnhancedWidget>
        )}
      </>
    );
  }

  // Bottom row: Action Items (News is rendered separately in parent)
  if (section === "bottom") {
    return (
      <>
        {employeeId && (
          <EnhancedWidget size="medium" delay={0.25}>
            <UnifiedActionItems employeeId={employeeId} />
          </EnhancedWidget>
        )}
      </>
    );
  }

  // Default: render all (backwards compatibility)
  return (
    <>
      {employeeId && showTimeTracking && (
        <EnhancedWidget size="small" delay={0.1}>
          <TodaysShiftWidgetCompact employeeId={employeeId} />
        </EnhancedWidget>
      )}
      {employeeId && (
        <EnhancedWidget size="small" delay={0.15}>
          <UpcomingLeave employeeId={employeeId} />
        </EnhancedWidget>
      )}
      {employeeId && (
        <EnhancedWidget size="medium" delay={0.25}>
          <UnifiedActionItems employeeId={employeeId} />
        </EnhancedWidget>
      )}
    </>
  );
}
