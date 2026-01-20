/**
 * Leave Hours Conversion Utilities
 * 
 * Centralized conversion functions for hours ↔ days leave tracking.
 * Supports NZ Holidays Act 2003 compliance for part-time and variable-hour employees.
 * 
 * INTERNAL UNIT: Hours (source of truth)
 * DISPLAY UNIT: Days (configurable per company)
 * 
 * @version 1.0
 * @date 2026
 */

import type { Decimal } from '@prisma/client/runtime/library';

// ============================================
// CONSTANTS
// ============================================

/** Default hours per standard NZ working day */
export const DEFAULT_HOURS_PER_DAY = 8;

// ============================================
// FEATURE FLAG
// ============================================

/**
 * Company configuration for hours-based leave tracking.
 * 
 * IMPORTANT: When leaveHoursEnabled is false, the system MUST behave
 * exactly as before (days-only). Hours fields may exist but must not
 * influence any calculations or display.
 */
export interface CompanyLeaveConfig {
  /** Whether hours-based tracking is enabled for this company */
  leaveHoursEnabled: boolean;
  /** Default hours per working day for this company */
  defaultHoursPerDay: number;
  /** Display unit preference */
  leaveDisplayUnit: LeaveDisplayUnit;
}

/**
 * Check if hours-based leave tracking is enabled for a company.
 * 
 * DEFAULT: true (enabled by default for new rollouts)
 * 
 * When this returns false:
 * - All leave calculations use days only (legacy behavior)
 * - Hours fields are ignored even if populated
 * - No hours data is written or read
 * 
 * When this returns true:
 * - Hours are the source of truth
 * - Days are derived from hours for display
 * - Accurate tracking for part-time/variable-hour employees
 * 
 * @param companyConfig - Company configuration (can be partial)
 * @returns true if hours tracking is enabled (defaults to true if not explicitly set to false)
 */
export function isLeaveHoursEnabled(
  companyConfig: { leaveHoursEnabled?: boolean | null } | null | undefined
): boolean {
  // Default to true - hours tracking is enabled unless explicitly disabled
  if (!companyConfig) return true;
  if (companyConfig.leaveHoursEnabled === null || companyConfig.leaveHoursEnabled === undefined) return true;
  return companyConfig.leaveHoursEnabled === true;
}

/** Minimum hours per day (for validation) */
export const MIN_HOURS_PER_DAY = 1;

/** Maximum hours per day (for validation) */
export const MAX_HOURS_PER_DAY = 24;

// ============================================
// TYPES
// ============================================

export type LeaveDisplayUnit = 'DAYS' | 'HOURS' | 'BOTH';

export interface WorkingPatternHours {
  /** Hours per day for each day of the week (0 = Sunday, 6 = Saturday) */
  hoursPerDay: Record<number, number>;
  /** Average hours per working day */
  averageHoursPerDay: number;
  /** Total hours per week */
  totalHoursPerWeek: number;
  /** Number of working days per week */
  workingDaysPerWeek: number;
}

export interface LeaveConversionContext {
  /** Company default hours per day */
  defaultHoursPerDay: number;
  /** Employee's working pattern hours (if available) */
  workingPattern?: WorkingPatternHours;
  /** Display unit preference */
  displayUnit: LeaveDisplayUnit;
}

export interface ConvertedLeaveBalance {
  /** Balance in hours (source of truth) */
  hours: number;
  /** Balance in days (for display) */
  days: number;
  /** Formatted display string */
  display: string;
}

// ============================================
// CORE CONVERSION FUNCTIONS
// ============================================

/**
 * Convert hours to display days (rounded to 0.5 increments).
 * 
 * This is the standard conversion for UI display.
 * Uses the provided hoursPerDay or defaults to 8.
 * 
 * @param hours - Hours to convert
 * @param hoursPerDay - Hours per working day (default: 8)
 * @returns Days rounded to nearest 0.5
 */
export function hoursToDisplayDays(hours: number, hoursPerDay: number = DEFAULT_HOURS_PER_DAY): number {
  if (hours === 0) return 0;
  const days = hours / hoursPerDay;
  return Math.round(days * 2) / 2; // Round to nearest 0.5
}

/**
 * Convert hours to exact days (no rounding).
 * 
 * Use this for calculations where precision matters.
 * 
 * @param hours - Hours to convert
 * @param hoursPerDay - Hours per working day (default: 8)
 * @returns Exact days value
 */
export function hoursToExactDays(hours: number, hoursPerDay: number = DEFAULT_HOURS_PER_DAY): number {
  if (hours === 0) return 0;
  return hours / hoursPerDay;
}

/**
 * Convert days to hours.
 * 
 * @param days - Days to convert
 * @param hoursPerDay - Hours per working day (default: 8)
 * @returns Hours
 */
export function daysToHours(days: number, hoursPerDay: number = DEFAULT_HOURS_PER_DAY): number {
  return days * hoursPerDay;
}

/**
 * Convert a Decimal value to number safely.
 * 
 * @param value - Decimal or number or null
 * @param defaultValue - Default value if null/undefined
 * @returns Number value
 */
export function decimalToNumber(value: Decimal | number | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  return typeof value === 'number' ? value : Number(value);
}

// ============================================
// WORKING PATTERN INTEGRATION
// ============================================

/**
 * Get hours for a specific day of the week from a working pattern.
 * 
 * @param workingPattern - Working pattern hours data
 * @param dayOfWeek - Day of week (0 = Sunday, 6 = Saturday)
 * @param defaultHoursPerDay - Fallback if no pattern data
 * @returns Hours for that day
 */
export function getHoursForDay(
  workingPattern: WorkingPatternHours | undefined,
  dayOfWeek: number,
  defaultHoursPerDay: number = DEFAULT_HOURS_PER_DAY
): number {
  if (!workingPattern) return defaultHoursPerDay;
  return workingPattern.hoursPerDay[dayOfWeek] ?? 0;
}

/**
 * Calculate working pattern hours from WorkingPatternDay records.
 * 
 * @param patternDays - Array of working pattern day records
 * @returns WorkingPatternHours summary
 */
export function calculateWorkingPatternHours(
  patternDays: Array<{
    day: string;
    type: string;
    hoursPerDay?: Decimal | number | null;
  }>
): WorkingPatternHours {
  const dayNameToNumber: Record<string, number> = {
    'SUNDAY': 0,
    'MONDAY': 1,
    'TUESDAY': 2,
    'WEDNESDAY': 3,
    'THURSDAY': 4,
    'FRIDAY': 5,
    'SATURDAY': 6,
  };

  const hoursPerDay: Record<number, number> = {};
  let totalHours = 0;
  let workingDays = 0;

  for (const day of patternDays) {
    const dayNum = dayNameToNumber[day.day.toUpperCase()];
    if (dayNum === undefined) continue;

    // Non-working days have 0 hours
    if (day.type === 'NON_WORKING') {
      hoursPerDay[dayNum] = 0;
      continue;
    }

    // Get hours for this day
    const hours = decimalToNumber(day.hoursPerDay, DEFAULT_HOURS_PER_DAY);
    hoursPerDay[dayNum] = hours;

    if (hours > 0) {
      totalHours += hours;
      workingDays++;
    }
  }

  const averageHoursPerDay = workingDays > 0 ? totalHours / workingDays : DEFAULT_HOURS_PER_DAY;

  return {
    hoursPerDay,
    averageHoursPerDay,
    totalHoursPerWeek: totalHours,
    workingDaysPerWeek: workingDays,
  };
}

// ============================================
// DISPLAY FORMATTING
// ============================================

/**
 * Format leave balance for display based on company preference.
 * 
 * @param hours - Balance in hours
 * @param context - Conversion context with display preferences
 * @returns Formatted display string
 */
export function formatLeaveBalanceDisplay(
  hours: number,
  context: LeaveConversionContext
): ConvertedLeaveBalance {
  const hoursPerDay = context.workingPattern?.averageHoursPerDay ?? context.defaultHoursPerDay;
  const days = hoursToDisplayDays(hours, hoursPerDay);

  let display: string;
  switch (context.displayUnit) {
    case 'HOURS':
      display = formatHours(hours);
      break;
    case 'BOTH':
      display = `${formatDays(days)} (${formatHours(hours)})`;
      break;
    case 'DAYS':
    default:
      display = formatDays(days);
      break;
  }

  return { hours, days, display };
}

/**
 * Format hours for display.
 * 
 * @param hours - Hours value
 * @returns Formatted string (e.g., "16 hours", "1 hour")
 */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  if (rounded === 1) return '1 hour';
  return `${rounded} hours`;
}

/**
 * Format days for display.
 * 
 * @param days - Days value
 * @returns Formatted string (e.g., "2 days", "1 day", "0.5 days")
 */
export function formatDays(days: number): string {
  const rounded = Math.round(days * 100) / 100;
  if (rounded === 1) return '1 day';
  return `${rounded} days`;
}

/**
 * Format leave balance with both units.
 * 
 * @param hours - Balance in hours
 * @param hoursPerDay - Hours per working day
 * @returns Formatted string (e.g., "2 days (16 hours)")
 */
export function formatLeaveBalanceBoth(hours: number, hoursPerDay: number = DEFAULT_HOURS_PER_DAY): string {
  const days = hoursToDisplayDays(hours, hoursPerDay);
  return `${formatDays(days)} (${formatHours(hours)})`;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate hours per day value.
 * 
 * @param hoursPerDay - Hours per day to validate
 * @returns Whether the value is valid
 */
export function isValidHoursPerDay(hoursPerDay: number): boolean {
  return hoursPerDay >= MIN_HOURS_PER_DAY && hoursPerDay <= MAX_HOURS_PER_DAY;
}

/**
 * Clamp hours per day to valid range.
 * 
 * @param hoursPerDay - Hours per day to clamp
 * @returns Clamped value
 */
export function clampHoursPerDay(hoursPerDay: number): number {
  return Math.max(MIN_HOURS_PER_DAY, Math.min(MAX_HOURS_PER_DAY, hoursPerDay));
}

// ============================================
// LEAVE DEDUCTION HELPERS
// ============================================

/**
 * Calculate leave deduction in hours for a specific date.
 * 
 * This considers the employee's working pattern to determine
 * the actual hours that should be deducted for that day.
 * 
 * @param date - The date of leave
 * @param dayType - Type of leave day (FULL_DAY, HALF_DAY_AM, HALF_DAY_PM, etc.)
 * @param workingPattern - Employee's working pattern hours
 * @param defaultHoursPerDay - Fallback hours per day
 * @returns Hours to deduct
 */
export function calculateLeaveDeductionHours(
  date: Date,
  dayType: 'FULL_DAY' | 'HALF_DAY_AM' | 'HALF_DAY_PM' | 'TIMED' | 'NON_WORKING',
  workingPattern: WorkingPatternHours | undefined,
  defaultHoursPerDay: number = DEFAULT_HOURS_PER_DAY
): number {
  // Non-working days have no deduction
  if (dayType === 'NON_WORKING') return 0;

  // Get hours for this specific day of week
  const dayOfWeek = date.getDay();
  const hoursForDay = getHoursForDay(workingPattern, dayOfWeek, defaultHoursPerDay);

  // If this day has 0 hours in the pattern, no deduction
  if (hoursForDay === 0) return 0;

  switch (dayType) {
    case 'FULL_DAY':
    case 'TIMED':
      return hoursForDay;
    case 'HALF_DAY_AM':
    case 'HALF_DAY_PM':
      return hoursForDay / 2;
    default:
      return 0;
  }
}

/**
 * Convert a day-based deduction to hours.
 * 
 * This is a backward-compatible helper for transitioning from days to hours.
 * 
 * @param dayDeduction - Deduction in days (1, 0.5, 0)
 * @param hoursPerDay - Hours per working day
 * @returns Deduction in hours
 */
export function dayDeductionToHours(
  dayDeduction: number,
  hoursPerDay: number = DEFAULT_HOURS_PER_DAY
): number {
  return dayDeduction * hoursPerDay;
}
