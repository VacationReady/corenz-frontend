/**
 * Backfill script to calculate and set totalHours for WorkingPatternWeek
 * Based on the sum of hoursPerDay from all WorkingPatternDay entries
 * 
 * NZ Employment Relations Act 2000 Compliance:
 * - Accurately tracks contractual hours per week for overtime calculations
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting Working Pattern Hours Backfill...\n');

  // Get all working pattern weeks
  const weeks = await prisma.workingPatternWeek.findMany({
    include: {
      WorkingPatternDay: true,
      WorkingPattern: {
        select: { name: true, companyId: true }
      }
    },
  });

  console.log(`📊 Found ${weeks.length} working pattern weeks to process\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const week of weeks) {
    try {
      // Calculate total hours from days where hoursPerDay is set
      const totalHours = week.WorkingPatternDay.reduce((sum, day) => {
        if (day.hoursPerDay) {
          return sum + parseFloat(day.hoursPerDay.toString());
        }
        return sum;
      }, 0);

      // Only update if we have hours data or if current value is 0
      if (totalHours > 0 || parseFloat(week.totalHours.toString()) === 0) {
        await prisma.workingPatternWeek.update({
          where: { id: week.id },
          data: { totalHours: new Prisma.Decimal(totalHours) },
        });

        console.log(
          `✅ ${week.WorkingPattern.name} - Week ${week.weekNumber}: ${totalHours}h (${week.WorkingPatternDay.length} days)`
        );
        updated++;
      } else {
        console.log(
          `⏭️  ${week.WorkingPattern.name} - Week ${week.weekNumber}: Skipped (no hours data)`
        );
        skipped++;
      }
    } catch (error) {
      console.error(
        `❌ Error processing ${week.WorkingPattern.name} - Week ${week.weekNumber}:`,
        error
      );
      errors++;
    }
  }

  console.log('\n📈 Backfill Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
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
