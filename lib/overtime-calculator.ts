/**
 * NZ-Compliant Overtime Calculator
 * 
 * Implements multi-week pattern-aware overtime calculation
 * in compliance with NZ Employment Relations Act 2000
 * 
 * Calculation Modes:
 * - DAILY: Overtime when day hours exceed daily threshold
 * - WEEKLY: Overtime when week hours exceed weekly threshold (pattern-aware)
 * - MONTHLY: Overtime when month hours exceed monthly threshold
 * - PATTERN_BASED: Compare actual vs expected hours from working pattern
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  isSunday,
  format,
} from 'date-fns';
import { isNZPublicHoliday } from './public-holiday-checker';

const prisma = new PrismaClient();

export type OvertimeCalculationMode = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PATTERN_BASED';

export interface OvertimeSettings {
  overtimeCalculationMode: OvertimeCalculationMode;
  autoApplyOvertime: boolean;
  dailyOvertimeThreshold?: number;
  weeklyOvertimeThreshold?: number;
  monthlyOvertimeThreshold?: number;
  overtimeMultiplier: number;
  overtimeMultiplierTier2?: number;
  overtimeThresholdTier2?: number;
  publicHolidayMultiplier: number;
  sundayMultiplier?: number;
}

export interface EmployeeOvertimeConfig {
  overtimeEligible: boolean;
  overtimeThreshold?: number;
  overtimeMultiplier?: number;
  overtimeCalculationMode?: OvertimeCalculationMode;
  maxOvertimeHoursPerWeek?: number;
}

export interface OvertimeCalculationResult {
  regularHours: number;
  overtimeHours: number;
  overtimeMultiplier: number;
  overtimeType: string;
  overtimeReason: string;
}

export interface TimesheetEntryInput {
  id: string;
  date: Date;
  hours: number;
  timesheetId: string;
}

/**
 * Get employee's working pattern for a specific date
 * Handles multi-week patterns by calculating week in cycle
 */
async function getEmployeeWorkingPattern(employeeId: string, date: Date) {
  // Find the active working pattern assignment for this date
  const assignment = await prisma.employeeWorkingPatternAssignment.findFirst({
    where: {
      employeeId,
      effectiveDate: { lte: date },
    },
    orderBy: { effectiveDate: 'desc' },
    include: {
      WorkingPattern: {
        include: {
          WorkingPatternWeek: {
            include: {
              WorkingPatternDay: true,
            },
            orderBy: { weekNumber: 'asc' },
          },
        },
      },
    },
  });

  if (!assignment) {
    return null;
  }

  const { WorkingPattern, effectiveDate } = assignment;
  const weeks = WorkingPattern.WorkingPatternWeek;
  const weekCount = weeks.length;

  if (weekCount === 0) {
    return null;
  }

  // Calculate which week in the multi-week pattern we're in
  // This mirrors the logic from calculateLeaveDeduction.ts
  const diffInDays = differenceInDays(date, effectiveDate);
  const weekIndex = Math.floor(diffInDays / 7) % weekCount;
  const applicableWeek = weeks[weekIndex];

  return {
    pattern: WorkingPattern,
    week: applicableWeek,
    weekIndex,
    effectiveDate,
  };
}

/**
 * Get expected hours for a specific day from working pattern
 */
function getDayExpectedHours(
  week: { WorkingPatternDay: Array<{ day: string; hoursPerDay: Prisma.Decimal | null; type: string }> },
  date: Date
): number {
  const dayName = format(date, 'EEEE').toUpperCase(); // MONDAY, TUESDAY, etc.
  const dayPattern = week.WorkingPatternDay.find((d) => d.day === dayName);

  if (!dayPattern || dayPattern.type !== 'FULL_DAY') {
    return 0;
  }

  return dayPattern.hoursPerDay ? parseFloat(dayPattern.hoursPerDay.toString()) : 0;
}

/**
 * Get expected hours for entire week from working pattern
 */
function getWeekExpectedHours(
  week: { totalHours: Prisma.Decimal }
): number {
  return parseFloat(week.totalHours.toString());
}

/**
 * Get all timesheet entries for a specific week
 */
async function getWeekTimesheetEntries(
  employeeId: string,
  date: Date
): Promise<Array<{ id: string; date: Date; hours: Prisma.Decimal }>> {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  const entries = await prisma.timesheetEntry.findMany({
    where: {
      Timesheet: { employeeId },
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: {
      id: true,
      date: true,
      hours: true,
    },
  });

  return entries;
}

/**
 * Get all timesheet entries for a specific month
 */
async function getMonthTimesheetEntries(
  employeeId: string,
  date: Date
): Promise<Array<{ id: string; date: Date; hours: Prisma.Decimal }>> {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  const entries = await prisma.timesheetEntry.findMany({
    where: {
      Timesheet: { employeeId },
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      id: true,
      date: true,
      hours: true,
    },
  });

  return entries;
}


/**
 * Calculate overtime for a timesheet entry
 * Main entry point for overtime calculation
 */
export async function calculateOvertimeForEntry(
  entry: TimesheetEntryInput,
  employeeId: string,
  companyId: string,
  settings: OvertimeSettings,
  employeeConfig?: EmployeeOvertimeConfig
): Promise<OvertimeCalculationResult> {
  // Check if employee is eligible for overtime
  if (employeeConfig && !employeeConfig.overtimeEligible) {
    return {
      regularHours: entry.hours,
      overtimeHours: 0,
      overtimeMultiplier: 1.0,
      overtimeType: 'NONE',
      overtimeReason: 'Employee not eligible for overtime',
    };
  }

  // Determine which calculation mode to use (employee override or company default)
  const mode = employeeConfig?.overtimeCalculationMode || settings.overtimeCalculationMode;

  // Get base multiplier (employee override or company default)
  const baseMultiplier = employeeConfig?.overtimeMultiplier || settings.overtimeMultiplier;

  // Check for special day multipliers
  let multiplier = baseMultiplier;
  let specialDayReason = '';

  // Check if date is a public holiday
  const isPublicHoliday = await isNZPublicHoliday(entry.date, companyId);
  
  if (isPublicHoliday) {
    multiplier = settings.publicHolidayMultiplier;
    specialDayReason = ' (Public Holiday)';
  } else if (settings.sundayMultiplier && isSunday(entry.date)) {
    multiplier = settings.sundayMultiplier;
    specialDayReason = ' (Sunday Premium)';
  }

  // Route to appropriate calculation method based on mode
  switch (mode) {
    case 'DAILY':
      return await calculateDailyOvertime(entry, employeeId, settings, employeeConfig, multiplier, specialDayReason);

    case 'WEEKLY':
      return await calculateWeeklyOvertime(entry, employeeId, settings, employeeConfig, multiplier, specialDayReason);

    case 'MONTHLY':
      return await calculateMonthlyOvertime(entry, employeeId, settings, employeeConfig, multiplier, specialDayReason);

    case 'PATTERN_BASED':
      return await calculatePatternBasedOvertime(entry, employeeId, settings, employeeConfig, multiplier, specialDayReason);

    default:
      // Fallback to simple threshold
      return calculateSimpleOvertime(entry, settings.overtimeMultiplier);
  }
}

/**
 * DAILY Mode: Overtime when single day exceeds threshold
 */
async function calculateDailyOvertime(
  entry: TimesheetEntryInput,
  employeeId: string,
  settings: OvertimeSettings,
  employeeConfig: EmployeeOvertimeConfig | undefined,
  multiplier: number,
  specialDayReason: string
): Promise<OvertimeCalculationResult> {
  // Get working pattern for this specific day
  const patternInfo = await getEmployeeWorkingPattern(employeeId, entry.date);
  
  let dailyThreshold: number;
  
  if (patternInfo) {
    // Use pattern's expected hours for this day
    dailyThreshold = getDayExpectedHours(patternInfo.week, entry.date);
  } else {
    // Fall back to company/employee threshold
    dailyThreshold = employeeConfig?.overtimeThreshold || settings.dailyOvertimeThreshold || 8.0;
  }

  if (entry.hours <= dailyThreshold) {
    return {
      regularHours: entry.hours,
      overtimeHours: 0,
      overtimeMultiplier: 1.0,
      overtimeType: 'NONE',
      overtimeReason: '',
    };
  }

  const overtimeHours = entry.hours - dailyThreshold;

  // Check for tier 2 multiplier
  let finalMultiplier = multiplier;
  if (settings.overtimeMultiplierTier2 && settings.overtimeThresholdTier2) {
    if (overtimeHours > settings.overtimeThresholdTier2) {
      finalMultiplier = settings.overtimeMultiplierTier2;
    }
  }

  return {
    regularHours: dailyThreshold,
    overtimeHours,
    overtimeMultiplier: finalMultiplier,
    overtimeType: 'AUTO_DAILY',
    overtimeReason: `Exceeded daily ${dailyThreshold}h threshold${specialDayReason}`,
  };
}

/**
 * WEEKLY Mode: Overtime when week total exceeds threshold
 * Pattern-aware: uses week from multi-week cycle
 */
async function calculateWeeklyOvertime(
  entry: TimesheetEntryInput,
  employeeId: string,
  settings: OvertimeSettings,
  employeeConfig: EmployeeOvertimeConfig | undefined,
  multiplier: number,
  specialDayReason: string
): Promise<OvertimeCalculationResult> {
  // Get all entries for this week
  const weekEntries = await getWeekTimesheetEntries(employeeId, entry.date);
  const weekTotalHours = weekEntries.reduce((sum, e) => sum + parseFloat(e.hours.toString()), 0);

  // Get working pattern for threshold
  const patternInfo = await getEmployeeWorkingPattern(employeeId, entry.date);
  
  let weeklyThreshold: number;
  
  if (patternInfo) {
    // Use pattern's expected hours for this week in the cycle
    weeklyThreshold = getWeekExpectedHours(patternInfo.week);
  } else {
    // Fall back to company/employee threshold
    weeklyThreshold = employeeConfig?.overtimeThreshold || settings.weeklyOvertimeThreshold || 40.0;
  }

  if (weekTotalHours <= weeklyThreshold) {
    return {
      regularHours: entry.hours,
      overtimeHours: 0,
      overtimeMultiplier: 1.0,
      overtimeType: 'NONE',
      overtimeReason: '',
    };
  }

  const weekOvertimeHours = weekTotalHours - weeklyThreshold;

  // Distribute overtime proportionally across week entries
  // This entry's share of the overtime
  const entryProportion = parseFloat(entry.hours.toString()) / weekTotalHours;
  const entryOvertimeHours = weekOvertimeHours * entryProportion;

  // Check for tier 2
  let finalMultiplier = multiplier;
  if (settings.overtimeMultiplierTier2 && settings.overtimeThresholdTier2) {
    if (weekOvertimeHours > settings.overtimeThresholdTier2) {
      finalMultiplier = settings.overtimeMultiplierTier2;
    }
  }

  return {
    regularHours: entry.hours - entryOvertimeHours,
    overtimeHours: entryOvertimeHours,
    overtimeMultiplier: finalMultiplier,
    overtimeType: 'AUTO_WEEKLY',
    overtimeReason: `Week total (${weekTotalHours.toFixed(1)}h) exceeded ${weeklyThreshold}h threshold${specialDayReason}`,
  };
}

/**
 * MONTHLY Mode: Overtime when month total exceeds threshold
 */
async function calculateMonthlyOvertime(
  entry: TimesheetEntryInput,
  employeeId: string,
  settings: OvertimeSettings,
  employeeConfig: EmployeeOvertimeConfig | undefined,
  multiplier: number,
  specialDayReason: string
): Promise<OvertimeCalculationResult> {
  const monthEntries = await getMonthTimesheetEntries(employeeId, entry.date);
  const monthTotalHours = monthEntries.reduce((sum, e) => sum + parseFloat(e.hours.toString()), 0);

  const monthlyThreshold = settings.monthlyOvertimeThreshold || 173.33;

  if (monthTotalHours <= monthlyThreshold) {
    return {
      regularHours: entry.hours,
      overtimeHours: 0,
      overtimeMultiplier: 1.0,
      overtimeType: 'NONE',
      overtimeReason: '',
    };
  }

  const monthOvertimeHours = monthTotalHours - monthlyThreshold;
  const entryProportion = parseFloat(entry.hours.toString()) / monthTotalHours;
  const entryOvertimeHours = monthOvertimeHours * entryProportion;

  return {
    regularHours: entry.hours - entryOvertimeHours,
    overtimeHours: entryOvertimeHours,
    overtimeMultiplier: multiplier,
    overtimeType: 'AUTO_MONTHLY',
    overtimeReason: `Month total (${monthTotalHours.toFixed(1)}h) exceeded ${monthlyThreshold}h threshold${specialDayReason}`,
  };
}

/**
 * PATTERN_BASED Mode: Most accurate - compares actual vs expected from pattern
 * Recommended for NZ compliance as it respects contractual hours
 */
async function calculatePatternBasedOvertime(
  entry: TimesheetEntryInput,
  employeeId: string,
  settings: OvertimeSettings,
  employeeConfig: EmployeeOvertimeConfig | undefined,
  multiplier: number,
  specialDayReason: string
): Promise<OvertimeCalculationResult> {
  const patternInfo = await getEmployeeWorkingPattern(employeeId, entry.date);

  if (!patternInfo) {
    // No pattern: fall back to daily threshold
    return calculateDailyOvertime(entry, employeeId, settings, employeeConfig, multiplier, specialDayReason);
  }

  // Check daily threshold from pattern
  const dayExpectedHours = getDayExpectedHours(patternInfo.week, entry.date);
  const dayOvertimeHours = Math.max(0, entry.hours - dayExpectedHours);

  if (dayOvertimeHours > 0) {
    return {
      regularHours: dayExpectedHours,
      overtimeHours: dayOvertimeHours,
      overtimeMultiplier: multiplier,
      overtimeType: 'AUTO_PATTERN',
      overtimeReason: `Exceeded pattern day hours (${dayExpectedHours}h)${specialDayReason}`,
    };
  }

  // Also check weekly threshold from pattern
  const weekEntries = await getWeekTimesheetEntries(employeeId, entry.date);
  const weekTotalHours = weekEntries.reduce((sum, e) => sum + parseFloat(e.hours.toString()), 0);
  const weekExpectedHours = getWeekExpectedHours(patternInfo.week);

  if (weekTotalHours > weekExpectedHours) {
    const weekOvertimeHours = weekTotalHours - weekExpectedHours;
    const entryProportion = parseFloat(entry.hours.toString()) / weekTotalHours;
    const entryOvertimeHours = weekOvertimeHours * entryProportion;

    return {
      regularHours: entry.hours - entryOvertimeHours,
      overtimeHours: entryOvertimeHours,
      overtimeMultiplier: multiplier,
      overtimeType: 'AUTO_PATTERN',
      overtimeReason: `Week total (${weekTotalHours.toFixed(1)}h) exceeded pattern (${weekExpectedHours}h)${specialDayReason}`,
    };
  }

  // No overtime
  return {
    regularHours: entry.hours,
    overtimeHours: 0,
    overtimeMultiplier: 1.0,
    overtimeType: 'NONE',
    overtimeReason: '',
  };
}

/**
 * Simple fallback overtime calculation
 */
function calculateSimpleOvertime(
  entry: TimesheetEntryInput,
  multiplier: number
): OvertimeCalculationResult {
  // Simple fallback: no overtime
  return {
    regularHours: entry.hours,
    overtimeHours: 0,
    overtimeMultiplier: 1.0,
    overtimeType: 'NONE',
    overtimeReason: 'Auto-apply overtime disabled',
  };
}

/**
 * Batch calculate overtime for multiple entries (e.g., week or month)
 * More efficient than calculating one at a time
 */
export async function batchCalculateOvertime(
  entries: TimesheetEntryInput[],
  employeeId: string,
  companyId: string,
  settings: OvertimeSettings,
  employeeConfig?: EmployeeOvertimeConfig
): Promise<Map<string, OvertimeCalculationResult>> {
  const results = new Map<string, OvertimeCalculationResult>();

  for (const entry of entries) {
    const result = await calculateOvertimeForEntry(
      entry,
      employeeId,
      companyId,
      settings,
      employeeConfig
    );
    results.set(entry.id, result);
  }

  return results;
}
