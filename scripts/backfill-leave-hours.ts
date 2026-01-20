/**
 * Backfill Leave Hours Script
 * 
 * Migrates existing LeaveEntitlement records from days-only to hours-based tracking.
 * This script is idempotent and safe to run multiple times.
 * 
 * PRIORITY ORDER FOR HOURS PER DAY (NZ Holidays Act 2003 Compliance):
 * 1. Employee's working pattern (WorkingPatternDay.hoursPerDay) - MOST ACCURATE
 * 2. Company.defaultHoursPerDay - Company-level fallback
 * 3. 8 hours (system default) - LAST RESORT ONLY
 * 
 * IMPORTANT: This script does NOT modify data in --dry-run mode.
 * Always run with --dry-run first to verify the conversion logic.
 * 
 * Usage:
 *   npx ts-node scripts/backfill-leave-hours.ts --dry-run              # Preview only
 *   npx ts-node scripts/backfill-leave-hours.ts --dry-run --verbose    # Detailed output
 *   npx ts-node scripts/backfill-leave-hours.ts --company-id=<id>      # Single company
 *   npx ts-node scripts/backfill-leave-hours.ts                        # Apply to all
 * 
 * @version 2.0
 * @date 2026
 */

import { PrismaClient } from '@prisma/client';
import { 
  DEFAULT_HOURS_PER_DAY, 
  calculateWorkingPatternHours,
  decimalToNumber,
} from '../lib/leave/hours-conversion';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

type HoursSource = 'working_pattern' | 'company_default' | 'system_default';

interface BackfillResult {
  entitlementId: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  companyName: string;
  categoryName: string;
  totalDays: number;
  usedDays: number;
  carryoverDays: number;
  hoursPerDay: number;
  totalHours: number;
  usedHours: number;
  carryoverHours: number;
  source: HoursSource;
  warnings: string[];
}

interface BackfillSummary {
  totalProcessed: number;
  successCount: number;
  skipCount: number;
  errorCount: number;
  results: BackfillResult[];
  errors: Array<{ entitlementId: string; employeeId: string; error: string }>;
  // Explicit tracking for audit
  employeesWithNoWorkingPattern: string[];
  employeesUsingFallbackHours: string[];
  employeesUsingCompanyDefault: string[];
}

// ============================================
// MAIN BACKFILL FUNCTION
// ============================================

async function backfillLeaveHours(options: {
  dryRun: boolean;
  companyId?: string;
  verbose?: boolean;
}): Promise<BackfillSummary> {
  const { dryRun, companyId, verbose = false } = options;
  
  console.log('');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' LEAVE HOURS BACKFILL SCRIPT '.padStart(48).padEnd(68) + '║');
  console.log('║' + ' NZ Holidays Act 2003 Compliance '.padStart(50).padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('');
  console.log(`Mode:    ${dryRun ? '🔍 DRY RUN (no changes will be made)' : '⚡ LIVE (changes will be applied)'}`);
  console.log(`Verbose: ${verbose ? 'Yes' : 'No'}`);
  if (companyId) {
    console.log(`Company: ${companyId}`);
  }
  console.log('');
  console.log('Priority order for hours/day:');
  console.log('  1. Employee working pattern (WorkingPatternDay.hoursPerDay)');
  console.log('  2. Company.defaultHoursPerDay');
  console.log('  3. System default: 8 hours (FALLBACK ONLY)');
  console.log('');

  const summary: BackfillSummary = {
    totalProcessed: 0,
    successCount: 0,
    skipCount: 0,
    errorCount: 0,
    results: [],
    errors: [],
    employeesWithNoWorkingPattern: [],
    employeesUsingFallbackHours: [],
    employeesUsingCompanyDefault: [],
  };

  // Build where clause
  // Note: totalHours field doesn't exist in Prisma types yet, so we fetch all and filter
  const whereClause: any = {};
  if (companyId) {
    whereClause.companyId = companyId;
  }

  // Fetch all entitlements that need backfill with full context
  console.log('Fetching entitlements...');
  const allEntitlements = await prisma.leaveEntitlement.findMany({
    where: whereClause,
    include: {
      Employee: {
        include: {
          WorkingPattern: {
            include: {
              WorkingPatternWeek: {
                include: {
                  WorkingPatternDay: true,
                },
              },
            },
          },
        },
      },
      Company: true,
      EventCategory: true,
    },
  });

  // Filter to only records without hours data (field doesn't exist in types yet)
  const entitlements = allEntitlements.filter((e: any) => e.totalHours === null || e.totalHours === undefined);

  console.log(`Found ${entitlements.length} entitlements to process`);
  console.log('');

  if (entitlements.length === 0) {
    console.log('✅ No entitlements require backfill.');
    return summary;
  }

  // Track unique employees for reporting
  const seenEmployees = new Set<string>();

  for (const entitlement of entitlements) {
    summary.totalProcessed++;
    const warnings: string[] = [];

    try {
      // Type assertions for fields that don't exist in Prisma types yet
      const employee = entitlement.Employee as any;
      const company = entitlement.Company as any;
      
      const employeeName = employee 
        ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown'
        : 'Unknown';
      const companyName = company?.name || 'Unknown';

      // ============================================
      // PRIORITY 1: Working Pattern
      // ============================================
      let hoursPerDay: number | null = null;
      let source: HoursSource = 'system_default';

      const workingPattern = employee?.WorkingPattern;
      if (workingPattern?.WorkingPatternWeek?.[0]?.WorkingPatternDay) {
        const patternDays = workingPattern.WorkingPatternWeek[0].WorkingPatternDay;
        const patternHours = calculateWorkingPatternHours(patternDays);
        
        if (patternHours.averageHoursPerDay > 0) {
          hoursPerDay = patternHours.averageHoursPerDay;
          source = 'working_pattern';
          
          if (verbose) {
            console.log(`  ✓ ${employeeName}: Using working pattern (${hoursPerDay}h/day)`);
          }
        }
      }

      // Track employees without working pattern
      if (!workingPattern && !seenEmployees.has(entitlement.employeeId)) {
        summary.employeesWithNoWorkingPattern.push(entitlement.employeeId);
        warnings.push('No working pattern assigned');
      }

      // ============================================
      // PRIORITY 2: Company Default
      // ============================================
      if (hoursPerDay === null && company?.defaultHoursPerDay) {
        const companyDefault = decimalToNumber(company.defaultHoursPerDay, DEFAULT_HOURS_PER_DAY);
        if (companyDefault > 0) {
          hoursPerDay = companyDefault;
          source = 'company_default';
          
          if (!seenEmployees.has(entitlement.employeeId)) {
            summary.employeesUsingCompanyDefault.push(entitlement.employeeId);
          }
          
          if (verbose) {
            console.log(`  ⚠ ${employeeName}: Using company default (${hoursPerDay}h/day)`);
          }
        }
      }

      // ============================================
      // PRIORITY 3: System Default (FALLBACK)
      // ============================================
      if (hoursPerDay === null) {
        hoursPerDay = DEFAULT_HOURS_PER_DAY;
        source = 'system_default';
        
        if (!seenEmployees.has(entitlement.employeeId)) {
          summary.employeesUsingFallbackHours.push(entitlement.employeeId);
        }
        
        warnings.push(`Using system fallback (${DEFAULT_HOURS_PER_DAY}h/day) - may be inaccurate for part-time employees`);
        
        if (verbose) {
          console.log(`  ⚠ ${employeeName}: Using FALLBACK ${DEFAULT_HOURS_PER_DAY}h/day (no pattern or company default)`);
        }
      }

      seenEmployees.add(entitlement.employeeId);

      // ============================================
      // CALCULATE HOURS
      // ============================================
      const totalHours = Math.round(entitlement.totalDays * hoursPerDay * 100) / 100;
      const usedHours = Math.round(entitlement.usedDays * hoursPerDay * 100) / 100;
      const carryoverHours = Math.round(entitlement.carryoverDays * hoursPerDay * 100) / 100;

      const result: BackfillResult = {
        entitlementId: entitlement.id,
        employeeId: entitlement.employeeId,
        employeeName,
        companyId: entitlement.companyId,
        companyName,
        categoryName: entitlement.EventCategory?.name || 'Unknown',
        totalDays: entitlement.totalDays,
        usedDays: entitlement.usedDays,
        carryoverDays: entitlement.carryoverDays,
        hoursPerDay,
        totalHours,
        usedHours,
        carryoverHours,
        source,
        warnings,
      };

      summary.results.push(result);

      // ============================================
      // APPLY UPDATE (if not dry run)
      // ============================================
      if (!dryRun) {
        await (prisma.leaveEntitlement as any).update({
          where: { id: entitlement.id },
          data: {
            totalHours,
            usedHours,
            carryoverHours,
          },
        });
      }

      summary.successCount++;

      // Progress indicator
      if (summary.totalProcessed % 100 === 0) {
        console.log(`  Progress: ${summary.totalProcessed}/${entitlements.length}`);
      }
    } catch (error: any) {
      summary.errorCount++;
      summary.errors.push({
        entitlementId: entitlement.id,
        employeeId: entitlement.employeeId,
        error: error.message || 'Unknown error',
      });
      console.error(`  ❌ Error processing ${entitlement.id}: ${error.message}`);
    }
  }

  // ============================================
  // PRINT SUMMARY
  // ============================================
  console.log('');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' BACKFILL SUMMARY '.padStart(43).padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('');
  console.log(`Total processed:  ${summary.totalProcessed}`);
  console.log(`Success:          ${summary.successCount}`);
  console.log(`Skipped:          ${summary.skipCount}`);
  console.log(`Errors:           ${summary.errorCount}`);
  console.log('');

  // Source breakdown
  const bySource = {
    working_pattern: summary.results.filter(r => r.source === 'working_pattern').length,
    company_default: summary.results.filter(r => r.source === 'company_default').length,
    system_default: summary.results.filter(r => r.source === 'system_default').length,
  };
  
  console.log('Hours source breakdown:');
  console.log(`  ✓ Working pattern:     ${bySource.working_pattern.toString().padStart(5)} (accurate)`);
  console.log(`  ⚠ Company default:     ${bySource.company_default.toString().padStart(5)} (acceptable)`);
  console.log(`  ⚠ System fallback (8h): ${bySource.system_default.toString().padStart(5)} (may need review)`);
  console.log('');

  // ============================================
  // EXPLICIT WARNINGS FOR AUDIT
  // ============================================
  if (summary.employeesWithNoWorkingPattern.length > 0) {
    console.log('⚠️  EMPLOYEES WITHOUT WORKING PATTERN:');
    console.log(`   ${summary.employeesWithNoWorkingPattern.length} employees have no working pattern assigned.`);
    console.log('   Their hours were calculated using company default or system fallback.');
    if (verbose) {
      console.log('   IDs:', summary.employeesWithNoWorkingPattern.slice(0, 10).join(', '));
      if (summary.employeesWithNoWorkingPattern.length > 10) {
        console.log(`   ... and ${summary.employeesWithNoWorkingPattern.length - 10} more`);
      }
    }
    console.log('');
  }

  if (summary.employeesUsingFallbackHours.length > 0) {
    console.log('⚠️  EMPLOYEES USING SYSTEM FALLBACK (8 HOURS):');
    console.log(`   ${summary.employeesUsingFallbackHours.length} employees used the 8-hour fallback.`);
    console.log('   This may be INACCURATE for part-time or variable-hour employees.');
    console.log('   RECOMMENDATION: Assign working patterns to these employees before enabling hours tracking.');
    if (verbose) {
      console.log('   IDs:', summary.employeesUsingFallbackHours.slice(0, 10).join(', '));
      if (summary.employeesUsingFallbackHours.length > 10) {
        console.log(`   ... and ${summary.employeesUsingFallbackHours.length - 10} more`);
      }
    }
    console.log('');
  }

  // Final status
  console.log('─'.repeat(70));
  if (dryRun) {
    console.log('🔍 DRY RUN COMPLETE - No changes were made to the database.');
    console.log('   Run without --dry-run to apply changes.');
  } else {
    console.log('✅ BACKFILL COMPLETE - Changes have been applied.');
  }
  console.log('');

  return summary;
}

// ============================================
// CLI ENTRY POINT
// ============================================

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || args.includes('-v');
const companyIdArg = args.find(a => a.startsWith('--company-id='));
const companyId = companyIdArg ? companyIdArg.split('=')[1] : undefined;

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Leave Hours Backfill Script
===========================

Usage:
  npx ts-node scripts/backfill-leave-hours.ts [options]

Options:
  --dry-run           Preview changes without applying them (RECOMMENDED FIRST)
  --verbose, -v       Show detailed output for each employee
  --company-id=<id>   Process only a specific company
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/backfill-leave-hours.ts --dry-run
  npx ts-node scripts/backfill-leave-hours.ts --dry-run --verbose
  npx ts-node scripts/backfill-leave-hours.ts --company-id=abc123 --dry-run
  npx ts-node scripts/backfill-leave-hours.ts  # Apply to all (LIVE)
`);
  process.exit(0);
}

// Run the backfill
backfillLeaveHours({ dryRun, companyId, verbose })
  .then((summary) => {
    if (summary.errorCount > 0) {
      console.error('');
      console.error('ERRORS ENCOUNTERED:');
      for (const err of summary.errors) {
        console.error(`  - Employee ${err.employeeId}, Entitlement ${err.entitlementId}: ${err.error}`);
      }
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
