/**
 * Shared calendar helpers for FullCalendar integration
 * Used by both /calendar (company-wide) and /employees/[id]/leave (employee-scoped)
 */

import type { EventInput } from "@fullcalendar/core";

// ============================================================================
// Types
// ============================================================================

export interface LeaveEventExtendedProps {
  leaveRequestId: string;
  approvalStatus: string;
  dayType?: string | null;
  reason?: string | null;
  sickReason?: string | null;
  paidStatus?: string | null;
  isSick?: boolean;
  isOtherEntitlement?: boolean;
  categoryName?: string | null;
  categoryIconKey?: string | null;
  eventCategoryId?: string | null;
  // Original dates for display (YYYY-MM-DD format)
  startDateStr?: string;
  endDateStr?: string;
  employee?: {
    id: string;
    name?: string | null;
    profileImageUrl?: string | null;
    department?: string | null;
  } | null;
}

export interface DailyCounts {
  [dateKey: string]: number;
}

export interface DailyCategoryCounts {
  [dateKey: string]: Record<string, number>;
}

// ============================================================================
// Date Key Utilities
// ============================================================================

/**
 * Generate a date key string in YYYY-MM-DD format from local date
 */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Generate a date key string in YYYY-MM-DD format from UTC date
 */
export function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// ============================================================================
// Category Color Mapping
// ============================================================================

/**
 * Get CSS class for category color chip styling
 */
export function getCategoryColor(name: string): string {
  const key = (name || "").toLowerCase();
  if (key.includes("annual") || key.includes("holiday")) return "cz-chip-modern--annual";
  if (key.includes("sick")) return "cz-chip-modern--sick";
  if (key.includes("training")) return "cz-chip-modern--training";
  if (key.includes("maternity") || key.includes("parent")) return "cz-chip-modern--parental";
  if (key.includes("compassion") || key.includes("bereave")) return "cz-chip-modern--compassion";
  if (key.includes("doctor")) return "cz-chip-modern--medical";
  if (key.includes("dentist")) return "cz-chip-modern--medical";
  if (key.includes("unpaid")) return "cz-chip-modern--unpaid";
  if (key.includes("toil") || key.includes("lieu")) return "cz-chip-modern--toil";
  return "cz-chip-modern--default";
}

/**
 * Get status-based color config for badges - using subtle, refined colors
 */
export function getStatusColorConfig(status?: string | null): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  accentColor: string;
} | null {
  if (!status) return null;
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return {
      label: "Approved",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
      textClass: "text-emerald-600 dark:text-emerald-400",
      borderClass: "border-emerald-100 dark:border-emerald-900",
      accentColor: "#d1fae5", // emerald-100 - subtle
    };
  }
  if (normalized === "declined") {
    return {
      label: "Declined",
      bgClass: "bg-rose-50 dark:bg-rose-950/30",
      textClass: "text-rose-600 dark:text-rose-400",
      borderClass: "border-rose-100 dark:border-rose-900",
      accentColor: "#fee2e2", // rose-100 - subtle
    };
  }
  if (normalized === "pending") {
    return {
      label: "Pending",
      bgClass: "bg-amber-50 dark:bg-amber-950/30",
      textClass: "text-amber-600 dark:text-amber-400",
      borderClass: "border-amber-100 dark:border-amber-900",
      accentColor: "#fef3c7", // amber-100 - subtle
    };
  }
  return {
    label: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    bgClass: "bg-gray-50 dark:bg-gray-900/30",
    textClass: "text-gray-600 dark:text-gray-400",
    borderClass: "border-gray-100 dark:border-gray-800",
    accentColor: "#f1f5f9", // slate-100
  };
}

// ============================================================================
// Heatmap Helpers
// ============================================================================

/**
 * Get heat level (0-5) based on event count
 */
export function getHeatLevel(count: number): number {
  if (count >= 7) return 5;
  if (count >= 5) return 4;
  if (count >= 4) return 3;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}

/**
 * Get heat alpha opacity based on count and optional threshold
 */
export function getHeatAlpha(count: number, maxConcurrentThreshold?: number): number {
  const base = count >= 5 ? 0.35 : count >= 3 ? 0.24 : 0.14;
  if (maxConcurrentThreshold && count >= maxConcurrentThreshold) {
    return Math.min(0.5, base + 0.1);
  }
  return base;
}

/**
 * Generate day cell class names for heatmap styling
 */
export function getDayCellClassNames(
  date: Date,
  dailyCounts: DailyCounts,
  options: {
    selectedDay?: Date | null;
    blackoutDateKeys?: Set<string>;
  } = {}
): string[] {
  const key = dateKey(date);
  const count = dailyCounts[key] || 0;
  const level = getHeatLevel(count);
  const today = new Date();
  const isToday = today.toDateString() === date.toDateString();
  const isSelected = options.selectedDay && options.selectedDay.toDateString() === date.toDateString();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const isBlackout = options.blackoutDateKeys?.has(key) ?? false;

  return [
    "cz-daycell",
    isBlackout && "cz-daycell--blackout",
    level > 0 && `cz-daycell--heat-${level}`,
    isToday && "cz-daycell--today",
    isSelected && "cz-daycell--selected",
    isWeekend && "cz-daycell--weekend",
  ].filter((v): v is string => Boolean(v));
}

// ============================================================================
// Event Mapping Helpers
// ============================================================================

/**
 * Map a raw leave request to FullCalendar EventInput format
 */
export function mapLeaveRequestToEvent(
  leave: {
    id: string;
    startDate: string | Date;
    endDate: string | Date;
    dayType?: string | null;
    approvalStatus?: string | null;
    reason?: string | null;
    sickReason?: string | null;
    paidStatus?: string | null;
    leaveType?: string | null;
    isSick?: boolean;
    isOtherEntitlement?: boolean;
    categoryName?: string | null; // Pre-resolved category name (for other entitlements)
    otherEntitlementName?: string | null;
    EventCategory?: { id: string; name: string; iconKey?: string | null } | null;
    eventCategory?: { id: string; name: string; iconKey?: string | null } | null;
    Employee?: {
      id: string;
      User?: { name?: string | null; firstName?: string | null; lastName?: string | null } | null;
      profileImageUrl?: string | null;
      Department?: { name?: string | null } | null;
    } | null;
    employee?: {
      id: string;
      name?: string | null;
      profileImageUrl?: string | null;
      department?: string | null;
    } | null;
  },
  options: {
    colorByStatus?: boolean;
  } = {}
): EventInput {
  const category = leave.EventCategory ?? leave.eventCategory;
  // Use pre-resolved categoryName if available (for other entitlements), otherwise fall back to category name
  const isOtherEntitlement = leave.isOtherEntitlement === true || leave.leaveType === "OTHER_ENTITLEMENT";
  const categoryName = leave.categoryName ?? leave.otherEntitlementName ?? category?.name ?? "Leave";
  const categoryIconKey = category?.iconKey ?? null;
  const isSick = leave.isSick === true || leave.leaveType === "SICK" || categoryName.toLowerCase().includes("sick");

  // Resolve employee info
  let employeeInfo: LeaveEventExtendedProps["employee"] = null;
  if (leave.employee) {
    employeeInfo = leave.employee;
  } else if (leave.Employee) {
    const user = leave.Employee.User;
    const name = user?.name || 
      (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
      null;
    employeeInfo = {
      id: leave.Employee.id,
      name,
      profileImageUrl: leave.Employee.profileImageUrl ?? null,
      department: leave.Employee.Department?.name ?? null,
    };
  }

  // Determine color based on status and sick leave - using very subtle palette
  // These colors are used for FullCalendar's internal rendering but we override in renderEventContent
  let backgroundColor = "#f1f5f9"; // slate-100 - very subtle default
  let borderColor = "#e2e8f0"; // slate-200
  
  // Sick leave uses subtle warm tone
  if (isSick) {
    backgroundColor = "#fef3c7"; // amber-100
    borderColor = "#fde68a"; // amber-200
  } else if (options.colorByStatus) {
    const status = (leave.approvalStatus || "").toLowerCase();
    if (status === "approved") {
      backgroundColor = "#d1fae5"; // emerald-100
      borderColor = "#a7f3d0"; // emerald-200
    } else if (status === "pending") {
      backgroundColor = "#fef3c7"; // amber-100
      borderColor = "#fde68a"; // amber-200
    } else if (status === "declined") {
      backgroundColor = "#fee2e2"; // rose-100
      borderColor = "#fecaca"; // rose-200
    }
  }

  // Parse dates and format for FullCalendar
  // FullCalendar uses EXCLUSIVE end dates for all-day events
  // So if leave is 25th-27th, we need to pass end as 28th
  const startDate = typeof leave.startDate === "string" ? new Date(leave.startDate) : leave.startDate;
  const endDate = typeof leave.endDate === "string" ? new Date(leave.endDate) : leave.endDate;
  
  // Format date as YYYY-MM-DD to avoid timezone issues
  const formatDateLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Add 1 day for exclusive end (FullCalendar convention for all-day events)
  const exclusiveEndDate = new Date(endDate);
  exclusiveEndDate.setDate(exclusiveEndDate.getDate() + 1);

  return {
    id: leave.id,
    title: employeeInfo?.name || categoryName,
    start: formatDateLocal(startDate),
    end: formatDateLocal(exclusiveEndDate),
    allDay: true,
    backgroundColor,
    borderColor,
    extendedProps: {
      leaveRequestId: leave.id,
      approvalStatus: leave.approvalStatus || "PENDING",
      dayType: leave.dayType,
      reason: leave.reason,
      sickReason: leave.sickReason,
      paidStatus: leave.paidStatus,
      isSick,
      isOtherEntitlement,
      categoryName,
      categoryIconKey,
      eventCategoryId: category?.id,
      employee: employeeInfo,
      // Store original dates for display in detail views
      startDateStr: formatDateLocal(startDate),
      endDateStr: formatDateLocal(endDate),
    } satisfies LeaveEventExtendedProps,
  };
}

/**
 * Calculate daily counts from a list of events
 */
export function calculateDailyCounts(
  events: Array<{ start: string | Date; end?: string | Date; categoryName?: string }>,
  rangeStart: Date,
  rangeEnd: Date
): { dailyCounts: DailyCounts; dailyCategoryCounts: DailyCategoryCounts } {
  const counts: DailyCounts = {};
  const categoryCounts: DailyCategoryCounts = {};

  for (const ev of events) {
    const start = new Date(ev.start);
    const end = new Date(ev.end || ev.start);
    const cur = new Date(Math.max(start.getTime(), rangeStart.getTime()));
    const last = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
    cur.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);
    const label = ev.categoryName || "Other";

    for (let d = new Date(cur); d <= last; d.setDate(d.getDate() + 1)) {
      const key = dateKey(d);
      counts[key] = (counts[key] || 0) + 1;
      if (!categoryCounts[key]) categoryCounts[key] = {};
      categoryCounts[key][label] = (categoryCounts[key][label] || 0) + 1;
    }
  }

  return { dailyCounts: counts, dailyCategoryCounts: categoryCounts };
}

// ============================================================================
// Day Type Helpers
// ============================================================================

const DAY_TYPE_LABELS: Record<string, string> = {
  FULL_DAY: "Full day",
  HALF_DAY_AM: "Half day (AM)",
  HALF_DAY_PM: "Half day (PM)",
};

/**
 * Get human-readable label for day type
 */
export function getDayTypeLabel(dayType?: string | null): string | null {
  if (!dayType) return null;
  return DAY_TYPE_LABELS[dayType] ?? dayType.replace(/_/g, " ");
}

/**
 * Calculate duration string from dates and day type
 */
export function calculateDurationLabel(
  start: Date,
  end: Date,
  dayType?: string | null
): string {
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

// ============================================================================
// Filter Helpers
// ============================================================================

/**
 * Filter events to only show upcoming (where end date >= today)
 * Uses tenant timezone if provided
 */
export function filterUpcomingEvents<T extends { end?: string | Date; start: string | Date }>(
  events: T[],
  today?: Date
): T[] {
  const now = today || new Date();
  now.setHours(0, 0, 0, 0);

  return events.filter((ev) => {
    const endDate = new Date(ev.end || ev.start);
    endDate.setHours(23, 59, 59, 999);
    return endDate >= now;
  });
}
