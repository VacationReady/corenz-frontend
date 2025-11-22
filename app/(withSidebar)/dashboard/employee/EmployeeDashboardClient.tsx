"use client";

import React from "react";
import useSWR from "swr";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { UnifiedActionItems } from "@/components/dashboard/UnifiedActionItems";
import { TodaysShiftWidget } from "@/components/dashboard/TodaysShiftWidget";
import { Calendar, User } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { WidgetLoading, WidgetError } from "@/components/ui/WidgetStates";

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
        <Link href="/employees" className="text-sm underline">
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
            const isSingleDay = start.toDateString() === end.toDateString();

            return (
              <li
                key={lr.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {lr.eventCategory?.name ?? "Leave"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isSingleDay
                      ? start.toLocaleDateString()
                      : `${start.toLocaleDateString()} — ${end.toLocaleDateString()}`}
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


function QuickActions({ employeeId }: { employeeId?: string }) {
  return (
    <DashboardWidget title="Quick Actions" icon={User}>
      <div className="flex flex-wrap gap-2">
        {employeeId && (
          <Link
            href={`/employees/${employeeId}/leave`}
            aria-label="Book Leave"
          >
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Book Leave
            </Button>
          </Link>
        )}
        <Link href="/profile" aria-label="View Profile">
          <Button variant="outline" size="sm">
            <User className="w-4 h-4 mr-2" />
            View Profile
          </Button>
        </Link>
      </div>
    </DashboardWidget>
  );
}


export default function EmployeeDashboardClient({
  employeeId,
}: {
  employeeId?: string;
}) {
  return (
    <>
      {employeeId && <TodaysShiftWidget employeeId={employeeId} />}
      {employeeId && <UpcomingLeave employeeId={employeeId} />}
      {employeeId && <UnifiedActionItems employeeId={employeeId} />}
      <QuickActions employeeId={employeeId} />
    </>
  );
}
