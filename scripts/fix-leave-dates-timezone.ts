/**
 * Script to fix timezone issues in existing leave request dates
 * 
 * Problem: Leave requests created before the timezone fix have dates stored as UTC midnight,
 * which can display as the wrong day in local timezones (e.g., NZ UTC+13).
 * 
 * This script:
 * 1. Finds all leave requests
 * 2. For each request, checks if the date needs adjustment
 * 3. Converts UTC midnight dates to local midnight dates
 * 
 * Run with: npx tsx scripts/fix-leave-dates-timezone.ts
 */

import { prisma } from '@/lib/prisma';

async function fixLeaveDates() {
  console.log('🔍 Finding leave requests with potential timezone issues...\n');

  const leaveRequests = await prisma.leaveRequest.findMany({
    select: {
      id: true,
      startDate: true,
      endDate: true,
      Employee: {
        select: {
          id: true,
          User: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      },
      EventCategory: {
        select: {
          name: true,
        }
      }
    },
    orderBy: {
      startDate: 'desc',
    },
  });

  console.log(`Found ${leaveRequests.length} leave requests\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const request of leaveRequests) {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    
    // Check if the date is at UTC midnight (00:00:00.000Z)
    // These are the dates that need fixing
    const isStartAtUTCMidnight = 
      startDate.getUTCHours() === 0 && 
      startDate.getUTCMinutes() === 0 && 
      startDate.getUTCSeconds() === 0;
    
    const isEndAtUTCMidnight = 
      endDate.getUTCHours() === 0 && 
      endDate.getUTCMinutes() === 0 && 
      endDate.getUTCSeconds() === 0;

    if (!isStartAtUTCMidnight && !isEndAtUTCMidnight) {
      skippedCount++;
      continue;
    }

    // Convert to local midnight
    // The date components (year, month, day) should stay the same,
    // but we want local midnight instead of UTC midnight
    const newStartDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      0, 0, 0, 0
    );

    const newEndDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      0, 0, 0, 0
    );

    const employeeName = request.Employee?.User?.name || 
      `${request.Employee?.User?.firstName || ''} ${request.Employee?.User?.lastName || ''}`.trim() ||
      'Unknown';

    console.log(`📝 Fixing: ${request.EventCategory?.name || 'Leave'} for ${employeeName}`);
    console.log(`   Old: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`   New: ${newStartDate.toISOString()} to ${newEndDate.toISOString()}`);
    console.log(`   Display: ${newStartDate.toLocaleDateString()} to ${newEndDate.toLocaleDateString()}\n`);

    // Update the database
    await prisma.leaveRequest.update({
      where: { id: request.id },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
      },
    });

    fixedCount++;
  }

  console.log('\n✅ Migration complete!');
  console.log(`   Fixed: ${fixedCount} records`);
  console.log(`   Skipped: ${skippedCount} records (already correct)`);
}

fixLeaveDates()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
