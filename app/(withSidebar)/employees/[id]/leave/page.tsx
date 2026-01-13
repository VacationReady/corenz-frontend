"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import type { EventContentArg } from "@fullcalendar/core";
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
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Flame,
  Thermometer,
  Edit,
  Gift,
} from "lucide-react";
import { toast } from "sonner";

import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { isAdminOrManager, isAdmin } from "@/lib/roles";
import EmployeeFormCard from "@/components/employees/EmployeeFormCard";
import EmployeePageHeader from "@/components/employees/EmployeePageHeader";
import { cn } from "@/lib/utils";
import { getEventCategoryIcon } from "@/lib/event-category-icons";
import {
  dateKey,
  getCategoryColor,
  getHeatLevel,
  getDayTypeLabel,
  getStatusColorConfig,
  mapLeaveRequestToEvent,
  filterUpcomingEvents,
  type DailyCounts,
  type LeaveEventExtendedProps,
} from "@/lib/calendar/calendar-helpers";
import {
  resolveTenantTimeSettings,
  formatTenantDate,
  type TenantTimeSettings,
} from "@/lib/calendar/timezone";

import { useTenantFetch } from "@/hooks/useTenantFetch";
import EditOtherEntitlementsModal from "@/components/leave/EditOtherEntitlementsModal";
import EditAnnualLeaveModal from "@/components/leave/EditAnnualLeaveModal";
import EntitlementChoiceDialog, { type EntitlementChoice } from "@/components/leave/EntitlementChoiceDialog";
import AddCategoryModal from "@/components/AddCategoryModal";

// ============================================================================
// Types
// ============================================================================

interface BalanceItem {
  id: string;
  type: "entitlement" | "stored";
  categoryId: string | null;
  categoryName: string;
  categoryIconKey: string | null;
  remaining: number;
  used: number;
  total: number | null;
  pending: number;
  carryover: number;
  carryoverExpiry: string | null;
  // NZ Holidays Act 2003 compliance fields (for annual leave)
  isUnearned?: boolean;
  futureEntitlement?: number | null;
  entitlementDate?: string | null;
  leaveInAdvanceUsed?: number;
}

interface SickLeaveStatus {
  availableDays: number;
  isEligibleToday: boolean;
  eligibleFrom: string | null;
  nextGrantDate: string | null;
  capDays: number;
  dayLengthHours: number;
}

interface OtherEntitlement {
  id: string;
  name: string;
  balance: number;
  unit: string;
  notes?: string;
}

// ============================================================================
// Sick Leave Card Component
// ============================================================================

function SickLeaveCard({
  sickLeaveStatus,
}: {
  sickLeaveStatus: SickLeaveStatus;
}) {
  // Format date for display (e.g., "15 Jul 2025")
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Date not set";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="p-4 rounded-xl bg-gradient-to-br from-red-50/30 to-orange-50/10 border border-red-200/30 dark:from-red-950/30 dark:to-orange-950/10 dark:border-red-800/30"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <Thermometer className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <span className="font-medium text-sm">Sick Leave</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Remaining</span>
          <p className="font-semibold text-lg text-red-600 dark:text-red-400">{sickLeaveStatus.availableDays}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Used</span>
          <p className="font-medium">{sickLeaveStatus.capDays - sickLeaveStatus.availableDays}</p>
        </div>
      </div>
      {/* Sick leave renewal/eligibility info */}
      <div className="mt-2 pt-2 border-t border-red-200/20 dark:border-red-800/20 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          {sickLeaveStatus.isEligibleToday ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-3 h-3" />
              Eligible today
            </span>
          ) : sickLeaveStatus.eligibleFrom ? (
            <span className="text-amber-600 dark:text-amber-400">
              Eligible from {formatDate(sickLeaveStatus.eligibleFrom)}
            </span>
          ) : (
            <span className="text-muted-foreground">Not eligible</span>
          )}
        </div>
        {/* Show next grant date when eligible */}
        {sickLeaveStatus.isEligibleToday && sickLeaveStatus.nextGrantDate && (
          <p className="text-xs text-muted-foreground">
            Renews {formatDate(sickLeaveStatus.nextGrantDate)}
          </p>
        )}
        {/* Show when 10 days will be granted for not-yet-eligible employees */}
        {!sickLeaveStatus.isEligibleToday && sickLeaveStatus.eligibleFrom && (
          <p className="text-xs text-muted-foreground">
            10 days granted on {formatDate(sickLeaveStatus.eligibleFrom)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Other Entitlements Card Component
// ============================================================================

function OtherEntitlementsCard({
  entitlements,
  onEdit,
  canEdit = false,
}: {
  entitlements: OtherEntitlement[];
  onEdit: () => void;
  canEdit?: boolean;
}) {
  const hasEntitlements = entitlements.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 rounded-xl bg-gradient-to-br from-purple-50/30 to-violet-50/10 border border-purple-200/30 dark:from-purple-950/30 dark:to-violet-950/10 dark:border-purple-800/30 relative"
    >
      {canEdit && (
        <button
          onClick={onEdit}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/50 hover:bg-background/80 transition-colors"
          title="Edit other entitlements"
        >
          <Edit className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Gift className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <span className="font-medium text-sm">Other Entitlements</span>
      </div>

      {hasEntitlements ? (
        <div className="space-y-2">
          {entitlements.map((ent) => (
            <div key={ent.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate">{ent.name}</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {ent.balance} {ent.unit}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">No other entitlements</p>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Balance Card Component
// ============================================================================

function BalanceCard({
  balance,
  index,
  onEdit,
  sickLeaveStatus,
}: {
  balance: BalanceItem;
  index: number;
  onEdit?: () => void;
  sickLeaveStatus?: SickLeaveStatus | null;
}) {
  const Icon = getEventCategoryIcon(balance.categoryIconKey);
  const hasTotal = balance.total !== null;
  const isAnnualLeave = balance.categoryName.toLowerCase().includes('annual');
  const isSickLeave = balance.categoryName.toLowerCase().includes('sick');
  const isUnearned = balance.isUnearned === true;
  
  // Format date for display (e.g., "15 Jul 2025")
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Date not set";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "Invalid date";
    }
  };

  // Calculate days until entitlement for unearned leave using UTC to avoid timezone issues
  const daysUntilEntitlement = isUnearned && balance.entitlementDate
    ? (() => {
        const entitlementDate = new Date(balance.entitlementDate);
        const today = new Date();
        const entitlementUTC = Date.UTC(entitlementDate.getFullYear(), entitlementDate.getMonth(), entitlementDate.getDate());
        const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        return Math.ceil((entitlementUTC - todayUTC) / (1000 * 60 * 60 * 24));
      })()
    : null;
  
  // Unearned annual leave card (pre-12-month employees)
  if (isUnearned && isAnnualLeave) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="p-4 rounded-xl bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200/50 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-800/30 relative"
      >
        {onEdit && (
          <button
            onClick={onEdit}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-background/50 hover:bg-background/80 transition-colors"
            title="Edit balance"
          >
            <Edit className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        
        {/* Header with unearned indicator */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm">{balance.categoryName}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                Unearned - accruing towards entitlement
              </span>
            </div>
          </div>
        </div>
        
        {/* Balance display */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-muted-foreground text-xs">Available to book</span>
            <p className="font-semibold text-lg text-amber-600 dark:text-amber-400">
              {balance.remaining.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Future entitlement</span>
            <p className="font-medium">{balance.futureEntitlement?.toFixed(2) ?? balance.total?.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Leave in advance used */}
        {(balance.leaveInAdvanceUsed ?? 0) > 0 && (
          <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-amber-100/50 dark:bg-amber-900/20 mb-2">
            <span className="text-amber-700 dark:text-amber-300">Leave in advance used</span>
            <span className="font-medium text-amber-800 dark:text-amber-200">
              {balance.leaveInAdvanceUsed?.toFixed(2)} days
            </span>
          </div>
        )}
        
        {/* Entitlement date info */}
        {balance.entitlementDate && (
          <div className="pt-2 border-t border-amber-200/30 dark:border-amber-800/30">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Entitled on {formatDate(balance.entitlementDate)}
              </span>
              {daysUntilEntitlement !== null && daysUntilEntitlement > 0 && (
                <Badge variant="outline" className="text-[9px] ml-auto px-1.5 py-0 h-4 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                  {daysUntilEntitlement} days
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Under NZ law, annual leave is earned after 12 months of employment
            </p>
          </div>
        )}
        
        {/* Pending requests */}
        {balance.pending > 0 && (
          <div className="mt-2 pt-2 border-t border-amber-200/30 dark:border-amber-800/30">
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {balance.pending} pending request{balance.pending > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </motion.div>
    );
  }
  
  // Standard balance card (post-12-month employees or non-annual leave)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-muted/30 relative"
    >
      {isAnnualLeave && balance.type === 'entitlement' && onEdit && (
        <button
          onClick={onEdit}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/50 hover:bg-background/80 transition-colors"
          title="Edit balance"
        >
          <Edit className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="font-medium text-sm">{balance.categoryName}</span>
        {balance.type === "stored" && (
          <Badge variant="outline" className="text-[10px] ml-auto">
            Stored
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Remaining</span>
          <p className="font-semibold text-lg text-primary">{balance.remaining.toFixed(2)}</p>
        </div>
        {hasTotal ? (
          <div>
            <span className="text-muted-foreground text-xs">Total</span>
            <p className="font-medium">{balance.total?.toFixed(2)}</p>
          </div>
        ) : (
          <div>
            <span className="text-muted-foreground text-xs">Used</span>
            <p className="font-medium">{balance.used.toFixed(2)}</p>
          </div>
        )}
      </div>
      {/* Sick leave renewal/eligibility info */}
      {isSickLeave && sickLeaveStatus && (
        <div className="mt-2 pt-2 border-t border-muted/30">
          {sickLeaveStatus.isEligibleToday ? (
            sickLeaveStatus.nextGrantDate && (
              <p className="text-xs text-muted-foreground">
                Renews {formatDate(sickLeaveStatus.nextGrantDate)}
              </p>
            )
          ) : sickLeaveStatus.eligibleFrom ? (
            <p className="text-xs text-muted-foreground">
              10 days granted on {formatDate(sickLeaveStatus.eligibleFrom)}
            </p>
          ) : null}
        </div>
      )}
      {balance.pending > 0 && (
        <div className={cn(
          "mt-2 pt-2 border-t border-muted/30",
          isSickLeave && sickLeaveStatus && (sickLeaveStatus.isEligibleToday || sickLeaveStatus.eligibleFrom) && "mt-1 pt-1 border-t-0"
        )}>
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {balance.pending} pending request{balance.pending > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

function LeavePageContent() {
  const params = useParams();
  const employeeId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const tenantFetch = useTenantFetch();
  const calendarRef = useRef<FullCalendar | null>(null);
  const eventsCacheRef = useRef<{ key: string; data: EventInput[] } | null>(null);

  // Determine if user is booking for themselves
  const sessionEmployeeId = (session?.user as any)?.employeeId as string | undefined;
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | undefined>(
    sessionEmployeeId,
  );
  const isBookingForSelf = Boolean(currentUserEmployeeId && currentUserEmployeeId === employeeId);
  const isPrivileged = isAdminOrManager(session);
  const isAdminUser = isAdmin(session);

  // Fallback: some users may not have employeeId on the session; resolve via API
  useEffect(() => {
    let active = true;
    const resolve = async () => {
      if (!employeeId) return;
      if (currentUserEmployeeId) return;
      const userId = (session?.user as any)?.id as string | undefined;
      if (!userId) return;
      try {
        const res = await fetch(
          `/api/employees?status=active&userId=${encodeURIComponent(userId)}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => []);
        const emp = Array.isArray(data) ? data[0] : null;
        if (active && emp?.id) setCurrentUserEmployeeId(emp.id as string);
      } catch {
        // no-op
      }
    };
    resolve();
    return () => {
      active = false;
    };
  }, [session, employeeId, currentUserEmployeeId]);

  // UI State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"dayGridMonth" | "listMonth">("dayGridMonth");
  const [currentTitle, setCurrentTitle] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  // Filters
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "sick" | "other">("all");
  const [showSickHeatmap, setShowSickHeatmap] = useState(true); // Always on

  // Data State
  const [leaveEvents, setLeaveEvents] = useState<EventInput[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyCounts>({});
  const [sickDayOfWeekCounts, setSickDayOfWeekCounts] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]); // M T W T F S S
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [sickLeaveStatus, setSickLeaveStatus] = useState<SickLeaveStatus | null>(null);
  const [otherEntitlements, setOtherEntitlements] = useState<OtherEntitlement[]>([]);
  const [tenantTimeSettings, setTenantTimeSettings] = useState<TenantTimeSettings>(() =>
    resolveTenantTimeSettings(null, null)
  );

  // Modal State
  const [otherEntitlementsModalOpen, setOtherEntitlementsModalOpen] = useState(false);
  const [annualLeaveModalOpen, setAnnualLeaveModalOpen] = useState(false);
  const [entitlementChoiceDialogOpen, setEntitlementChoiceDialogOpen] = useState(false);
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);

  // Sheet State
  const [selectedEvent, setSelectedEvent] = useState<LeaveEventExtendedProps | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Auth Error State
  const [authError, setAuthError] = useState<{
    type: "unauthorized" | "forbidden" | "not_found";
    message: string;
  } | null>(null);

  // Load tenant time settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/public-holidays");
        if (res.ok) {
          const data = await res.json();
          const template = data?.template ?? null;
          const region = data?.region ?? null;
          setTenantTimeSettings(resolveTenantTimeSettings(template, region));
        }
      } catch {
        // Use default settings
      }
    })();
  }, []);

  // Load all leave data in parallel for better performance
  // Previously these were 3 sequential useEffects causing ~600ms waterfall
  // Now parallelized to ~200ms
  useEffect(() => {
    if (sessionStatus === "loading" || !employeeId) return;

    let active = true;
    (async () => {
      const results = await Promise.allSettled([
        tenantFetch(`/api/employees/${employeeId}/leave-balances`),
        tenantFetch(`/api/employees/${employeeId}/sick-leave-status`),
        tenantFetch(`/api/employees/${employeeId}/other-entitlements`),
      ]);

      if (!active) return;

      // Process leave balances
      if (results[0].status === "fulfilled" && results[0].value.ok) {
        try {
          const data = await results[0].value.json();
          setBalances(data.balances || []);
        } catch (err) {
          console.error("Failed to parse balances:", err);
        }
      } else if (results[0].status === "rejected") {
        console.error("Failed to load balances:", results[0].reason);
      }

      // Process sick leave status
      if (results[1].status === "fulfilled" && results[1].value.ok) {
        try {
          const data = await results[1].value.json();
          setSickLeaveStatus(data);
        } catch (err) {
          console.error("Failed to parse sick leave status:", err);
        }
      } else if (results[1].status === "rejected") {
        console.error("Failed to load sick leave status:", results[1].reason);
      }

      // Process other entitlements
      if (results[2].status === "fulfilled" && results[2].value.ok) {
        try {
          const data = await results[2].value.json();
          setOtherEntitlements(data.entitlements || []);
        } catch (err) {
          console.error("Failed to parse other entitlements:", err);
        }
      } else if (results[2].status === "rejected") {
        console.error("Failed to load other entitlements:", results[2].reason);
      }
    })();

    return () => {
      active = false;
    };
  }, [employeeId, sessionStatus, refreshToken, tenantFetch]);

  // Clear events cache when employeeId changes to prevent stale data across employees
  useEffect(() => {
    eventsCacheRef.current = null;
  }, [employeeId]);

  // Fetch leave events for calendar
  const fetchLeaveEvents = useCallback(
    async (
      fetchInfo: EventSourceFuncArg,
      successCallback: (events: EventInput[]) => void,
      failureCallback: (error: any) => void
    ) => {
      try {
        const cacheKey = `${employeeId}|${fetchInfo.startStr}|${fetchInfo.endStr}|${typeFilter}`;

        // Check cache
        if (eventsCacheRef.current?.key === cacheKey) {
          let events = eventsCacheRef.current.data;
          if (upcomingOnly) {
            events = filterUpcomingEvents(events as any) as EventInput[];
          }
          successCallback(events);
          return;
        }

        const params = new URLSearchParams({
          from: fetchInfo.startStr,
          to: fetchInfo.endStr,
        });

        // Add status filter - fetch APPROVED + PENDING
        params.set("status", "APPROVED,PENDING");
        
        // Add type filter
        if (typeFilter === "sick") {
          params.set("isSick", "true");
        } else if (typeFilter === "other") {
          params.set("isSick", "false");
        }

        const res = await tenantFetch(
          `/api/employees/${employeeId}/leave-requests?${params.toString()}`
        );

        if (res.status === 401) {
          setAuthError({
            type: "unauthorized",
            message: "You need to be logged in to view leave requests.",
          });
          successCallback([]);
          return;
        }

        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          setAuthError({
            type: "forbidden",
            message: data.error ?? "You don't have permission to view this employee's leave requests.",
          });
          successCallback([]);
          return;
        }

        if (res.status === 404) {
          setAuthError({
            type: "not_found",
            message: "Employee not found.",
          });
          successCallback([]);
          return;
        }

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const payload = await res.json();
        const rawEvents = Array.isArray(payload) ? payload : [];

        // Map to FullCalendar events with colorByStatus
        let events = rawEvents.map((leave: any) =>
          mapLeaveRequestToEvent(leave, { colorByStatus: true })
        );

        // Cache the events
        eventsCacheRef.current = { key: cacheKey, data: events };

        // Calculate daily counts and day-of-week counts for heatmap (sick only if enabled)
        if (showSickHeatmap) {
          const sickEvents = rawEvents.filter(
            (e: any) => e.isSick || e.leaveType === "SICK"
          );
          const counts: DailyCounts = {};
          const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // M T W T F S S
          const rangeStart = new Date(fetchInfo.startStr);
          const rangeEnd = new Date(fetchInfo.endStr);
          
          for (const ev of sickEvents) {
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate || ev.startDate);
            const cur = new Date(Math.max(start.getTime(), rangeStart.getTime()));
            const last = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
            cur.setHours(0, 0, 0, 0);
            last.setHours(0, 0, 0, 0);

            for (let d = new Date(cur); d <= last; d.setDate(d.getDate() + 1)) {
              const key = dateKey(d);
              counts[key] = (counts[key] || 0) + 1;
              // Convert JS day (0=Sun) to MTWTFSS index (0=Mon)
              const jsDay = d.getDay();
              const mtwtfssIndex = jsDay === 0 ? 6 : jsDay - 1;
              dayOfWeekCounts[mtwtfssIndex]++;
            }
          }
          setDailyCounts(counts);
          setSickDayOfWeekCounts(dayOfWeekCounts);
        } else {
          setDailyCounts({});
          setSickDayOfWeekCounts([0, 0, 0, 0, 0, 0, 0]);
        }

        // Store all events for reference
        setLeaveEvents(events);

        // Apply upcoming filter if enabled
        if (upcomingOnly) {
          events = filterUpcomingEvents(events as any) as EventInput[];
        }

        setLoading(false);
        successCallback(events);
      } catch (error) {
        console.error("Failed to fetch leave events:", error);
        setLoading(false);
        failureCallback(error);
      }
    },
    [employeeId, typeFilter, upcomingOnly, showSickHeatmap, tenantFetch]
  );

  // Event sources for FullCalendar
  const eventSources = useMemo(
    () => [{ id: "leave", events: fetchLeaveEvents }],
    [fetchLeaveEvents]
  );

  // Day cell class names for heatmap
  const dayCellClassNames = useCallback(
    (arg: any) => {
      if (!showSickHeatmap) return ["cz-daycell"];
      
      const d = arg.date as Date;
      const key = dateKey(d);
      const count = dailyCounts[key] || 0;
      const level = getHeatLevel(count);
      const today = new Date();
      const isToday = today.toDateString() === d.toDateString();
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      return [
        "cz-daycell",
        level > 0 && `cz-daycell--heat-${level}`,
        isToday && "cz-daycell--today",
        isWeekend && "cz-daycell--weekend",
      ].filter((v): v is string => Boolean(v));
    },
    [dailyCounts, showSickHeatmap]
  );

  // Event content renderer
  const renderEventContent = useCallback(
    (content: EventContentArg) => {
      const props = content.event.extendedProps as LeaveEventExtendedProps;
      const categoryName = props.categoryName || "Leave";
      const Icon = getEventCategoryIcon(props.categoryIconKey);

      return (
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-all",
            "hover:ring-2 hover:ring-primary/30",
            props.isSick && "bg-red-500/20"
          )}
          onClick={() => {
            setSelectedEvent(props);
            setSheetOpen(true);
          }}
        >
          <Icon className="w-3 h-3 flex-shrink-0" />
          <span className="text-[10px] font-medium truncate">{categoryName}</span>
        </div>
      );
    },
    []
  );

  // Handle edit annual leave balance
  const handleEditAnnualLeave = () => {
    setAnnualLeaveModalOpen(true);
  };

  // Handle date click for booking leave
  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.date);
    setDialogOpen(true);
  };

  // Handle dialog close to clear selected date
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDate(null);
  };

  // Refresh calendar and data
  const refresh = useCallback(() => {
    eventsCacheRef.current = null;
    setRefreshToken((t) => t + 1);
    calendarRef.current?.getApi().refetchEvents();
  }, []);

  // Handle view change
  const handleChangeView = (viewName: "dayGridMonth" | "listMonth") => {
    setCurrentView(viewName);
    calendarRef.current?.getApi().changeView(viewName);
  };

  // Handle delete leave request
  const handleDeleteEvent = async () => {
    if (!selectedEvent?.leaveRequestId) return;
    
    if (!confirm("Delete this leave request? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await tenantFetch(`/api/leave-request/${selectedEvent.leaveRequestId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Leave request deleted");
      setSheetOpen(false);
      setSelectedEvent(null);
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete leave request");
    }
  };

  // Authorization error state
  if (authError) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <EmployeePageHeader
          title="Leave Calendar"
          description="View and manage leave for this employee"
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
              <Button onClick={() => router.push("/api/auth/signin")}>Sign In</Button>
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
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <EmployeePageHeader
        title="Leave Calendar"
        description="View and manage leave for this employee"
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

      {/* Balances Panel */}
      {(balances.length > 0 || isPrivileged) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EmployeeFormCard
            title="Leave Balances"
            description="Current entitlements and balances"
            icon={CalendarDays}
            iconColor="from-primary/20 to-blue-500/20"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {balances.map((balance, index) => (
                <BalanceCard 
                  key={balance.id} 
                  balance={balance} 
                  index={index} 
                  onEdit={balance.categoryName.toLowerCase().includes('annual') ? handleEditAnnualLeave : undefined}
                  sickLeaveStatus={balance.categoryName.toLowerCase().includes('sick') ? sickLeaveStatus : undefined}
                />
              ))}
              <OtherEntitlementsCard 
                entitlements={otherEntitlements} 
                onEdit={() => setEntitlementChoiceDialogOpen(true)}
                canEdit={isAdminUser}
              />
            </div>
          </EmployeeFormCard>
        </motion.div>
      )}


      {/* Calendar Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden">
          {/* Calendar Controls */}
          <div className="p-4 border-b border-border/50 bg-gradient-to-r from-card via-card to-muted/10">
            <div className="flex flex-col gap-4">
              {/* Top Row - Navigation and View Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border/50 bg-background/50 overflow-hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => calendarRef.current?.getApi().prev()}
                      className="rounded-none h-8 px-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => calendarRef.current?.getApi().today()}
                      className="rounded-none h-8 px-3 border-x border-border/30 font-medium"
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => calendarRef.current?.getApi().next()}
                      className="rounded-none h-8 px-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <motion.h2
                    key={currentTitle}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-semibold"
                  >
                    {currentTitle}
                  </motion.h2>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border/50 bg-background/50 p-0.5">
                    <Button
                      variant={currentView === "dayGridMonth" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleChangeView("dayGridMonth")}
                      className={cn(
                        "rounded-md h-7 px-2.5 gap-1 text-xs",
                        currentView === "dayGridMonth" && "bg-primary text-primary-foreground"
                      )}
                    >
                      <Grid3X3 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Month</span>
                    </Button>
                    <Button
                      variant={currentView === "listMonth" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleChangeView("listMonth")}
                      className={cn(
                        "rounded-md h-7 px-2.5 gap-1 text-xs",
                        currentView === "listMonth" && "bg-primary text-primary-foreground"
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">List</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/30">
                <div className="flex items-center gap-2 text-sm">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Filters:</span>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="upcoming-only-filter"
                    checked={upcomingOnly}
                    onChange={(checked) => {
                      setUpcomingOnly(checked);
                      eventsCacheRef.current = null;
                      calendarRef.current?.getApi().refetchEvents();
                    }}
                    aria-label="Show upcoming leave requests only"
                  />
                  <label htmlFor="upcoming-only-filter" className="text-sm text-muted-foreground cursor-pointer">
                    Upcoming only
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <Select
                    value={typeFilter}
                    onValueChange={(value: "all" | "sick" | "other") => {
                      setTypeFilter(value);
                      eventsCacheRef.current = null;
                      calendarRef.current?.getApi().refetchEvents();
                    }}
                  >
                    <SelectTrigger className="h-8 w-28 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sick">Sick only</SelectItem>
                      <SelectItem value="other">Non-sick</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sick Heatmap - Modern tile design */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Sick days by weekday:</span>
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-muted/30 backdrop-blur-sm">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => {
                      const count = sickDayOfWeekCounts[idx];
                      // Progressive amber → dark red: 0=neutral, 1=amber, 2-3=orange, 4=red, 5+=dark red
                      const getHeatColor = (c: number) => {
                        if (c === 0) return "bg-slate-100 dark:bg-slate-800/60";
                        if (c === 1) return "bg-amber-300 dark:bg-amber-500/70";
                        if (c === 2) return "bg-orange-400 dark:bg-orange-500/80";
                        if (c === 3) return "bg-orange-500 dark:bg-orange-600/85";
                        if (c === 4) return "bg-red-500 dark:bg-red-500/90";
                        return "bg-red-700 dark:bg-red-700/95"; // 5+
                      };
                      const getTextColor = (c: number) => {
                        if (c === 0) return "text-slate-500 dark:text-slate-400";
                        if (c <= 2) return "text-slate-800 dark:text-white";
                        return "text-white";
                      };
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-200 shadow-sm",
                            getHeatColor(count),
                            getTextColor(count),
                            count > 0 && "shadow-md ring-1 ring-black/5"
                          )}
                          title={`${day}: ${count} sick day${count !== 1 ? "s" : ""}`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-muted-foreground">Legend:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>Approved</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-500" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span>Sick / Declined</span>
                </div>
              </div>

            </div>
          </div>

          {/* Calendar */}
          <div className="bg-card">
            {loading && sessionStatus === "loading" ? (
              <div className="p-8">
                <Skeleton className="h-[400px] w-full rounded-xl" />
              </div>
            ) : (
              <div className="calendar-wrapper">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={false}
                  datesSet={(arg) => {
                    setCurrentTitle(arg.view?.title || "");
                  }}
                  eventSources={eventSources}
                  eventContent={renderEventContent}
                  dayCellClassNames={dayCellClassNames}
                  dateClick={handleDateClick}
                  fixedWeekCount={false}
                  dayMaxEvents={4}
                  eventDisplay="block"
                  height="auto"
                  timeZone={tenantTimeSettings.timeZone}
                />
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Event Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedEvent?.categoryIconKey && (
                (() => {
                  const Icon = getEventCategoryIcon(selectedEvent.categoryIconKey);
                  return <Icon className="w-5 h-5 text-primary" />;
                })()
              )}
              Leave Details
            </SheetTitle>
          </SheetHeader>

          {selectedEvent && (
            <div className="mt-6 space-y-6">
              {/* Category & Status */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", getCategoryColor(selectedEvent.categoryName || ""))}>
                    {selectedEvent.categoryName || "Leave"}
                  </Badge>
                  {selectedEvent.isSick && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                      Sick Leave
                    </Badge>
                  )}
                </div>
                {(() => {
                  const statusConfig = getStatusColorConfig(selectedEvent.approvalStatus);
                  if (!statusConfig) return null;
                  return (
                    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm", statusConfig.bgClass)}>
                      {selectedEvent.approvalStatus === "APPROVED" && <CheckCircle2 className="w-4 h-4" />}
                      {selectedEvent.approvalStatus === "PENDING" && <AlertCircle className="w-4 h-4" />}
                      {selectedEvent.approvalStatus === "DECLINED" && <XCircle className="w-4 h-4" />}
                      <span className={cn("font-medium", statusConfig.textClass)}>{statusConfig.label}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Dates */}
              {selectedEvent.startDateStr && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Date Range</span>
                  </div>
                  {(() => {
                    const startDate = new Date(selectedEvent.startDateStr + 'T00:00:00');
                    const endDate = selectedEvent.endDateStr 
                      ? new Date(selectedEvent.endDateStr + 'T00:00:00')
                      : startDate;
                    const isSingleDay = selectedEvent.startDateStr === selectedEvent.endDateStr;
                    
                    // Calculate duration
                    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    const duration = selectedEvent.dayType === "HALF_DAY_AM" || selectedEvent.dayType === "HALF_DAY_PM"
                      ? "0.5 day"
                      : `${diffDays} day${diffDays === 1 ? "" : "s"}`;
                    
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {isSingleDay ? "Date" : "From"}
                          </span>
                          <span className="font-medium">
                            {format(startDate, "EEE, d MMM yyyy")}
                          </span>
                        </div>
                        {!isSingleDay && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">To</span>
                            <span className="font-medium">
                              {format(endDate, "EEE, d MMM yyyy")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-muted/30">
                          <span className="text-sm text-muted-foreground">Duration</span>
                          <span className="font-semibold text-primary">{duration}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Day Type */}
              {selectedEvent.dayType && (
                <div>
                  <span className="text-sm text-muted-foreground">Day Type</span>
                  <p className="font-medium">{getDayTypeLabel(selectedEvent.dayType)}</p>
                </div>
              )}

              {/* Reason */}
              {selectedEvent.reason && (
                <div>
                  <span className="text-sm text-muted-foreground">Reason</span>
                  <p className="text-sm mt-1 p-3 bg-muted/30 rounded-lg italic">
                    "{selectedEvent.reason}"
                  </p>
                </div>
              )}

              {/* Sick Reason */}
              {selectedEvent.sickReason && (
                <div>
                  <span className="text-sm text-muted-foreground">Sick Leave Reason</span>
                  <p className="text-sm mt-1 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    {selectedEvent.sickReason}
                  </p>
                </div>
              )}

              {/* Paid Status */}
              {selectedEvent.paidStatus && (
                <div>
                  <span className="text-sm text-muted-foreground">Paid Status</span>
                  <p className="font-medium">{selectedEvent.paidStatus}</p>
                </div>
              )}
            </div>
          )}

          <SheetFooter className="mt-8 gap-2">
            {isPrivileged && selectedEvent && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteEvent}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
            <SheetClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Book Leave Dialog */}
      <AddLeaveRequestDialog
        employeeId={employeeId}
        isAdminOrManager={Boolean(isPrivileged)}
        isAdmin={isAdminUser}
        isBookingForSelf={isBookingForSelf}
        canBookSickLeaveOverride={
          isBookingForSelf &&
          (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN")
            ? true
            : undefined
        }
        open={dialogOpen}
        setOpen={handleDialogClose}
        onSubmitted={refresh}
        sickLeaveData={sickLeaveStatus}
        initialDate={selectedDate}
      />

      {/* Edit Other Entitlements Modal */}
      {isPrivileged && (
        <EditOtherEntitlementsModal
          isOpen={otherEntitlementsModalOpen}
          onClose={() => setOtherEntitlementsModalOpen(false)}
          employeeId={employeeId}
          onSuccess={refresh}
        />
      )}

      {/* Entitlement Choice Dialog */}
      {isPrivileged && (
        <EntitlementChoiceDialog
          isOpen={entitlementChoiceDialogOpen}
          onClose={() => setEntitlementChoiceDialogOpen(false)}
          onChoice={(choice: EntitlementChoice) => {
            setEntitlementChoiceDialogOpen(false);
            if (choice === 'company-wide') {
              setAddCategoryModalOpen(true);
            } else if (choice === 'employee-only') {
              setOtherEntitlementsModalOpen(true);
            }
          }}
        />
      )}

      {/* Add Category Modal (for company-wide event types) */}
      {isPrivileged && (
        <AddCategoryModal
          isOpen={addCategoryModalOpen}
          onClose={() => setAddCategoryModalOpen(false)}
          onSuccess={() => {
            setAddCategoryModalOpen(false);
            refresh();
          }}
          defaultCategoryType="TIME_OFF"
          defaultBalanceRequired={true}
        />
      )}

      {/* Edit Annual Leave Balance Modal */}
      {isPrivileged && (
        <EditAnnualLeaveModal
          isOpen={annualLeaveModalOpen}
          onClose={() => setAnnualLeaveModalOpen(false)}
          employeeId={employeeId}
          currentBalance={
            balances.find((b) => b.categoryName.toLowerCase().includes('annual'))?.remaining || 0
          }
          onSuccess={refresh}
        />
      )}
    </div>
  );
}

export default function LeavePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading leave calendar...</div>}>
      <LeavePageContent />
    </Suspense>
  );
}
