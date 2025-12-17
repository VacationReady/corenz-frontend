/**
 * Backfill script to create TimeSheet entries from historical ClockEntry records
 * 
 * This script addresses the scenario where employees clocked in/out but no
 * TimesheetEntry was created (before auto-generation was implemented).
 * 
 * What it does:
 * 1. Finds all ClockEntry records with status COMPLETED that don't have a timesheetId
 * 2. Creates a Timesheet for the appropriate period (if not exists)
 * 3. Creates a TimesheetEntry from the clock data with proper overtime calculations
 * 4. Links the ClockEntry to the Timesheet
 * 5. Auto-matches to shifts where applicable
 * 
 * Safety Features:
 * - IDEMPOTENT: Only processes clock entries without timesheetId
 * - NON-DESTRUCTIVE: Only creates new records, never deletes
 * - BATCHED: Processes in batches to avoid memory issues
 * - DRY-RUN: Set DRY_RUN=true to preview changes without applying
 * 
 * Usage:
 *   npx ts-node scripts/backfill-clock-entries-to-timesheets.ts
 *   
 * Dry run (preview only):
 *   DRY_RUN=true npx ts-node scripts/backfill-clock-entries-to-timesheets.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { startOfDay, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns';

const prisma = new PrismaClient();

// Configuration
const BATCH_SIZE = 100;
const DRY_RUN = process.env.DRY_RUN === 'true';

interface OvertimeSettings {
  overtimeCalculationMode: string;
  autoApplyOvertime: boolean;
  dailyOvertimeThreshold: number;
  weeklyOvertimeThreshold: number;
  overtimeMultiplier: number;
  publicHolidayMultiplier: number;
}

async function getOvertimeSettings(companyId: string): Promise<OvertimeSettings> {
  const settings = await prisma.timeTrackingSettings.findUnique({
    where: { companyId },
  });

  return {
    overtimeCalculationMode: (settings?.overtimeCalculationMode as string) || 'DAILY',
    autoApplyOvertime: settings?.autoApplyOvertime ?? false,
    dailyOvertimeThreshold: settings?.dailyOvertimeThreshold 
      ? parseFloat(settings.dailyOvertimeThreshold.toString()) 
      : 8,
    weeklyOvertimeThreshold: settings?.weeklyOvertimeThreshold 
      ? parseFloat(settings.weeklyOvertimeThreshold.toString()) 
      : 40,
    overtimeMultiplier: settings?.overtimeMultiplier 
      ? parseFloat(settings.overtimeMultiplier.toString()) 
      : 1.5,
    publicHolidayMultiplier: settings?.publicHolidayMultiplier 
      ? parseFloat(settings.publicHolidayMultiplier.toString()) 
      : 2.0,
  };
}

async function findOrCreateTimesheet(
  employeeId: string,
  companyId: string,
  date: Date
): Promise<string> {
  // Get time tracking settings for period configuration
  const settings = await prisma.timeTrackingSettings.findUnique({
    where: { companyId },
  });

  const timesheetPeriod = settings?.timesheetPeriod || 'WEEKLY';
  
  // Calculate period bounds
  let periodStart: Date;
  let periodEnd: Date;

  if (timesheetPeriod === 'WEEKLY') {
    periodStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    periodEnd = endOfWeek(date, { weekStartsOn: 1 });
  } else if (timesheetPeriod === 'BIWEEKLY') {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    periodStart = weekStart;
    periodEnd = new Date(weekStart);
    periodEnd.setDate(periodEnd.getDate() + 13);
  } else {
    // MONTHLY
    periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
    periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  // Find existing timesheet
  let timesheet = await prisma.timesheet.findFirst({
    where: {
      employeeId,
      periodStart,
      periodEnd,
    },
  });

  // Create if doesn't exist
  if (!timesheet) {
    if (DRY_RUN) {
      return `DRY_RUN_TIMESHEET_${employeeId}_${periodStart.toISOString()}`;
    }
    timesheet = await prisma.timesheet.create({
      data: {
        employeeId,
        companyId,
        periodStart,
        periodEnd,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        breakHours: 0,
        approvalStatus: 'PENDING',
      },
    });
  }

  return timesheet.id;
}

async function autoMatchToShift(
  clockEntry: {
    id: string;
    employeeId: string;
    companyId: string;
    clockInTime: Date;
    clockOutTime: Date;
  }
): Promise<{ shiftId: string; startTime: Date; endTime: Date; breakDuration: number; varianceMinutes: number } | null> {
  // Find shifts for this employee on the same day
  const clockInDate = startOfDay(clockEntry.clockInTime);
  const clockOutDate = new Date(clockInDate);
  clockOutDate.setHours(23, 59, 59, 999);

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

  // Find best match based on time proximity
  let bestMatch: typeof candidateShifts[0] | null = null;
  let bestScore = 0;

  for (const shift of candidateShifts) {
    const startDiff = Math.abs(differenceInMinutes(clockEntry.clockInTime, shift.startTime));
    const endDiff = Math.abs(differenceInMinutes(clockEntry.clockOutTime, shift.endTime));
    
    // Calculate score (lower difference = higher score)
    const maxTolerance = 60; // 60 minutes
    const startScore = Math.max(0, 1 - (startDiff / maxTolerance));
    const endScore = Math.max(0, 1 - (endDiff / maxTolerance));
    const score = (startScore * 0.6) + (endScore * 0.4);

    if (score > bestScore && score >= 0.5) { // At least 50% confidence
      bestMatch = shift;
      bestScore = score;
    }
  }

  if (!bestMatch) {
    return null;
  }

  // Calculate variance
  const scheduledMinutes = differenceInMinutes(bestMatch.endTime, bestMatch.startTime);
  const actualMinutes = differenceInMinutes(clockEntry.clockOutTime, clockEntry.clockInTime);
  const varianceMinutes = actualMinutes - scheduledMinutes;

  return {
    shiftId: bestMatch.id,
    startTime: bestMatch.startTime,
    endTime: bestMatch.endTime,
    breakDuration: bestMatch.breakDuration,
    varianceMinutes,
  };
}

async function processClockEntry(
  clockEntry: {
    id: string;
    employeeId: string;
    companyId: string;
    clockInTime: Date;
    clockOutTime: Date;
    notes: string | null;
  }
): Promise<{ success: boolean; timesheetId?: string; entryId?: string; error?: string }> {
  try {
    // Get overtime settings
    const overtimeSettings = await getOvertimeSettings(clockEntry.companyId);

    // Try to match to a shift
    const shiftMatch = await autoMatchToShift({
      id: clockEntry.id,
      employeeId: clockEntry.employeeId,
      companyId: clockEntry.companyId,
      clockInTime: clockEntry.clockInTime,
      clockOutTime: clockEntry.clockOutTime,
    });

    // Get break duration from shift or use 0
    const breakMinutes = shiftMatch?.breakDuration || 0;

    // Calculate hours
    const totalMinutes = differenceInMinutes(clockEntry.clockOutTime, clockEntry.clockInTime);
    const workMinutes = totalMinutes - breakMinutes;
    const hours = Math.max(0, workMinutes / 60);

    // Simple overtime calculation (daily threshold)
    let regularHours = hours;
    let overtimeHours = 0;
    let overtimeType: string | null = null;
    let overtimeMultiplier: number | null = null;

    if (overtimeSettings.autoApplyOvertime && hours > overtimeSettings.dailyOvertimeThreshold) {
      regularHours = overtimeSettings.dailyOvertimeThreshold;
      overtimeHours = hours - overtimeSettings.dailyOvertimeThreshold;
      overtimeType = 'AUTO_DAILY';
      overtimeMultiplier = overtimeSettings.overtimeMultiplier;
    }

    // Find or create timesheet
    const timesheetId = await findOrCreateTimesheet(
      clockEntry.employeeId,
      clockEntry.companyId,
      clockEntry.clockInTime
    );

    if (DRY_RUN) {
      return { 
        success: true, 
        timesheetId: timesheetId,
        entryId: `DRY_RUN_ENTRY_${clockEntry.id}`,
      };
    }

    // Create timesheet entry in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Build entry data
      const entryData: any = {
        timesheetId,
        date: startOfDay(clockEntry.clockInTime),
        startTime: clockEntry.clockInTime,
        endTime: clockEntry.clockOutTime,
        breakMinutes,
        hours,
        regularHours,
        overtimeHours,
        overtimeType,
        overtimeMultiplier,
        isOvertime: overtimeHours > 0,
        notes: clockEntry.notes,
        entryType: 'CLOCK',
        reconciliationStatus: shiftMatch ? 'AUTO_MATCHED' : 'PENDING',
      };

      // Add shift linking if matched
      if (shiftMatch) {
        entryData.shiftId = shiftMatch.shiftId;
        entryData.scheduledStartTime = shiftMatch.startTime;
        entryData.scheduledEndTime = shiftMatch.endTime;
        entryData.varianceMinutes = shiftMatch.varianceMinutes;
      }

      // Create entry
      const entry = await tx.timesheetEntry.create({
        data: entryData,
      });

      // Link clock entry to timesheet
      await tx.clockEntry.update({
        where: { id: clockEntry.id },
        data: { timesheetId },
      });

      // Link clock entry to shift if matched
      if (shiftMatch) {
        await tx.clockEntry.update({
          where: { id: clockEntry.id },
          data: {
            shiftId: shiftMatch.shiftId,
            matchConfidence: 0.8, // Backfill match
            matchedBy: 'BACKFILL',
            matchedAt: new Date(),
          },
        });
      }

      // Recalculate timesheet totals
      const entries = await tx.timesheetEntry.findMany({
        where: { timesheetId },
        select: {
          hours: true,
          regularHours: true,
          overtimeHours: true,
          breakMinutes: true,
        },
      });

      const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours.toString()), 0);
      const totalRegularHours = entries.reduce((sum, e) => sum + parseFloat((e.regularHours || e.hours).toString()), 0);
      const totalOvertimeHours = entries.reduce((sum, e) => sum + parseFloat((e.overtimeHours || 0).toString()), 0);
      const totalBreakHours = entries.reduce((sum, e) => sum + (e.breakMinutes / 60), 0);

      await tx.timesheet.update({
        where: { id: timesheetId },
        data: {
          totalHours,
          regularHours: totalRegularHours,
          overtimeHours: totalOvertimeHours,
          breakHours: totalBreakHours,
        },
      });

      return { timesheetId, entryId: entry.id };
    });

    return { success: true, ...result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔧 Clock Entry to Timesheet Backfill Script');
  console.log('═'.repeat(60));
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  console.log('📋 This script will:');
  console.log('   1. Find completed clock entries without timesheet links');
  console.log('   2. Create timesheet entries with overtime calculations');
  console.log('   3. Link to matching shifts for reconciliation');
  console.log('   4. Update clock entries with timesheet references\n');

  // Count total entries to process
  const totalCount = await prisma.clockEntry.count({
    where: {
      status: 'COMPLETED',
      timesheetId: null,
      clockOutTime: { not: null },
    },
  });

  console.log(`📊 Found ${totalCount} clock entries to process\n`);

  if (totalCount === 0) {
    console.log('✅ No entries to process - all clock entries already have timesheets!\n');
    return;
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let shiftsMatched = 0;
  const companiesAffected = new Set<string>();
  const errors: Array<{ clockEntryId: string; error: string }> = [];

  // Process in batches
  let skip = 0;
  while (true) {
    const batch = await prisma.clockEntry.findMany({
      where: {
        status: 'COMPLETED',
        timesheetId: null,
        clockOutTime: { not: null },
      },
      select: {
        id: true,
        employeeId: true,
        companyId: true,
        clockInTime: true,
        clockOutTime: true,
        notes: true,
      },
      take: BATCH_SIZE,
      skip,
      orderBy: { clockInTime: 'asc' },
    });

    if (batch.length === 0) break;

    for (const entry of batch) {
      const result = await processClockEntry({
        id: entry.id,
        employeeId: entry.employeeId,
        companyId: entry.companyId,
        clockInTime: entry.clockInTime,
        clockOutTime: entry.clockOutTime!,
        notes: entry.notes,
      });

      processed++;
      companiesAffected.add(entry.companyId);

      if (result.success) {
        succeeded++;
        // Check if shift was matched by querying the updated entry
        if (!DRY_RUN) {
          const updatedEntry = await prisma.clockEntry.findUnique({
            where: { id: entry.id },
            select: { shiftId: true },
          });
          if (updatedEntry?.shiftId) {
            shiftsMatched++;
          }
        }
      } else {
        failed++;
        errors.push({ clockEntryId: entry.id, error: result.error || 'Unknown' });
      }

      // Progress update every 50 entries
      if (processed % 50 === 0) {
        const percent = Math.round((processed / totalCount) * 100);
        console.log(`   Progress: ${processed}/${totalCount} (${percent}%) - ${succeeded} succeeded, ${failed} failed`);
      }
    }

    skip += BATCH_SIZE;
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📈 BACKFILL SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   Total Clock Entries Found:    ${totalCount}`);
  console.log(`   Successfully Processed:       ${succeeded}`);
  console.log(`   Failed:                       ${failed}`);
  console.log(`   Shifts Auto-Matched:          ${shiftsMatched}`);
  console.log(`   Companies Affected:           ${companiesAffected.size}`);
  console.log('═'.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - No actual changes were made');
    console.log('   Run without DRY_RUN=true to apply changes\n');
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.slice(0, 10).forEach(({ clockEntryId, error }) => {
      console.log(`   - ${clockEntryId}: ${error}`);
    });
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more errors`);
    }
  }

  console.log('\n✨ Backfill complete!');
  console.log('💡 Timesheets created are in PENDING status and require approval.\n');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






