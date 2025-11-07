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

  // Get all timesheet entries that haven't been migrated yet
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
          periodStart: true,
        },
      },
    },
  });

  console.log(`📊 Found ${entries.length} timesheet entries to process\n`);

  let updated = 0;
  let errors = 0;

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
        
        // Try to get multiplier from company settings
        const defaultMultiplier = settingsMap.get(entry.Timesheet.employeeId) || new Prisma.Decimal(1.5);
        overtimeMultiplier = defaultMultiplier;
      } else {
        // Regular entry: assume all hours are regular
        regularHours = hours;
        overtimeHours = 0;
        overtimeType = null;
        overtimeMultiplier = null;
      }

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

      if (updated % 100 === 0) {
        console.log(`✅ Processed ${updated} entries...`);
      }
      updated++;
    } catch (error) {
      console.error(`❌ Error processing entry ${entry.id}:`, error);
      errors++;
    }
  }

  console.log('\n📈 Backfill Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors:  ${errors}`);
  console.log('\n✨ Backfill complete!');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
