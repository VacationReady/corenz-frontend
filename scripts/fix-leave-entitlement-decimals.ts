/**
 * Backfill Script: Fix Leave Entitlement Decimal Precision
 * 
 * This script rounds all leave entitlement values to 2 decimal places
 * to comply with NZ HRIS requirements.
 * 
 * Usage:
 *   npx tsx scripts/fix-leave-entitlement-decimals.ts
 *   OR
 *   npx ts-node scripts/fix-leave-entitlement-decimals.ts
 * 
 * Options:
 *   --dry-run  Preview changes without applying them
 * 
 * @version 1.0
 * @date 2024
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Rounds a number to exactly 2 decimal places
 */
function roundToTwoDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Checks if a number has more than 2 decimal places
 */
function hasExcessDecimals(value: number): boolean {
  const rounded = roundToTwoDecimals(value);
  return Math.abs(value - rounded) > 0.00001; // Account for floating point precision
}

async function fixLeaveEntitlementDecimals(isDryRun: boolean = false) {
  console.log('🔍 Scanning leave entitlements for decimal precision issues...\n');
  console.log(isDryRun ? '📝 DRY RUN MODE - No changes will be made\n' : '');

  // Fetch all leave entitlements
  const entitlements = await prisma.leaveEntitlement.findMany({
    include: {
      Employee: {
        select: {
          User: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      EventCategory: {
        select: {
          name: true,
        },
      },
    },
  });

  let fixedCount = 0;
  let skippedCount = 0;
  const issues: Array<{
    id: string;
    employee: string;
    category: string;
    field: string;
    original: number;
    rounded: number;
  }> = [];

  for (const entitlement of entitlements) {
    const updates: { totalDays?: number; usedDays?: number; daysAllocated?: number; carryoverDays?: number } = {};
    const employeeName = entitlement.Employee?.User 
      ? `${entitlement.Employee.User.firstName || ''} ${entitlement.Employee.User.lastName || ''}`.trim() || entitlement.Employee.User.email
      : 'Unknown';
    const categoryName = entitlement.EventCategory?.name || 'Unknown';

    // Check totalDays
    if (hasExcessDecimals(entitlement.totalDays)) {
      const rounded = roundToTwoDecimals(entitlement.totalDays);
      updates.totalDays = rounded;
      issues.push({
        id: entitlement.id,
        employee: employeeName,
        category: categoryName,
        field: 'totalDays',
        original: entitlement.totalDays,
        rounded,
      });
    }

    // Check usedDays
    if (hasExcessDecimals(entitlement.usedDays)) {
      const rounded = roundToTwoDecimals(entitlement.usedDays);
      updates.usedDays = rounded;
      issues.push({
        id: entitlement.id,
        employee: employeeName,
        category: categoryName,
        field: 'usedDays',
        original: entitlement.usedDays,
        rounded,
      });
    }

    // Check daysAllocated
    if (hasExcessDecimals(entitlement.daysAllocated)) {
      const rounded = roundToTwoDecimals(entitlement.daysAllocated);
      updates.daysAllocated = rounded;
      issues.push({
        id: entitlement.id,
        employee: employeeName,
        category: categoryName,
        field: 'daysAllocated',
        original: entitlement.daysAllocated,
        rounded,
      });
    }

    // Check carryoverDays
    if (hasExcessDecimals(entitlement.carryoverDays)) {
      const rounded = roundToTwoDecimals(entitlement.carryoverDays);
      updates.carryoverDays = rounded;
      issues.push({
        id: entitlement.id,
        employee: employeeName,
        category: categoryName,
        field: 'carryoverDays',
        original: entitlement.carryoverDays,
        rounded,
      });
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      if (!isDryRun) {
        await prisma.leaveEntitlement.update({
          where: { id: entitlement.id },
          data: updates,
        });
      }
      fixedCount++;
    } else {
      skippedCount++;
    }
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 LEAVE ENTITLEMENT DECIMAL PRECISION FIX REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (issues.length > 0) {
    console.log('🔧 Issues found and ' + (isDryRun ? 'would be fixed' : 'fixed') + ':\n');
    
    // Group by employee for cleaner output
    const groupedIssues = issues.reduce((acc, issue) => {
      const key = issue.employee;
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    }, {} as Record<string, typeof issues>);

    for (const [employee, employeeIssues] of Object.entries(groupedIssues)) {
      console.log(`  👤 ${employee}`);
      for (const issue of employeeIssues) {
        console.log(`     └─ ${issue.category}.${issue.field}: ${issue.original} → ${issue.rounded}`);
      }
      console.log('');
    }
  } else {
    console.log('✅ No decimal precision issues found!\n');
  }

  console.log('───────────────────────────────────────────────────────────────');
  console.log(`📈 Summary:`);
  console.log(`   • Total entitlements scanned: ${entitlements.length}`);
  console.log(`   • Entitlements ${isDryRun ? 'needing fixes' : 'fixed'}: ${fixedCount}`);
  console.log(`   • Entitlements already compliant: ${skippedCount}`);
  console.log(`   • Individual fields ${isDryRun ? 'to be corrected' : 'corrected'}: ${issues.length}`);
  console.log('───────────────────────────────────────────────────────────────\n');

  if (isDryRun && issues.length > 0) {
    console.log('💡 To apply these fixes, run without --dry-run flag:\n');
    console.log('   npx tsx scripts/fix-leave-entitlement-decimals.ts\n');
  }

  return { fixedCount, skippedCount, issues };
}

async function fixEmployeeLeaveBalances(isDryRun: boolean = false) {
  console.log('🔍 Scanning employee leave balance fields...\n');

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      annualLeaveBalance: true,
      sickLeaveBalance: true,
      sickLeaveDaysPerYear: true,
      alternativeHolidayBalance: true,
      User: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  let fixedCount = 0;
  const issues: Array<{
    employee: string;
    field: string;
    original: number;
    rounded: number;
  }> = [];

  for (const employee of employees) {
    const updates: any = {};
    const employeeName = employee.User 
      ? `${employee.User.firstName || ''} ${employee.User.lastName || ''}`.trim() || employee.User.email
      : 'Unknown';

    // Check annualLeaveBalance (stored as Decimal)
    const annualBalance = Number(employee.annualLeaveBalance || 0);
    if (hasExcessDecimals(annualBalance)) {
      const rounded = roundToTwoDecimals(annualBalance);
      updates.annualLeaveBalance = rounded;
      issues.push({ employee: employeeName, field: 'annualLeaveBalance', original: annualBalance, rounded });
    }

    // Check sickLeaveBalance (stored as Decimal)
    const sickBalance = Number(employee.sickLeaveBalance || 0);
    if (hasExcessDecimals(sickBalance)) {
      const rounded = roundToTwoDecimals(sickBalance);
      updates.sickLeaveBalance = rounded;
      issues.push({ employee: employeeName, field: 'sickLeaveBalance', original: sickBalance, rounded });
    }

    // Check sickLeaveDaysPerYear (stored as Decimal)
    if (employee.sickLeaveDaysPerYear !== null) {
      const sickDaysPerYear = Number(employee.sickLeaveDaysPerYear);
      if (hasExcessDecimals(sickDaysPerYear)) {
        const rounded = roundToTwoDecimals(sickDaysPerYear);
        updates.sickLeaveDaysPerYear = rounded;
        issues.push({ employee: employeeName, field: 'sickLeaveDaysPerYear', original: sickDaysPerYear, rounded });
      }
    }

    // Check alternativeHolidayBalance (stored as Decimal)
    if (employee.alternativeHolidayBalance !== null) {
      const altBalance = Number(employee.alternativeHolidayBalance);
      if (hasExcessDecimals(altBalance)) {
        const rounded = roundToTwoDecimals(altBalance);
        updates.alternativeHolidayBalance = rounded;
        issues.push({ employee: employeeName, field: 'alternativeHolidayBalance', original: altBalance, rounded });
      }
    }

    if (Object.keys(updates).length > 0) {
      if (!isDryRun) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: updates,
        });
      }
      fixedCount++;
    }
  }

  if (issues.length > 0) {
    console.log('🔧 Employee balance issues ' + (isDryRun ? 'found' : 'fixed') + ':\n');
    for (const issue of issues) {
      console.log(`  👤 ${issue.employee}: ${issue.field} ${issue.original} → ${issue.rounded}`);
    }
    console.log('');
  }

  return { fixedCount, issues };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     LEAVE ENTITLEMENT DECIMAL PRECISION FIX                   ║');
  console.log('║     NZ HRIS Requirement: Max 2 decimal places                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Fix LeaveEntitlement records
    const entitlementResult = await fixLeaveEntitlementDecimals(isDryRun);
    
    // Fix Employee balance fields
    const employeeResult = await fixEmployeeLeaveBalances(isDryRun);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ COMPLETED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   LeaveEntitlement records ${isDryRun ? 'to fix' : 'fixed'}: ${entitlementResult.fixedCount}`);
    console.log(`   Employee records ${isDryRun ? 'to fix' : 'fixed'}: ${employeeResult.fixedCount}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during fix:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

