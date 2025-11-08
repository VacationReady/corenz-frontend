/**
 * Backfill script to migrate existing TimesheetEntry records
 * Splits total hours into regularHours and overtimeHours
 * 
 * Default Behavior:
 * - Existing entries with isOvertime=false: All hours → regularHours, 0 → overtimeHours
 * - Existing entries with isOvertime=true: All hours → overtimeHours, 0 → regularHours
 * - Sets appropriate overtimeType and multiplier
 * 
 * NZ Employment Relations Act 2000 Compliance:
 * - Maintains accurate historical records of all hours worked
 * - Clearly separates regular from overtime hours for audit purposes
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting Timesheet Entry Hours Backfill...\n');
  console.log('⚠️  This script is idempotent and safe to rerun multiple times\n');

  // Get all timesheet entries that haven't been migrated yet
  // IDEMPOTENCE: Only process entries where regularHours or overtimeHours is null
  const entries = await prisma.timesheetEntry.findMany({
    where: {
      OR: [
        { regularHours: null },
        { overtimeHours: null },
      ],
    },
    include: {
      Timesheet: {
        select: {
          employeeId: true,
          companyId: true, // BUG FIX: Added companyId for correct multiplier lookup
          periodStart: true,
        },
      },
    },
  });

  console.log(`📊 Found ${entries.length} timesheet entries to process\n`);

  if (entries.length === 0) {
    console.log('✅ No entries to process - backfill already complete or no data exists\n');
    return;
  }

  let updated = 0;
  let errors = 0;
  const companiesUpdated = new Set<string>();

  // Get company overtime settings for default multiplier
  const settings = await prisma.timeTrackingSettings.findMany();
  const settingsMap = new Map(
    settings.map((s) => [s.companyId, s.overtimeMultiplier])
  );

  for (const entry of entries) {
    try {
      const hours = parseFloat(entry.hours.toString());

      let regularHours: number;
      let overtimeHours: number;
      let overtimeType: string | null = null;
      let overtimeMultiplier: Prisma.Decimal | null = null;

      if (entry.isOvertime) {
        // Existing overtime entry: assume all hours are OT
        regularHours = 0;
        overtimeHours = hours;
        overtimeType = 'MANUAL'; // Was manually marked as OT
        
        // BUG FIX: Use companyId instead of employeeId for multiplier lookup
        // BEFORE: settingsMap.get(entry.Timesheet.employeeId) ❌ INCORRECT
        // AFTER:  settingsMap.get(entry.Timesheet.companyId)  ✅ CORRECT
        // Overtime settings are company-wide, not per-employee
        const defaultMultiplier = settingsMap.get(entry.Timesheet.companyId) || new Prisma.Decimal(1.5);
        overtimeMultiplier = defaultMultiplier;
        
        // Track which companies are being updated
        companiesUpdated.add(entry.Timesheet.companyId);
      } else {
        // Regular entry: assume all hours are regular
        regularHours = hours;
        overtimeHours = 0;
        overtimeType = null;
        overtimeMultiplier = null;
      }

      // IDEMPOTENCE: Update operation is safe to rerun because:
      // 1. We only query entries where regularHours/overtimeHours is null
      // 2. Once updated, they won't be selected again
      // 3. No data is deleted, only transformed
      await prisma.timesheetEntry.update({
        where: { id: entry.id },
        data: {
          regularHours: new Prisma.Decimal(regularHours),
          overtimeHours: new Prisma.Decimal(overtimeHours),
          overtimeType,
          overtimeMultiplier,
          overtimeReason: entry.isOvertime ? 'Migrated from legacy overtime entry' : null,
        },
      });

      updated++;
      
      // Log progress every 100 entries
      if (updated % 100 === 0) {
        console.log(`✅ Processed ${updated} entries...`);
      }
    } catch (error) {
      console.error(`❌ Error processing entry ${entry.id}:`, error);
      console.error(`   - Timesheet ID: ${entry.timesheetId}`);
      console.error(`   - Company ID: ${entry.Timesheet.companyId}`);
      console.error(`   - Employee ID: ${entry.Timesheet.employeeId}`);
      errors++;
    }
  }

  console.log('\n📈 Backfill Summary:');
  console.log('━'.repeat(50));
  console.log(`   Total Entries Found:    ${entries.length}`);
  console.log(`   Successfully Updated:   ${updated}`);
  console.log(`   Errors Encountered:     ${errors}`);
  console.log(`   Companies Affected:     ${companiesUpdated.size}`);
  console.log('━'.repeat(50));
  
  if (companiesUpdated.size > 0) {
    console.log('\n🏢 Companies Updated:');
    companiesUpdated.forEach(companyId => {
      const multiplier = settingsMap.get(companyId);
      console.log(`   - ${companyId} (multiplier: ${multiplier || '1.5 (default)'})`); 
    });
  }
  
  if (errors > 0) {
    console.log(`\n⚠️  Warning: ${errors} entries failed to update. Review error logs above.`);
  }
  
  console.log('\n✨ Backfill complete!');
  console.log('💡 This script can be safely rerun if needed.\n');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
