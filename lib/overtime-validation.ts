/**
 * Overtime Entry Validation
 * 
 * Validates manual overtime entries to ensure they don't overlap
 * with regular working hours as defined in employee working patterns
 * 
 * NZ Employment Relations Act 2000 Compliance:
 * - Ensures clear separation between regular and overtime hours
 * - Prevents incorrect overtime classification
 * - Provides clear error messages for employees
 */

import { format, parse, isWithinInterval } from 'date-fns';
import type { PrismaClient } from '@prisma/client';

// Lazy-load Prisma to prevent test environment database connection errors
let prisma: PrismaClient | null = null;
function getPrisma(): PrismaClient | null {
  if (!prisma && process.env.NODE_ENV !== 'test') {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface OvertimeValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: string[];
  workingHours?: { start: string; end: string };
}

/**
 * Parse time string (HH:mm) to Date on a specific date
 */
function parseTimeOnDate(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(range1: TimeRange, range2: TimeRange): boolean {
  return (
    isWithinInterval(range1.start, { start: range2.start, end: range2.end }) ||
    isWithinInterval(range1.end, { start: range2.start, end: range2.end }) ||
    isWithinInterval(range2.start, { start: range1.start, end: range1.end }) ||
    isWithinInterval(range2.end, { start: range1.start, end: range1.end })
  );
}

/**
 * Get employee's working hours for a specific date from their pattern
 */
async function getWorkingHoursForDate(
  employeeId: string,
  date: Date
): Promise<{ start: string; end: string } | null> {
  const db = getPrisma();
  if (!db) return null;
  
  // Find active working pattern assignment
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

  // Calculate which week in multi-week pattern
  const diffInDays = Math.floor((date.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24));
  const weekIndex = Math.floor(diffInDays / 7) % weekCount;
  const applicableWeek = weeks[weekIndex];

  // Find day in pattern
  const dayName = format(date, 'EEEE').toUpperCase(); // MONDAY, TUESDAY, etc.
  const dayPattern = applicableWeek.WorkingPatternDay.find((d) => d.day === dayName);

  if (!dayPattern) {
    return null;
  }

  // Check if this is a non-working day
  if (dayPattern.type !== 'FULL_DAY' || !dayPattern.startTime || !dayPattern.endTime) {
    return null;
  }

  return {
    start: dayPattern.startTime,
    end: dayPattern.endTime,
  };
}

/**
 * Validate manual overtime entry
 * 
 * Checks:
 * 1. Entry doesn't overlap with regular working hours (if blockOvertimeDuringHours=true)
 * 2. Employee has working pattern set up
 * 3. Provides clear error messages
 */
export async function validateManualOvertimeEntry(
  employeeId: string,
  companyId: string,
  date: Date,
  startTime: Date,
  endTime: Date,
  isOvertime: boolean
): Promise<OvertimeValidationResult> {
  // If not marked as overtime, no validation needed
  if (!isOvertime) {
    return { isValid: true, errors: [] };
  }

  const db = getPrisma();
  if (!db) {
    return {
      isValid: false,
      errors: [{ field: 'database', message: 'Database connection unavailable', code: 'DB_UNAVAILABLE' }]
    };
  }
  
  // Get company settings
  const settings = await db.timeTrackingSettings.findUnique({
    where: { companyId },
  });

  if (!settings) {
    return {
      isValid: false,
      errors: [
        {
          field: 'settings',
          message: 'Time tracking settings not found. Please contact your administrator.',
          code: 'SETTINGS_NOT_FOUND',
        },
      ],
    };
  }

  // Check if manual overtime is allowed
  if (!settings.allowManualOvertimeEntry) {
    return {
      isValid: false,
      errors: [
        {
          field: 'isOvertime',
          message: 'Manual overtime entry is not enabled for your company.',
          code: 'MANUAL_OVERTIME_DISABLED',
        },
      ],
    };
  }

  // If blocking during hours is disabled, allow any overtime entry
  if (!settings.blockOvertimeDuringHours) {
    return {
      isValid: true,
      errors: [],
      warnings: ['Overtime entry allowed without working hours validation'],
    };
  }

  // Get employee's working hours for this date
  const workingHours = await getWorkingHoursForDate(employeeId, date);

  if (!workingHours) {
    // No working pattern found - warn but allow
    return {
      isValid: true,
      errors: [],
      warnings: [
        'No working pattern found for this date. Please ensure your working hours are set up correctly.',
      ],
    };
  }

  // Parse working hours
  const workingStart = parseTimeOnDate(workingHours.start, date);
  const workingEnd = parseTimeOnDate(workingHours.end, date);

  // Check for overlap
  const entryRange: TimeRange = { start: startTime, end: endTime };
  const workingRange: TimeRange = { start: workingStart, end: workingEnd };

  if (timeRangesOverlap(entryRange, workingRange)) {
    return {
      isValid: false,
      errors: [
        {
          field: 'time',
          message: `Overtime entry cannot overlap with regular working hours (${workingHours.start} - ${workingHours.end}). Your entry is ${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}.`,
          code: 'OVERTIME_OVERLAP_WORKING_HOURS',
        },
      ],
      workingHours,
    };
  }

  // Valid overtime entry
  return {
    isValid: true,
    errors: [],
    workingHours,
  };
}

/**
 * Validate overtime amendment by manager
 */
export interface OvertimeAmendment {
  regularHours: number;
  overtimeHours: number;
  multiplier: number;
  reason: string;
}

export function validateOvertimeAmendment(
  totalHours: number,
  amendment: OvertimeAmendment
): OvertimeValidationResult {
  const errors: ValidationError[] = [];

  // Check hours sum to total
  const sum = amendment.regularHours + amendment.overtimeHours;
  if (Math.abs(sum - totalHours) > 0.01) {
    errors.push({
      field: 'hours',
      message: `Regular hours (${amendment.regularHours}) + Overtime hours (${amendment.overtimeHours}) must equal total hours (${totalHours})`,
      code: 'HOURS_MISMATCH',
    });
  }

  // Check hours are non-negative
  if (amendment.regularHours < 0) {
    errors.push({
      field: 'regularHours',
      message: 'Regular hours cannot be negative',
      code: 'NEGATIVE_REGULAR_HOURS',
    });
  }

  if (amendment.overtimeHours < 0) {
    errors.push({
      field: 'overtimeHours',
      message: 'Overtime hours cannot be negative',
      code: 'NEGATIVE_OVERTIME_HOURS',
    });
  }

  // Check multiplier is valid
  if (amendment.multiplier < 1.0) {
    errors.push({
      field: 'multiplier',
      message: 'Overtime multiplier must be at least 1.0x',
      code: 'INVALID_MULTIPLIER',
    });
  }

  // Check reason is provided and sufficient
  if (!amendment.reason || amendment.reason.trim().length < 10) {
    errors.push({
      field: 'reason',
      message: 'Reason for amendment must be at least 10 characters',
      code: 'INSUFFICIENT_REASON',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if user has permission to amend overtime
 * ✅ SECURITY FIX: Now validates company ownership
 */
export async function canAmendOvertime(
  userId: string,
  employeeId: string
): Promise<boolean> {
  const db = getPrisma();
  if (!db) return false;
  
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      Employee: {
        select: {
          companyId: true,
          departmentId: true,
        },
      },
    },
  });

  if (!user || !user.Employee) {
    return false;
  }

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { 
      companyId: true,
      departmentId: true 
    },
  });

  if (!employee) {
    return false;
  }

  // ✅ SECURITY: Verify same company first
  if (user.Employee.companyId !== employee.companyId) {
    return false;
  }

  // Admins can amend within their company
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Managers can amend for their department within their company
  if (user.role === 'MANAGER') {
    if (user.Employee.departmentId === employee.departmentId) {
      return true;
    }
  }

  return false;
}

/**
 * Get validation error messages for display
 */
export function getValidationErrorMessages(result: OvertimeValidationResult): string[] {
  return result.errors.map((error) => error.message);
}

/**
 * Format working hours for display
 */
export function formatWorkingHours(workingHours: { start: string; end: string }): string {
  return `${workingHours.start} - ${workingHours.end}`;
}
