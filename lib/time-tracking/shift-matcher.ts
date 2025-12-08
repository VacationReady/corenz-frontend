/**
 * Shift Matcher - Reconciliation Engine
 * 
 * Correlates scheduled shifts with actual worked time (clock entries/timesheets)
 * for payroll verification and variance tracking.
 * 
 * @version 1.0
 * @date 2024-12-05
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { startOfDay, endOfDay, differenceInMinutes, isSameDay, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// ============================================
// TYPES & INTERFACES
// ============================================

export type VarianceType = 
  | 'ON_TIME'
  | 'EARLY_START'
  | 'LATE_START'
  | 'EARLY_END'
  | 'LATE_END'
  | 'OVERTIME'
  | 'UNDERTIME'
  | 'NO_SHOW'
  | 'UNSCHEDULED';

export type ReconciliationStatus = 
  | 'PENDING'
  | 'AUTO_MATCHED'
  | 'MANUALLY_MATCHED'
  | 'APPROVED'
  | 'ADJUSTED'
  | 'FLAGGED';

export interface MatchResult {
  shiftId: string;
  clockEntryId?: string;
  timesheetEntryId?: string;
  confidence: number; // 0-1
  varianceMinutes: number;
  varianceType: VarianceType;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
}

export interface ShiftWithActuals {
  shift: {
    id: string;
    employeeId: string | null;
    startTime: Date;
    endTime: Date;
    breakDuration: number;
    role: string | null;
    attendanceStatus: string;
    isPublished: boolean;
    employee?: {
      id: string;
      User?: {
        name: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        profileImageUrl: string | null;
      } | null;
    } | null;
    department?: { id: string; name: string } | null;
    location?: { id: string; name: string } | null;
  };
  clockEntry?: {
    id: string;
    clockInTime: Date;
    clockOutTime: Date | null;
    matchConfidence: number | null;
  } | null;
  timesheetEntry?: {
    id: string;
    startTime: Date;
    endTime: Date;
    hours: number;
    reconciliationStatus: string;
    reconciliationNotes: string | null;
  } | null;
  variance: {
    minutes: number;
    type: VarianceType;
    startVarianceMinutes: number;
    endVarianceMinutes: number;
  };
  reconciliationStatus: ReconciliationStatus;
}

export interface ReconciliationStats {
  totalShifts: number;
  matchedShifts: number;
  pendingReconciliation: number;
  approvedCount: number;
  flaggedCount: number;
  noShowCount: number;
  averageVarianceMinutes: number;
  totalScheduledHours: number;
  totalActualHours: number;
}

export interface MatcherConfig {
  toleranceMinutes: number; // Default ±30 min window for matching
  autoMatchEnabled: boolean;
  minConfidenceThreshold: number; // Min confidence to auto-match (0-1)
}

const DEFAULT_CONFIG: MatcherConfig = {
  toleranceMinutes: 30,
  autoMatchEnabled: true,
  minConfidenceThreshold: 0.7,
};

// ============================================
// CORE MATCHING FUNCTIONS
// ============================================

/**
 * Calculate match confidence based on time proximity
 * Higher score = better match
 */
export function calculateMatchConfidence(
  shift: { startTime: Date; endTime: Date; employeeId: string | null },
  actual: { startTime: Date; endTime: Date | null; employeeId: string },
  toleranceMinutes: number = DEFAULT_CONFIG.toleranceMinutes
): number {
  // Must be same employee
  if (shift.employeeId !== actual.employeeId) {
    return 0;
  }

  const scheduledStart = new Date(shift.startTime);
  const scheduledEnd = new Date(shift.endTime);
  const actualStart = new Date(actual.startTime);
  const actualEnd = actual.endTime ? new Date(actual.endTime) : null;

  // Calculate start time variance
  const startDiff = Math.abs(differenceInMinutes(actualStart, scheduledStart));
  
  // Calculate end time variance (if clock out exists)
  let endDiff = 0;
  if (actualEnd) {
    endDiff = Math.abs(differenceInMinutes(actualEnd, scheduledEnd));
  }

  // Perfect match = 1.0
  // Outside tolerance = 0
  // Linear decay within tolerance
  const maxToleranceMinutes = toleranceMinutes * 2; // Allow up to 2x tolerance with reduced score
  
  if (startDiff > maxToleranceMinutes && endDiff > maxToleranceMinutes) {
    return 0;
  }

  const startScore = Math.max(0, 1 - (startDiff / maxToleranceMinutes));
  const endScore = actualEnd ? Math.max(0, 1 - (endDiff / maxToleranceMinutes)) : 0.5;

  // Weight start time more heavily (60%) since that's more important for matching
  const weightedScore = (startScore * 0.6) + (endScore * 0.4);

  return Math.round(weightedScore * 100) / 100;
}

/**
 * Calculate variance between scheduled and actual times
 */
export function calculateVariance(
  scheduledStart: Date,
  scheduledEnd: Date,
  actualStart: Date,
  actualEnd: Date | null
): { minutes: number; type: VarianceType; startVariance: number; endVariance: number } {
  const startVariance = differenceInMinutes(actualStart, scheduledStart);
  const endVariance = actualEnd ? differenceInMinutes(actualEnd, scheduledEnd) : 0;
  
  // Total variance in work time
  const scheduledMinutes = differenceInMinutes(scheduledEnd, scheduledStart);
  const actualMinutes = actualEnd ? differenceInMinutes(actualEnd, actualStart) : 0;
  const totalVariance = actualMinutes - scheduledMinutes;

  // Classify variance type
  let type: VarianceType = 'ON_TIME';
  
  const MINOR_THRESHOLD = 5; // minutes
  
  if (Math.abs(startVariance) <= MINOR_THRESHOLD && Math.abs(endVariance) <= MINOR_THRESHOLD) {
    type = 'ON_TIME';
  } else if (startVariance < -MINOR_THRESHOLD) {
    type = 'EARLY_START';
  } else if (startVariance > MINOR_THRESHOLD) {
    type = 'LATE_START';
  } else if (endVariance < -MINOR_THRESHOLD) {
    type = 'EARLY_END';
  } else if (endVariance > MINOR_THRESHOLD) {
    type = 'LATE_END';
  }
  
  // Override with overtime/undertime if significant
  if (totalVariance > 15) {
    type = 'OVERTIME';
  } else if (totalVariance < -15) {
    type = 'UNDERTIME';
  }

  return {
    minutes: totalVariance,
    type,
    startVariance,
    endVariance,
  };
}

/**
 * Classify variance for display
 */
export function classifyVariance(varianceMinutes: number): {
  severity: 'on_time' | 'minor' | 'significant';
  color: 'emerald' | 'amber' | 'rose';
  label: string;
} {
  const absVariance = Math.abs(varianceMinutes);
  
  if (absVariance <= 5) {
    return { severity: 'on_time', color: 'emerald', label: 'On Time' };
  } else if (absVariance <= 15) {
    return { severity: 'minor', color: 'amber', label: `${varianceMinutes > 0 ? '+' : ''}${varianceMinutes} min` };
  } else {
    return { severity: 'significant', color: 'rose', label: `${varianceMinutes > 0 ? '+' : ''}${varianceMinutes} min` };
  }
}

// ============================================
// AUTO-MATCHING FUNCTIONS
// ============================================

/**
 * Auto-match a clock entry to a shift
 * Returns the best matching shift or null if no good match found
 */
export async function autoMatchClockEntryToShift(
  clockEntry: {
    id: string;
    employeeId: string;
    companyId: string;
    clockInTime: Date;
    clockOutTime: Date | null;
  },
  config: MatcherConfig = DEFAULT_CONFIG
): Promise<MatchResult | null> {
  // Find shifts for this employee on the same day
  const clockInDate = startOfDay(clockEntry.clockInTime);
  const clockOutDate = endOfDay(clockEntry.clockOutTime || clockEntry.clockInTime);

  const candidateShifts = await prisma.shift.findMany({
    where: {
      companyId: clockEntry.companyId,
      employeeId: clockEntry.employeeId,
      isPublished: true,
      startTime: {
        gte: clockInDate,
        lte: clockOutDate,
      },
    },
    orderBy: { startTime: 'asc' },
  });

  if (candidateShifts.length === 0) {
    return null;
  }

  // Find best match
  let bestMatch: MatchResult | null = null;
  let bestConfidence = 0;

  for (const shift of candidateShifts) {
    const confidence = calculateMatchConfidence(
      { startTime: shift.startTime, endTime: shift.endTime, employeeId: shift.employeeId },
      { startTime: clockEntry.clockInTime, endTime: clockEntry.clockOutTime, employeeId: clockEntry.employeeId },
      config.toleranceMinutes
    );

    if (confidence > bestConfidence && confidence >= config.minConfidenceThreshold) {
      const variance = calculateVariance(
        shift.startTime,
        shift.endTime,
        clockEntry.clockInTime,
        clockEntry.clockOutTime
      );

      bestMatch = {
        shiftId: shift.id,
        clockEntryId: clockEntry.id,
        confidence,
        varianceMinutes: variance.minutes,
        varianceType: variance.type,
        scheduledStartTime: shift.startTime,
        scheduledEndTime: shift.endTime,
        actualStartTime: clockEntry.clockInTime,
        actualEndTime: clockEntry.clockOutTime || undefined,
      };
      bestConfidence = confidence;
    }
  }

  return bestMatch;
}

/**
 * Link a clock entry to a shift and update reconciliation fields
 */
export async function linkClockEntryToShift(
  clockEntryId: string,
  shiftId: string,
  matchedBy: 'AUTO' | 'MANUAL' | string,
  confidence: number = 1.0,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;

  await client.clockEntry.update({
    where: { id: clockEntryId },
    data: {
      shiftId,
      matchConfidence: confidence,
      matchedBy,
      matchedAt: new Date(),
    },
  });
}

/**
 * Link a timesheet entry to a shift with variance data
 */
export async function linkTimesheetEntryToShift(
  timesheetEntryId: string,
  shiftId: string,
  shift: { startTime: Date; endTime: Date },
  entry: { startTime: Date; endTime: Date },
  reconciledBy: string,
  status: ReconciliationStatus = 'AUTO_MATCHED',
  notes?: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;

  const variance = calculateVariance(shift.startTime, shift.endTime, entry.startTime, entry.endTime);

  await client.timesheetEntry.update({
    where: { id: timesheetEntryId },
    data: {
      shiftId,
      scheduledStartTime: shift.startTime,
      scheduledEndTime: shift.endTime,
      varianceMinutes: variance.minutes,
      varianceType: variance.type,
      reconciliationStatus: status,
      reconciliationNotes: notes,
      reconciledBy,
      reconciledAt: new Date(),
    },
  });
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Get all shifts with their actual time data for a specific day
 */
export async function getShiftsWithActualsForDay(
  companyId: string,
  date: Date,
  options?: {
    departmentId?: string;
    employeeId?: string;
    locationId?: string;
  }
): Promise<ShiftWithActuals[]> {
  const timeZone = 'Pacific/Auckland';
  const zonedDate = utcToZonedTime(date, timeZone);
  const zonedStart = startOfDay(zonedDate);
  const zonedEnd = endOfDay(zonedDate);
  const dayStart = zonedTimeToUtc(zonedStart, timeZone);
  const dayEnd = zonedTimeToUtc(zonedEnd, timeZone);

  // Build where clause
  const whereClause: Prisma.ShiftWhereInput = {
    companyId,
    startTime: {
      gte: dayStart,
      lte: dayEnd,
    },
    isPublished: true,
  };

  if (options?.departmentId) {
    whereClause.departmentId = options.departmentId;
  }
  if (options?.employeeId) {
    whereClause.employeeId = options.employeeId;
  }
  if (options?.locationId) {
    whereClause.locationId = options.locationId;
  }

  // Get shifts with relations
  const shifts = await prisma.shift.findMany({
    where: whereClause,
    include: {
      Employee: {
        include: {
          User: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true,
            },
          },
        },
      },
      ClockEntries: {
        orderBy: { clockInTime: 'asc' },
        take: 1,
      },
      TimesheetEntries: {
        where: {
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        take: 1,
      },
    },
    orderBy: { startTime: 'asc' },
  });

  // Also get unmatched clock entries for this day (no shiftId)
  const unmatchedClockEntries = await prisma.clockEntry.findMany({
    where: {
      companyId,
      shiftId: null,
      clockInTime: {
        gte: dayStart,
        lte: dayEnd,
      },
      ...(options?.employeeId ? { employeeId: options.employeeId } : {}),
    },
    include: {
      Employee: {
        include: {
          User: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true,
            },
          },
        },
      },
    },
  });

  // Build result
  const results: ShiftWithActuals[] = shifts.map((shift) => {
    const clockEntry = shift.ClockEntries[0] || null;
    const timesheetEntry = shift.TimesheetEntries[0] || null;

    // Calculate variance
    let variance = { minutes: 0, type: 'NO_SHOW' as VarianceType, startVarianceMinutes: 0, endVarianceMinutes: 0 };
    let reconciliationStatus: ReconciliationStatus = 'PENDING';

    if (clockEntry && clockEntry.clockOutTime) {
      const v = calculateVariance(
        shift.startTime,
        shift.endTime,
        clockEntry.clockInTime,
        clockEntry.clockOutTime
      );
      variance = {
        minutes: v.minutes,
        type: v.type,
        startVarianceMinutes: v.startVariance,
        endVarianceMinutes: v.endVariance,
      };
    } else if (timesheetEntry) {
      const v = calculateVariance(
        shift.startTime,
        shift.endTime,
        timesheetEntry.startTime,
        timesheetEntry.endTime
      );
      variance = {
        minutes: v.minutes,
        type: v.type,
        startVarianceMinutes: v.startVariance,
        endVarianceMinutes: v.endVariance,
      };
      reconciliationStatus = (timesheetEntry.reconciliationStatus as ReconciliationStatus) || 'PENDING';
    } else if (!clockEntry && !timesheetEntry) {
      // Check if shift is in the past
      if (shift.endTime < new Date()) {
        variance.type = 'NO_SHOW';
      }
    }

    return {
      shift: {
        id: shift.id,
        employeeId: shift.employeeId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakDuration: shift.breakDuration,
        role: shift.role,
        attendanceStatus: shift.attendanceStatus,
        isPublished: shift.isPublished,
        employee: shift.Employee ? {
          id: shift.Employee.id,
          User: shift.Employee.User,
        } : null,
        department: null, // TODO: Include department if needed
        location: null, // TODO: Include location if needed
      },
      clockEntry: clockEntry ? {
        id: clockEntry.id,
        clockInTime: clockEntry.clockInTime,
        clockOutTime: clockEntry.clockOutTime,
        matchConfidence: clockEntry.matchConfidence,
      } : null,
      timesheetEntry: timesheetEntry ? {
        id: timesheetEntry.id,
        startTime: timesheetEntry.startTime,
        endTime: timesheetEntry.endTime,
        hours: parseFloat(timesheetEntry.hours.toString()),
        reconciliationStatus: timesheetEntry.reconciliationStatus,
        reconciliationNotes: timesheetEntry.reconciliationNotes,
      } : null,
      variance,
      reconciliationStatus,
    };
  });

  return results;
}

/**
 * Get reconciliation statistics for a date range
 */
export async function getReconciliationStats(
  companyId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    departmentId?: string;
    employeeId?: string;
  }
): Promise<ReconciliationStats> {
  const whereClause: Prisma.ShiftWhereInput = {
    companyId,
    isPublished: true,
    startTime: {
      gte: startOfDay(startDate),
      lte: endOfDay(endDate),
    },
  };

  if (options?.departmentId) {
    whereClause.departmentId = options.departmentId;
  }
  if (options?.employeeId) {
    whereClause.employeeId = options.employeeId;
  }

  const shifts = await prisma.shift.findMany({
    where: whereClause,
    include: {
      ClockEntries: true,
      TimesheetEntries: true,
    },
  });

  let matchedShifts = 0;
  let pendingReconciliation = 0;
  let approvedCount = 0;
  let flaggedCount = 0;
  let noShowCount = 0;
  let totalVarianceMinutes = 0;
  let varianceCount = 0;
  let totalScheduledMinutes = 0;
  let totalActualMinutes = 0;

  for (const shift of shifts) {
    const scheduledMinutes = differenceInMinutes(shift.endTime, shift.startTime);
    totalScheduledMinutes += scheduledMinutes;

    const hasClockEntry = shift.ClockEntries.length > 0;
    const hasTimesheetEntry = shift.TimesheetEntries.length > 0;

    if (hasClockEntry || hasTimesheetEntry) {
      matchedShifts++;

      // Get actual hours from either source
      if (hasClockEntry) {
        const entry = shift.ClockEntries[0];
        if (entry.clockOutTime) {
          const actualMinutes = differenceInMinutes(entry.clockOutTime, entry.clockInTime);
          totalActualMinutes += actualMinutes;
          totalVarianceMinutes += Math.abs(actualMinutes - scheduledMinutes);
          varianceCount++;
        }
      } else if (hasTimesheetEntry) {
        const entry = shift.TimesheetEntries[0];
        const actualMinutes = differenceInMinutes(entry.endTime, entry.startTime);
        totalActualMinutes += actualMinutes;
        totalVarianceMinutes += Math.abs(actualMinutes - scheduledMinutes);
        varianceCount++;

        // Count by status
        switch (entry.reconciliationStatus) {
          case 'PENDING':
            pendingReconciliation++;
            break;
          case 'APPROVED':
            approvedCount++;
            break;
          case 'FLAGGED':
            flaggedCount++;
            break;
        }
      }
    } else if (shift.endTime < new Date()) {
      noShowCount++;
    } else {
      pendingReconciliation++;
    }
  }

  return {
    totalShifts: shifts.length,
    matchedShifts,
    pendingReconciliation,
    approvedCount,
    flaggedCount,
    noShowCount,
    averageVarianceMinutes: varianceCount > 0 ? Math.round(totalVarianceMinutes / varianceCount) : 0,
    totalScheduledHours: Math.round((totalScheduledMinutes / 60) * 100) / 100,
    totalActualHours: Math.round((totalActualMinutes / 60) * 100) / 100,
  };
}

/**
 * Bulk approve entries with minimal variance
 */
export async function bulkApproveEntries(
  entryIds: string[],
  approvedBy: string,
  maxVarianceMinutes: number = 15
): Promise<{ approved: number; skipped: number }> {
  let approved = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const entryId of entryIds) {
      const entry = await tx.timesheetEntry.findUnique({
        where: { id: entryId },
        select: {
          varianceMinutes: true,
          reconciliationStatus: true,
        },
      });

      if (!entry) {
        skipped++;
        continue;
      }

      // Only approve if within threshold and pending
      const variance = entry.varianceMinutes || 0;
      if (
        Math.abs(variance) <= maxVarianceMinutes &&
        (entry.reconciliationStatus === 'PENDING' || entry.reconciliationStatus === 'AUTO_MATCHED')
      ) {
        await tx.timesheetEntry.update({
          where: { id: entryId },
          data: {
            reconciliationStatus: 'APPROVED',
            reconciledBy: approvedBy,
            reconciledAt: new Date(),
          },
        });
        approved++;
      } else {
        skipped++;
      }
    }
  });

  return { approved, skipped };
}

/**
 * Flag an entry for review
 */
export async function flagEntryForReview(
  entryId: string,
  flaggedBy: string,
  notes: string
): Promise<void> {
  await prisma.timesheetEntry.update({
    where: { id: entryId },
    data: {
      reconciliationStatus: 'FLAGGED',
      reconciliationNotes: notes,
      reconciledBy: flaggedBy,
      reconciledAt: new Date(),
    },
  });
}

/**
 * Adjust timesheet entry to match scheduled shift time
 */
export async function adjustToScheduled(
  entryId: string,
  adjustedBy: string,
  notes?: string
): Promise<void> {
  const entry = await prisma.timesheetEntry.findUnique({
    where: { id: entryId },
    select: {
      scheduledStartTime: true,
      scheduledEndTime: true,
      breakMinutes: true,
    },
  });

  if (!entry || !entry.scheduledStartTime || !entry.scheduledEndTime) {
    throw new Error('Entry not linked to a shift');
  }

  const hours = differenceInMinutes(entry.scheduledEndTime, entry.scheduledStartTime) / 60 - (entry.breakMinutes / 60);

  await prisma.timesheetEntry.update({
    where: { id: entryId },
    data: {
      startTime: entry.scheduledStartTime,
      endTime: entry.scheduledEndTime,
      hours,
      varianceMinutes: 0,
      varianceType: 'ON_TIME',
      reconciliationStatus: 'ADJUSTED',
      reconciliationNotes: notes || 'Adjusted to scheduled time',
      reconciledBy: adjustedBy,
      reconciledAt: new Date(),
      managerAdjusted: true,
      managerAdjustedBy: adjustedBy,
      managerAdjustedAt: new Date(),
      managerAdjustmentNote: notes || 'Adjusted to scheduled time',
    },
  });
}

/**
 * Manually match a clock entry or timesheet entry to a shift
 */
export async function manuallyMatchToShift(
  entryType: 'clock' | 'timesheet',
  entryId: string,
  shiftId: string,
  matchedBy: string
): Promise<void> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { startTime: true, endTime: true },
  });

  if (!shift) {
    throw new Error('Shift not found');
  }

  if (entryType === 'clock') {
    await linkClockEntryToShift(entryId, shiftId, matchedBy, 1.0);
  } else {
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
      select: { startTime: true, endTime: true },
    });

    if (!entry) {
      throw new Error('Timesheet entry not found');
    }

    await linkTimesheetEntryToShift(
      entryId,
      shiftId,
      shift,
      entry,
      matchedBy,
      'MANUALLY_MATCHED'
    );
  }
}

/**
 * Remove match from an entry
 */
export async function unmatchEntry(
  entryType: 'clock' | 'timesheet',
  entryId: string
): Promise<void> {
  if (entryType === 'clock') {
    await prisma.clockEntry.update({
      where: { id: entryId },
      data: {
        shiftId: null,
        matchConfidence: null,
        matchedBy: null,
        matchedAt: null,
      },
    });
  } else {
    await prisma.timesheetEntry.update({
      where: { id: entryId },
      data: {
        shiftId: null,
        scheduledStartTime: null,
        scheduledEndTime: null,
        varianceMinutes: null,
        varianceType: null,
        reconciliationStatus: 'PENDING',
        reconciliationNotes: null,
        reconciledBy: null,
        reconciledAt: null,
      },
    });
  }
}

