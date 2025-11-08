/**
 * Test Cleanup Utility
 * 
 * Run this script to clean up orphaned test data from failed tests.
 * 
 * Usage:
 *   tsx tests/integration/test-cleanup.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanedTestData() {
  console.log('🧹 Cleaning up orphaned test data...\n');

  try {
    // Find all test companies (those with 'TestCompany' in name)
    const testCompanies = await prisma.company.findMany({
      where: {
        name: { contains: 'TestCompany' },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (testCompanies.length === 0) {
      console.log('✨ No orphaned test data found. Database is clean!');
      return;
    }

    console.log(`Found ${testCompanies.length} test companies to clean up:\n`);
    
    for (const company of testCompanies) {
      console.log(`  - ${company.name} (ID: ${company.id}, Created: ${company.createdAt.toISOString()})`);
    }

    console.log('\n🗑️  Deleting test data...\n');

    let totalDeleted = 0;

    for (const company of testCompanies) {
      const companyId = company.id;
      
      // Delete in order to respect foreign key constraints
      const deletedAudits = await prisma.timesheetEntryAudit.deleteMany({ 
        where: { timesheetId: { in: (await prisma.timesheet.findMany({ where: { companyId }, select: { id: true } })).map(t => t.id) } } 
      });
      
      const timesheetIds = (await prisma.timesheet.findMany({ where: { companyId }, select: { id: true } })).map(t => t.id);
      const stageIds = (await prisma.timesheetApprovalStage.findMany({ where: { timesheetId: { in: timesheetIds } }, select: { id: true } })).map(s => s.id);
      const deletedApprovalDecisions = await prisma.timesheetApprovalDecision.deleteMany({ 
        where: { stageId: { in: stageIds } } 
      });
      
      const deletedApprovalStages = await prisma.timesheetApprovalStage.deleteMany({ 
        where: { timesheetId: { in: timesheetIds } } 
      });
      
      const deletedEntries = await prisma.timesheetEntry.deleteMany({ 
        where: { timesheetId: { in: timesheetIds } } 
      });
      
      const deletedClockEntries = await prisma.clockEntry.deleteMany({ 
        where: { companyId } 
      });
      
      const deletedTimesheets = await prisma.timesheet.deleteMany({ 
        where: { companyId } 
      });
      
      const employeeIds = (await prisma.employee.findMany({ where: { companyId }, select: { id: true } })).map(e => e.id);
      const deletedAssignments = await prisma.employeeWorkingPatternAssignment.deleteMany({ 
        where: { employeeId: { in: employeeIds } } 
      });
      
      const patternIds = (await prisma.workingPattern.findMany({ where: { companyId }, select: { id: true } })).map(p => p.id);
      const weekIds = (await prisma.workingPatternWeek.findMany({ where: { workingPatternId: { in: patternIds } }, select: { id: true } })).map(w => w.id);
      const deletedDays = await prisma.workingPatternDay.deleteMany({ 
        where: { workingPatternWeekId: { in: weekIds } } 
      });
      
      const deletedWeeks = await prisma.workingPatternWeek.deleteMany({ 
        where: { workingPatternId: { in: patternIds } } 
      });
      
      const deletedPatterns = await prisma.workingPattern.deleteMany({ 
        where: { companyId } 
      });
      
      // Note: Public holidays use date-holidays library, not database
      
      const deletedSettings = await prisma.timeTrackingSettings.deleteMany({ 
        where: { companyId } 
      });
      
      const employees = await prisma.employee.findMany({
        where: { companyId },
        select: { userId: true },
      });
      
      const deletedEmployees = await prisma.employee.deleteMany({ 
        where: { companyId } 
      });
      
      const deletedUsers = await prisma.user.deleteMany({ 
        where: { id: { in: employees.map(e => e.userId) } } 
      });
      
      const deletedCompanies = await prisma.company.deleteMany({ 
        where: { id: companyId } 
      });

      const recordsDeleted = 
        deletedAudits.count +
        deletedApprovalDecisions.count +
        deletedApprovalStages.count +
        deletedEntries.count +
        deletedClockEntries.count +
        deletedTimesheets.count +
        deletedAssignments.count +
        deletedDays.count +
        deletedWeeks.count +
        deletedPatterns.count +
        deletedSettings.count +
        deletedEmployees.count +
        deletedUsers.count +
        deletedCompanies.count;

      totalDeleted += recordsDeleted;
      
      console.log(`  ✓ Cleaned up ${company.name}: ${recordsDeleted} records deleted`);
    }

    console.log(`\n✅ Cleanup complete! Removed ${totalDeleted} total records.\n`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanupOrphanedTestData()
  .then(() => {
    console.log('Done! 🎉\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to clean up test data:', error);
    process.exit(1);
  });
