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

import { Prisma } from '@prisma/client';
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

// Lazy-load Prisma to prevent test environment database connection errors
let prisma: any = null;
function getPrisma() {
  if (!prisma && process.env.NODE_ENV !== 'test') {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

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

/**
 * Detailed breakdown for audit trail and compliance
 */
export interface OvertimeBreakdownItem {
  type: 'regular' | 'overtime' | 'public_holiday' | 'sunday_premium';
  hours: number;
  multiplier: number;
  description: string;
}

/**
 * Enhanced calculation result with full audit trail
 * Compliant with NZ Employment Relations Act 2000 record-keeping requirements
 */
export interface DetailedOvertimeResult {
  regularHours: number;
  overtimeHours: number;
  overtimeMultiplier: number;
  isPublicHoliday: boolean;
  reason: string;
  breakdown: OvertimeBreakdownItem[];
  calculationTimestamp: Date;
  calculationMode: OvertimeCalculationMode;
}

/**
 * Input for pure overtime calculation (no database dependencies)
 */
export interface PureOvertimeInput {
  hoursWorked: number;
  dailyThreshold: number;
  weeklyThreshold?: number;
  monthlyThreshold?: number;
  weekTotalHours?: number;
  monthTotalHours?: number;
  isPublicHoliday: boolean;
  isSunday: boolean;
  baseMultiplier: number;
  publicHolidayMultiplier: number;
  sundayMultiplier?: number;
  tier2Multiplier?: number;
  tier2Threshold?: number;
  mode: OvertimeCalculationMode;
  date: Date;
}

export interface TimesheetEntryInput {
  id: string;
  date: Date;
  hours: number;
  timesheetId: string;
}

/**
 * Pure overtime calculation function (no database dependencies)
 * 
 * Implements NZ Employment Relations Act 2000 compliant overtime calculation
 * with detailed audit trail and breakdown for record-keeping requirements.
 * 
 * **Compliance Features:**
 * - Accurate separation of regular and overtime hours
 * - Public holiday detection and premium rates (Holidays Act 2003)
 * - Detailed breakdown for 6-year audit retention
 * - Performance logging for compliance monitoring
 * 
 * **Calculation Logic:**
 * 1. Determine applicable multiplier (public holiday > Sunday > base)
 * 2. Calculate overtime based on mode (DAILY, WEEKLY, MONTHLY, PATTERN_BASED)
 * 3. Apply tier 2 multiplier if applicable
 * 4. Generate detailed breakdown for audit trail
 * 
 * @param input - Pure calculation input (no database dependencies)
 * @returns Detailed result with breakdown and compliance metadata
 * 
 * @example
 * ```typescript
 * const result = calculatePureOvertime({
 *   hoursWorked: 10,
 *   dailyThreshold: 8,
 *   isPublicHoliday: false,
 *   isSunday: false,
 *   baseMultiplier: 1.5,
 *   publicHolidayMultiplier: 2.0,
 *   mode: 'DAILY',
 *   date: new Date('2024-06-04')
 * });
 * // Result: { regularHours: 8, overtimeHours: 2, multiplier: 1.5, ... }
 * ```
 * 
 * @performance Target: <10ms per calculation
 * @compliance NZ Employment Relations Act 2000, Holidays Act 2003
 */
export function calculatePureOvertime(input: PureOvertimeInput): DetailedOvertimeResult {
  const startTime = performance.now();
  
  // Step 1: Determine applicable multiplier based on day type
  let appliedMultiplier = input.baseMultiplier;
  let dayType: 'regular' | 'public_holiday' | 'sunday_premium' = 'regular';
  let specialDayNote = '';
  
  if (input.isPublicHoliday) {
    appliedMultiplier = input.publicHolidayMultiplier;
    dayType = 'public_holiday';
    specialDayNote = ' (Public Holiday)';
  } else if (input.isSunday && input.sundayMultiplier) {
    appliedMultiplier = input.sundayMultiplier;
    dayType = 'sunday_premium';
    specialDayNote = ' (Sunday Premium)';
  }
  
  // Step 2: Calculate overtime based on mode
  let regularHours = 0;
  let overtimeHours = 0;
  let reason = '';
  let overtimeType: 'regular' | 'overtime' = 'regular';
  
  switch (input.mode) {
    case 'DAILY':
      if (input.hoursWorked <= input.dailyThreshold) {
        regularHours = input.hoursWorked;
        overtimeHours = 0;
        reason = input.hoursWorked === 0 
          ? 'No hours worked' 
          : `Within daily threshold (${input.dailyThreshold}h)${specialDayNote}`;
      } else {
        regularHours = input.dailyThreshold;
        overtimeHours = input.hoursWorked - input.dailyThreshold;
        overtimeType = 'overtime';
        reason = `Exceeded daily threshold (${input.dailyThreshold}h)${specialDayNote}`;
      }
      break;
      
    case 'WEEKLY':
      if (!input.weekTotalHours || !input.weeklyThreshold) {
        // Fallback to daily if weekly data not provided
        return calculatePureOvertime({ ...input, mode: 'DAILY' });
      }
      
      if (input.weekTotalHours <= input.weeklyThreshold) {
        regularHours = input.hoursWorked;
        overtimeHours = 0;
        reason = `Week total (${input.weekTotalHours.toFixed(1)}h) within threshold (${input.weeklyThreshold}h)${specialDayNote}`;
      } else {
        const weekOvertimeHours = input.weekTotalHours - input.weeklyThreshold;
        const entryProportion = input.hoursWorked / input.weekTotalHours;
        overtimeHours = weekOvertimeHours * entryProportion;
        regularHours = input.hoursWorked - overtimeHours;
        overtimeType = 'overtime';
        reason = `Week total (${input.weekTotalHours.toFixed(1)}h) exceeded threshold (${input.weeklyThreshold}h)${specialDayNote}`;
      }
      break;
      
    case 'MONTHLY':
      if (!input.monthTotalHours || !input.monthlyThreshold) {
        // Fallback to daily if monthly data not provided
        return calculatePureOvertime({ ...input, mode: 'DAILY' });
      }
      
      if (input.monthTotalHours <= input.monthlyThreshold) {
        regularHours = input.hoursWorked;
        overtimeHours = 0;
        reason = `Month total (${input.monthTotalHours.toFixed(1)}h) within threshold (${input.monthlyThreshold}h)${specialDayNote}`;
      } else {
        const monthOvertimeHours = input.monthTotalHours - input.monthlyThreshold;
        const entryProportion = input.hoursWorked / input.monthTotalHours;
        overtimeHours = monthOvertimeHours * entryProportion;
        regularHours = input.hoursWorked - overtimeHours;
        overtimeType = 'overtime';
        reason = `Month total (${input.monthTotalHours.toFixed(1)}h) exceeded threshold (${input.monthlyThreshold}h)${specialDayNote}`;
      }
      break;
      
    case 'PATTERN_BASED':
      // For pattern-based, we use daily threshold from pattern
      // This is handled the same as DAILY mode
      if (input.hoursWorked <= input.dailyThreshold) {
        regularHours = input.hoursWorked;
        overtimeHours = 0;
        reason = `Within pattern threshold (${input.dailyThreshold}h)${specialDayNote}`;
      } else {
        regularHours = input.dailyThreshold;
        overtimeHours = input.hoursWorked - input.dailyThreshold;
        overtimeType = 'overtime';
        reason = `Exceeded pattern threshold (${input.dailyThreshold}h)${specialDayNote}`;
      }
      break;
  }
  
  // Step 3: Apply tier 2 multiplier if applicable
  // If no overtime, multiplier should be 1.0 (unless it's a special day like public holiday)
  let finalMultiplier = overtimeHours > 0 ? appliedMultiplier : 1.0;
  
  // For public holidays or Sunday premium, all hours get the premium rate
  if (input.isPublicHoliday || (input.isSunday && input.sundayMultiplier)) {
    finalMultiplier = appliedMultiplier;
  }
  
  // Apply tier 2 if overtime exceeds threshold
  if (input.tier2Multiplier && input.tier2Threshold && overtimeHours > input.tier2Threshold) {
    finalMultiplier = input.tier2Multiplier;
    reason += ` [Tier 2: ${overtimeHours.toFixed(1)}h > ${input.tier2Threshold}h]`;
  }
  
  // Step 4: Build detailed breakdown for audit trail
  const breakdown: OvertimeBreakdownItem[] = [];
  
  if (regularHours > 0) {
    breakdown.push({
      type: dayType,
      hours: regularHours,
      multiplier: input.isPublicHoliday || (input.isSunday && input.sundayMultiplier) 
        ? appliedMultiplier 
        : 1.0,
      description: input.isPublicHoliday 
        ? `Regular hours on public holiday`
        : input.isSunday && input.sundayMultiplier
        ? `Regular hours with Sunday premium`
        : `Regular hours`,
    });
  }
  
  if (overtimeHours > 0) {
    breakdown.push({
      type: 'overtime',
      hours: overtimeHours,
      multiplier: finalMultiplier,
      description: `Overtime hours at ${finalMultiplier}x${specialDayNote}`,
    });
  }
  
  // Performance logging for compliance monitoring
  const duration = performance.now() - startTime;
  if (duration > 10) {
    console.warn(`[overtime-calculator] Slow calculation: ${duration.toFixed(2)}ms for ${format(input.date, 'yyyy-MM-dd')}`);
  }
  
  // Audit logging
  console.debug(
    `[overtime-calculator] ${format(input.date, 'yyyy-MM-dd')}: ` +
    `${input.hoursWorked}h worked → ${regularHours.toFixed(2)}h regular + ${overtimeHours.toFixed(2)}h OT @ ${finalMultiplier}x ` +
    `(${input.mode} mode, ${duration.toFixed(2)}ms)`
  );
  
  return {
    regularHours,
    overtimeHours,
    overtimeMultiplier: finalMultiplier,
    isPublicHoliday: input.isPublicHoliday,
    reason,
    breakdown,
    calculationTimestamp: new Date(),
    calculationMode: input.mode,
  };
}

/**
 * Get employee's working pattern for a specific date
 * Handles multi-week patterns by calculating week in cycle
 */
async function getEmployeeWorkingPattern(employeeId: string, date: Date) {
  const db = getPrisma();
  if (!db) return null;
  
  // Find the active working pattern assignment for this date
  const assignment = await db.employeeWorkingPatternAssignment.findFirst({
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
  const db = getPrisma();
  if (!db) return [];
  
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  const entries = await db.timesheetEntry.findMany({
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
  const db = getPrisma();
  if (!db) return [];
  
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  const entries = await db.timesheetEntry.findMany({
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
