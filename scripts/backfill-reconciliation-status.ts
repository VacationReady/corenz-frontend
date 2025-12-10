/**
 * Backfill Reconciliation Status
 * 
 * This script updates TimesheetEntry.reconciliationStatus to 'APPROVED'
 * for all entries whose parent Timesheet has approvalStatus = 'APPROVED'.
 * 
 * This fixes the issue where timesheet entries were approved via the action
 * items flow but their reconciliationStatus remained 'PENDING'.
 * 
 * Run with: npx ts-node scripts/backfill-reconciliation-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting reconciliation status backfill...\n');

  // Find all timesheet entries with PENDING reconciliation status
  // whose parent timesheet is APPROVED
  const entriesToUpdate = await prisma.timesheetEntry.findMany({
    where: {
      reconciliationStatus: 'PENDING',
      Timesheet: {
        approvalStatus: 'APPROVED',
      },
    },
    include: {
      Timesheet: {
        select: {
          id: true,
          approvalStatus: true,
          approvedBy: true,
          approvedAt: true,
          Employee: {
            select: {
              User: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  console.log(`Found ${entriesToUpdate.length} entries to update\n`);

  if (entriesToUpdate.length === 0) {
    console.log('No entries need updating. Exiting.');
    return;
  }

  // Group by timesheet for logging
  const byTimesheet = new Map<string, typeof entriesToUpdate>();
  for (const entry of entriesToUpdate) {
    const tsId = entry.timesheetId;
    if (!byTimesheet.has(tsId)) {
      byTimesheet.set(tsId, []);
    }
    byTimesheet.get(tsId)!.push(entry);
  }

  console.log(`Entries span ${byTimesheet.size} timesheets\n`);

  // Update all entries in a transaction
  const result = await prisma.timesheetEntry.updateMany({
    where: {
      reconciliationStatus: 'PENDING',
      Timesheet: {
        approvalStatus: 'APPROVED',
      },
    },
    data: {
      reconciliationStatus: 'APPROVED',
      reconciledAt: new Date(),
      reconciliationNotes: 'Auto-updated: Parent timesheet was already approved',
    },
  });

  console.log(`✅ Updated ${result.count} timesheet entries to APPROVED status\n`);

  // Log summary
  console.log('Summary by timesheet:');
  for (const [tsId, entries] of byTimesheet) {
    const ts = entries[0].Timesheet;
    const employeeName = ts.Employee?.User?.name || ts.Employee?.User?.email || 'Unknown';
    console.log(`  - Timesheet ${tsId.slice(0, 8)}... (${employeeName}): ${entries.length} entries`);
  }

  console.log('\nBackfill complete!');
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
