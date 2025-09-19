"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { CalendarDays, Plus, RotateCcw } from "lucide-react";

import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/switch";
import { isAdminOrManager } from "@/lib/roles";

type RawLeaveRequest = {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  dayType?: string | null;
  approvalStatus?: string | null;
  EventCategory?: { id: string; name: string } | null;
  eventCategory?: { id: string; name: string } | null;
};

type LeaveRequest = RawLeaveRequest & {
  start: Date;
  end: Date;
  categoryName: string;
};

const dayTypeLabels: Record<string, string> = {
  FULL_DAY: "Full day",
  HALF_DAY_AM: "Half day (AM)",
  HALF_DAY_PM: "Half day (PM)",
};

function normalizeLeave(leave: RawLeaveRequest): LeaveRequest {
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  const categoryName =
    leave.EventCategory?.name ?? leave.eventCategory?.name ?? "Leave";

  return {
    ...leave,
    start,
    end,
    categoryName,
  };
}

function formatRange(start: Date, end: Date) {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Dates unavailable";
  }

  const startLabel = format(start, "EEE d MMM yyyy");
  const endLabel = format(end, "EEE d MMM yyyy");
  if (startLabel === endLabel) {
    return startLabel;
  }
  return `${startLabel} → ${endLabel}`;
}

function getDayTypeLabel(dayType?: string | null) {
  if (!dayType) return null;
  return dayTypeLabels[dayType] ?? dayType.replace(/_/g, " ");
}

function calculateDuration(
  start: Date,
  end: Date,
  dayType?: string | null,
) {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "-";
  }

  if (dayType === "HALF_DAY_AM" || dayType === "HALF_DAY_PM") {
    return "0.5 day";
  }

  const diffMs = end.getTime() - start.getTime();
  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function getStatusMeta(status?: string | null) {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (normalized === "approved") {
    return { label: "Approved", variant: "secondary" as const };
  }
  if (normalized === "declined") {
    return { label: "Declined", variant: "destructive" as const };
  }
  return {
    label: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    variant: "outline" as const,
  };
}

export default function LeavePage({
  params,
}: {
  params: { id: string };
}) {
  const employeeId = params.id;
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  const searchParamsString = useMemo(
    () => (searchParams ? searchParams.toString() : ""),
    [searchParams],
  );

  const limitParam = searchParams?.get("limit") ?? null;
  const upcomingParam = searchParams?.get("upcoming") ?? null;

  const limit = useMemo(() => {
    const parsed = Number.parseInt(limitParam ?? "", 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed, 10);
    }
    return 3;
  }, [limitParam]);

  const upcomingQueryValue = useMemo(() => {
    if (!upcomingParam) return "true";
    return upcomingParam === "false" ? "false" : "true";
  }, [upcomingParam]);

  const upcomingOnly = upcomingQueryValue !== "false";

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams();
        query.set("limit", String(limit));
        if (upcomingQueryValue) {
          query.set("upcoming", upcomingQueryValue);
        }

        const queryString = query.toString();
        const res = await fetch(
          `/api/employees/${employeeId}/leave-requests${
            queryString ? `?${queryString}` : ""
          }`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const payload = await res.json();
        if (!active) return;

        const normalized = Array.isArray(payload)
          ? payload.map((item: RawLeaveRequest) => normalizeLeave(item))
          : [];

        setLeaves(normalized);
      } catch (err) {
        if (!active || controller.signal.aborted) {
          return;
        }
        console.error("[LeavePage] Failed to load leave requests", err);
        setError("We couldn't load leave requests. Please try again.");
        setLeaves([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [employeeId, limit, upcomingQueryValue, refreshToken]);

  const { currentLeaves, upcomingLeaves } = useMemo(() => {
    const now = new Date();
    const current: LeaveRequest[] = [];
    const upcomingList: LeaveRequest[] = [];

    leaves.forEach((leave) => {
      if (
        Number.isNaN(leave.start.getTime()) ||
        Number.isNaN(leave.end.getTime())
      ) {
        upcomingList.push(leave);
        return;
      }

      if (leave.start <= now && leave.end >= now) {
        current.push(leave);
      } else {
        upcomingList.push(leave);
      }
    });

    return { currentLeaves: current, upcomingLeaves: upcomingList };
  }, [leaves]);

  const nothingScheduled =
    !loading && currentLeaves.length === 0 && upcomingLeaves.length === 0;

  const updateQuery = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      if (!pathname) {
        return;
      }

      const params = new URLSearchParams(searchParamsString);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParamsString],
  );

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const handleToggleUpcoming = useCallback(
    (checked: boolean) => {
      updateQuery({ upcoming: checked ? "true" : "false" });
    },
    [updateQuery],
  );

  const handleLimitChange = useCallback(
    (value: string) => {
      updateQuery({ limit: value });
    },
    [updateQuery],
  );

  const handleCreateSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  const isPrivileged = isAdminOrManager(session);

  const limitOptions = ["3", "5", "10"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-sm text-muted-foreground">
            Review current and upcoming leave for this employee.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Book leave
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Switch
            checked={upcomingOnly}
            onChange={handleToggleUpcoming}
            aria-label="Only show current and upcoming leave"
          />
          <span>Only show current & upcoming leave</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing</span>
          <Select value={String(limit)} onValueChange={handleLimitChange}>
            <SelectTrigger className="h-9 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {limitOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option} items
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            Try again
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-2 border-b border-glass/40 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-primary">
            <CalendarDays className="h-5 w-5" />
            <CardTitle>Current & Upcoming Leave</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-4" data-testid="leave-loading">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-6">
              {nothingScheduled && (
                <div
                  data-testid="leave-empty"
                  className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground"
                >
                  No current or upcoming leave scheduled yet.
                </div>
              )}

              <section className="space-y-3">
                <header className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current leave
                </header>
                <div data-testid="leave-current">
                  {currentLeaves.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-muted/40 bg-muted/10 p-4 text-sm text-muted-foreground">
                      Nobody is currently away.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {currentLeaves.map((leave) => {
                        const statusMeta = getStatusMeta(leave.approvalStatus);
                        const dayTypeLabel = getDayTypeLabel(leave.dayType);
                        return (
                          <div
                            key={leave.id}
                            data-testid="leave-item"
                            className="rounded-2xl border border-glass/40 bg-background/80 p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 text-base font-semibold">
                                  <span>{leave.categoryName}</span>
                                  {statusMeta && (
                                    <Badge variant={statusMeta.variant}>
                                      {statusMeta.label}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatRange(leave.start, leave.end)}
                                </div>
                              </div>
                              <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground md:items-end">
                                {dayTypeLabel && (
                                  <Badge variant="outline">{dayTypeLabel}</Badge>
                                )}
                                <span>
                                  {calculateDuration(
                                    leave.start,
                                    leave.end,
                                    leave.dayType,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <header className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Upcoming leave
                </header>
                <div data-testid="leave-upcoming">
                  {upcomingLeaves.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-muted/40 bg-muted/10 p-4 text-sm text-muted-foreground">
                      No upcoming leave booked.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingLeaves.map((leave) => {
                        const statusMeta = getStatusMeta(leave.approvalStatus);
                        const dayTypeLabel = getDayTypeLabel(leave.dayType);
                        return (
                          <div
                            key={leave.id}
                            data-testid="leave-item"
                            className="rounded-2xl border border-glass/40 bg-background/80 p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 text-base font-semibold">
                                  <span>{leave.categoryName}</span>
                                  {statusMeta && (
                                    <Badge variant={statusMeta.variant}>
                                      {statusMeta.label}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatRange(leave.start, leave.end)}
                                </div>
                              </div>
                              <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground md:items-end">
                                {dayTypeLabel && (
                                  <Badge variant="outline">{dayTypeLabel}</Badge>
                                )}
                                <span>
                                  {calculateDuration(
                                    leave.start,
                                    leave.end,
                                    leave.dayType,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </CardContent>
      </Card>

      <AddLeaveRequestDialog
        employeeId={employeeId}
        isAdminOrManager={Boolean(isPrivileged)}
        open={dialogOpen}
        setOpen={setDialogOpen}
        onSubmitted={handleCreateSuccess}
      />
    </div>
  );
}
