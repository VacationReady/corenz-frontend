"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Plus,
  RotateCcw,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
import EmployeeFormCard from "@/components/employees/EmployeeFormCard";
import EmployeePageHeader from "@/components/employees/EmployeePageHeader";
import { cn } from "@/lib/utils";

type RawLeaveRequest = {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  dayType?: string | null;
  approvalStatus?: string | null;
  EventCategory?: { id: string; name: string } | null;
  eventCategory?: { id: string; name: string } | null;
  leaveType?: string | null;
  isSick?: boolean;
};

type LeaveRequest = RawLeaveRequest & {
  start: Date;
  end: Date;
  categoryName: string;
  isSick: boolean;
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
  
  // Determine if this is sick leave using first-class leaveType field or isSick flag
  const isSick = leave.isSick === true || 
    leave.leaveType === "SICK" || 
    categoryName.toLowerCase().includes("sick");

  return {
    ...leave,
    start,
    end,
    categoryName,
    isSick,
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

function getStatusConfig(status?: string | null) {
  if (!status) return null;
  const normalized = status.toLowerCase();
  
  if (normalized === "approved") {
    return { 
      label: "Approved", 
      variant: "secondary" as const,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30"
    };
  }
  if (normalized === "declined") {
    return { 
      label: "Declined", 
      variant: "destructive" as const,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30"
    };
  }
  return {
    label: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    variant: "outline" as const,
    icon: AlertCircle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30"
  };
}

// Leave Item Card Component
function LeaveItemCard({ 
  leave, 
  index, 
  canDelete = false,
  onDelete,
}: { 
  leave: LeaveRequest; 
  index: number;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}) {
  const statusConfig = getStatusConfig(leave.approvalStatus);
  const dayTypeLabel = getDayTypeLabel(leave.dayType);
  const StatusIcon = statusConfig?.icon;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this leave request? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/leave-request/${leave.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Leave request deleted");
      onDelete?.(leave.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete leave request");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "group relative p-4 rounded-2xl transition-all duration-200",
        "bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10",
        "border border-white/30 dark:border-white/10 hover:border-primary/20",
        "shadow-sm hover:shadow-md"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
            statusConfig?.bgColor
          )}>
            {StatusIcon && <StatusIcon className={cn("w-5 h-5", statusConfig?.color)} />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">
                {leave.isSick ? "Sick Leave" : leave.categoryName}
              </span>
              {leave.isSick && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Sick
                </Badge>
              )}
              {statusConfig && (
                <Badge variant={statusConfig.variant} className="text-xs">
                  {statusConfig.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {formatRange(leave.start, leave.end)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start gap-1 text-sm sm:items-end sm:text-right">
            {dayTypeLabel && (
              <Badge variant="outline" className="text-xs">
                {dayTypeLabel}
              </Badge>
            )}
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {calculateDuration(leave.start, leave.end, leave.dayType)}
            </span>
          </div>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg",
                "text-muted-foreground hover:text-destructive",
                "hover:bg-destructive/10 transition-all",
                "opacity-0 group-hover:opacity-100",
                isDeleting && "opacity-50 cursor-not-allowed"
              )}
              title="Delete leave request"
            >
              <Trash2 className={cn("w-4 h-4", isDeleting && "animate-pulse")} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Empty State Component
function EmptyLeaveState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 mb-4">
        <CalendarDays className="w-8 h-8 text-primary dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No Leave Scheduled</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        There's no current or upcoming leave scheduled. Click the button above to book new leave.
      </p>
    </motion.div>
  );
}

import { useTenantFetch } from "@/hooks/useTenantFetch";

function LeavePageContent() {
  const params = useParams();
  const employeeId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const tenantFetch = useTenantFetch();
  
  // Determine if user is booking for themselves
  // Check if the user's linked employee ID matches the page's employee ID
  const currentUserEmployeeId = (session?.user as any)?.employeeId;
  const isBookingForSelf = currentUserEmployeeId === employeeId || !currentUserEmployeeId;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<{
    type: "unauthorized" | "forbidden" | "not_found";
    message: string;
  } | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  const searchParamsString = useMemo(
    () => (searchParams ? searchParams.toString() : ""),
    [searchParams],
  );

  const limitParam = searchParams?.get("limit") ?? null;
  const upcomingParam = searchParams?.get("upcoming") ?? null;
  const typeParam = searchParams?.get("type") ?? null; // "all" | "sick" | "other"

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
  
  // Type filter: "all" | "sick" | "other"
  const typeFilter = useMemo(() => {
    if (typeParam === "sick" || typeParam === "other") return typeParam;
    return "all";
  }, [typeParam]);

  useEffect(() => {
    if (status === "loading") return;

    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setAuthError(null);

      try {
        const query = new URLSearchParams();
        query.set("limit", String(limit));
        if (upcomingQueryValue) {
          query.set("upcoming", upcomingQueryValue);
        }
        // Add isSick filter if type is specified
        if (typeFilter === "sick") {
          query.set("isSick", "true");
        } else if (typeFilter === "other") {
          query.set("isSick", "false");
        }

        const queryString = query.toString();
        const res = await tenantFetch(
          `/api/employees/${employeeId}/leave-requests${queryString ? `?${queryString}` : ""}`,
          { signal: controller.signal },
        );

        if (res.status === 401) {
          if (!active) return;
          setAuthError({
            type: "unauthorized",
            message: "You need to be logged in to view leave requests.",
          });
          setLeaves([]);
          return;
        }

        if (res.status === 403) {
          if (!active) return;
          const data = await res.json().catch(() => ({}));
          setAuthError({
            type: "forbidden",
            message:
              data.error ??
              "You don't have permission to view this employee's leave requests.",
          });
          setLeaves([]);
          return;
        }

        if (res.status === 404) {
          if (!active) return;
          setAuthError({
            type: "not_found",
            message: "Employee not found.",
          });
          setLeaves([]);
          return;
        }

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
  }, [employeeId, limit, upcomingQueryValue, typeFilter, refreshToken]);

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

  const handleTypeChange = useCallback(
    (value: string) => {
      updateQuery({ type: value === "all" ? null : value });
    },
    [updateQuery],
  );

  const handleCreateSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  const isPrivileged = isAdminOrManager(session);

  const limitOptions = ["3", "5", "10"];

  // Authorization error state
  if (authError) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <EmployeePageHeader
          title="Leave Management"
          description="Review current and upcoming leave for this employee"
          icon={Calendar}
          iconColor="from-primary to-blue-500"
        />

        <EmployeeFormCard
          title="Access Error"
          icon={AlertCircle}
          iconColor="from-primary/20 to-blue-500/20"
        >
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-4">
              <CalendarDays className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {authError.type === "unauthorized"
                ? "Authentication Required"
                : authError.type === "not_found"
                  ? "Employee Not Found"
                  : "Access Denied"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {authError.message}
            </p>
            {authError.type === "unauthorized" && (
              <Button onClick={() => router.push("/api/auth/signin")}>
                Sign In
              </Button>
            )}
            {(authError.type === "forbidden" || authError.type === "not_found") && (
              <Button variant="outline" onClick={() => router.push("/employees")}>
                Back to Employees
              </Button>
            )}
          </div>
        </EmployeeFormCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <EmployeePageHeader
          title="Leave Management"
          description="Review current and upcoming leave for this employee"
          icon={Calendar}
          iconColor="from-primary to-blue-500"
          action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="gap-2"
            >
              <RotateCcw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Book leave
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between glass-subtle rounded-2xl p-4"
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>Filters:</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={upcomingOnly}
              onChange={handleToggleUpcoming}
              aria-label="Only show current and upcoming leave"
            />
            <span className="text-sm text-muted-foreground">Upcoming only</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Type:</span>
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-9 w-28 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sick">Sick only</SelectItem>
                <SelectItem value="other">Non-sick</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Show:</span>
          <Select value={String(limit)} onValueChange={handleLimitChange}>
            <SelectTrigger className="h-9 w-24 rounded-xl">
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
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
        >
          <span className="text-destructive">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            Try again
          </Button>
        </motion.div>
      )}

      {/* Current Leave Section */}
      <EmployeeFormCard
        title="Current Leave"
        description="Leave currently in progress"
        icon={CalendarDays}
        iconColor="from-primary/20 to-blue-500/20"
        delay={0.15}
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : currentLeaves.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No one is currently on leave
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {currentLeaves.map((leave, index) => (
                <LeaveItemCard 
                  key={leave.id} 
                  leave={leave} 
                  index={index}
                  canDelete={isPrivileged}
                  onDelete={refresh}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </EmployeeFormCard>

      {/* Upcoming Leave Section */}
      <EmployeeFormCard
        title="Upcoming Leave"
        description="Scheduled future leave"
        icon={Calendar}
        iconColor="from-primary/20 to-blue-500/20"
        delay={0.2}
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : upcomingLeaves.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No upcoming leave scheduled
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {upcomingLeaves.map((leave, index) => (
                <LeaveItemCard 
                  key={leave.id} 
                  leave={leave} 
                  index={index}
                  canDelete={isPrivileged}
                  onDelete={refresh}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </EmployeeFormCard>

      {/* Empty State for both */}
      {nothingScheduled && !loading && (
        <EmptyLeaveState />
      )}

      <AddLeaveRequestDialog
        employeeId={employeeId}
        isAdminOrManager={Boolean(isPrivileged)}
        isBookingForSelf={isBookingForSelf}
        open={dialogOpen}
        setOpen={setDialogOpen}
        onSubmitted={handleCreateSuccess}
      />
    </div>
  );
}

export default function LeavePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading leave...</div>}>
      <LeavePageContent />
    </Suspense>
  );
}
