#!/usr/bin/env ts-node
/**
 * NZ Sick Leave Migration Script
 * 
 * Migrates from accrual-based sick leave to anniversary-grant + ledger model
 * per NZ Holidays Act 2003.
 * 
 * Usage:
 *   npm run migrate:nz-sick-leave -- --dry-run   # Preview changes
 *   npm run migrate:nz-sick-leave               # Execute migration
 * 
 * Migration rules:
 * 1. Creates LeaveBalanceLedger table (via Prisma migration)
 * 2. For each employee:
 *    - Posts OPENING_BALANCE equal to current sick leave balance
 *    - Sets sickLeaveEligibilityDate (6 months after employment start)
 *    - Sets sickLeaveLastGrantDate based on tenure
 * 3. Does NOT clamp balances during migration
 * 4. Reports employees above 20-day cap (but doesn't clamp them)
 * 
 * @version 1.0
 * @date 2024
 */

import { PrismaClient } from '@prisma/client';
import { 
  computeSickEligibilityDate, 
  getCanonicalEmploymentDate,
  SICK_LEAVE_CAP_HOURS,
  HOURS_PER_DAY,
  hoursToDisplayDays,
  SICK_LEAVE_ELIGIBILITY_MONTHS,
  SICK_LEAVE_GRANT_INTERVAL_MONTHS,
} from '../lib/leave/nz-sick-leave-ledger';

const prisma = new PrismaClient();

interface MigrationReport {
  totalEmployees: number;
  migrated: number;
  skipped: number;
  aboveCap: Array<{
    employeeId: string;
    employeeName: string;
    balanceDays: number;
    capDays: number;
  }>;
  errors: Array<{
    employeeId: string;
    error: string;
  }>;
}

async function migrateEmployee(
  employee: any,
  dryRun: boolean,
  report: MigrationReport
): Promise<boolean> {
  const employeeId = employee.id;
  const currentBalanceHours = Number(employee.sickLeaveBalance || 0);
  const currentBalanceDays = hoursToDisplayDays(currentBalanceHours);
  
  // Get canonical employment date
  const startDate = getCanonicalEmploymentDate(employee);
  
  if (!startDate) {
    report.errors.push({
      employeeId,
      error: 'No employment start date found',
    });
    return false;
  }
  
  // Calculate eligibility date
  const eligibilityDate = computeSickEligibilityDate(startDate);
  const now = new Date();
  const isEligible = now >= eligibilityDate;
  
  // Calculate last grant date based on tenure
  let lastGrantDate: Date | null = null;
  
  if (isEligible) {
    // Employee is eligible - determine most recent anniversary grant date
    // Start from eligibility date and find the most recent anniversary <= today
    let grantDate = new Date(eligibilityDate);
    while (grantDate <= now) {
      lastGrantDate = new Date(grantDate);
      grantDate.setMonth(grantDate.getMonth() + SICK_LEAVE_GRANT_INTERVAL_MONTHS);
    }
  }
  
  // Check if above cap (report but don't clamp)
  if (currentBalanceHours > SICK_LEAVE_CAP_HOURS) {
    report.aboveCap.push({
      employeeId,
      employeeName: `${employee.User?.firstName || ''} ${employee.User?.lastName || ''}`.trim() || employee.User?.email || employeeId,
      balanceDays: currentBalanceDays,
      capDays: SICK_LEAVE_CAP_HOURS / HOURS_PER_DAY,
    });
  }
  
  if (dryRun) {
    console.log(`  [DRY-RUN] Would migrate employee ${employeeId}:`);
    console.log(`    - Current balance: ${currentBalanceDays} days (${currentBalanceHours} hours)`);
    console.log(`    - Eligibility date: ${eligibilityDate.toISOString().split('T')[0]}`);
    console.log(`    - Is eligible: ${isEligible}`);
    console.log(`    - Last grant date: ${lastGrantDate?.toISOString().split('T')[0] || 'N/A'}`);
    return true;
  }
  
  // Check if opening balance already exists
  const existingOpeningBalance = await prisma.leaveBalanceLedger.findUnique({
    where: { idempotencyKey: `SICK_OPENING_BALANCE:${employeeId}` },
  });
  
  if (existingOpeningBalance) {
    console.log(`  [SKIP] Employee ${employeeId} already has opening balance`);
    report.skipped++;
    return true;
  }
  
  // Execute migration in transaction
  await prisma.$transaction(async (tx) => {
    // Create opening balance ledger entry
    await tx.leaveBalanceLedger.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        leaveType: 'SICK_LEAVE',
        eventType: 'OPENING_BALANCE',
        deltaHours: currentBalanceHours,
        balanceAfter: currentBalanceHours,
        idempotencyKey: `SICK_OPENING_BALANCE:${employeeId}`,
        description: 'Opening balance from legacy accrual system migration',
        createdBy: 'SYSTEM_MIGRATION',
      },
    });
    
    // Update employee with eligibility tracking fields
    await tx.employee.update({
      where: { id: employeeId },
      data: {
        sickLeaveEligibilityDate: eligibilityDate,
        sickLeaveLastGrantDate: lastGrantDate,
      },
    });
  });
  
  console.log(`  [OK] Migrated employee ${employeeId}: ${currentBalanceDays} days`);
  return true;
}

async function runMigration(dryRun: boolean): Promise<MigrationReport> {
  console.log('='.repeat(60));
  console.log('NZ Sick Leave Migration');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('='.repeat(60));
  console.log('');
  
  const report: MigrationReport = {
    totalEmployees: 0,
    migrated: 0,
    skipped: 0,
    aboveCap: [],
    errors: [],
  };
  
  // Fetch all employees with their current sick leave balance
  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      companyId: true,
      employmentStartDate: true,
      startDate: true,
      sickLeaveBalance: true,
      sickLeaveEligibilityDate: true,
      sickLeaveLastGrantDate: true,
      User: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
  
  report.totalEmployees = employees.length;
  console.log(`Found ${employees.length} active employees to migrate\n`);
  
  for (const employee of employees) {
    try {
      const success = await migrateEmployee(employee, dryRun, report);
      if (success && !dryRun) {
        report.migrated++;
      }
    } catch (error: any) {
      console.error(`  [ERROR] Employee ${employee.id}: ${error.message}`);
      report.errors.push({
        employeeId: employee.id,
        error: error.message,
      });
    }
  }
  
  return report;
}

function printReport(report: MigrationReport, dryRun: boolean): void {
  console.log('\n' + '='.repeat(60));
  console.log('Migration Report');
  console.log('='.repeat(60));
  console.log(`Total employees: ${report.totalEmployees}`);
  console.log(`Migrated: ${dryRun ? 'N/A (dry run)' : report.migrated}`);
  console.log(`Skipped (already migrated): ${report.skipped}`);
  console.log(`Errors: ${report.errors.length}`);
  
  // Report employees above cap
  if (report.aboveCap.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('EMPLOYEES ABOVE 20-DAY CAP (NOT CLAMPED)');
    console.log('-'.repeat(60));
    console.log('These employees have balances above the 20-day cap.');
    console.log('Per migration rules, these are NOT clamped during migration.');
    console.log('Cap will be enforced at the next grant time.\n');
    
    console.log('Employee ID                          | Name                    | Balance | Cap');
    console.log('-'.repeat(85));
    
    for (const emp of report.aboveCap) {
      const name = emp.employeeName.substring(0, 23).padEnd(23);
      console.log(`${emp.employeeId} | ${name} | ${emp.balanceDays.toFixed(1).padStart(7)} | ${emp.capDays}`);
    }
    
    // Output as JSON for programmatic use
    console.log('\nJSON format for reporting:');
    console.log(JSON.stringify(report.aboveCap, null, 2));
  }
  
  // Report errors
  if (report.errors.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('ERRORS');
    console.log('-'.repeat(60));
    
    for (const err of report.errors) {
      console.log(`${err.employeeId}: ${err.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (dryRun) {
    console.log('DRY RUN COMPLETE - No changes were made.');
    console.log('Run without --dry-run to execute the migration.');
  } else {
    console.log('MIGRATION COMPLETE');
  }
  
  console.log('='.repeat(60));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  try {
    const report = await runMigration(dryRun);
    printReport(report, dryRun);
    
    // Exit with error code if there were errors
    if (report.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
