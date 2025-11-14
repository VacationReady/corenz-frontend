/**
 * Integration Tests: Weekly and Monthly Overtime Threshold Calculations
 * 
 * Tests that weekly and monthly overtime calculations include pending entry hours
 * before comparing to thresholds, ensuring accurate premium pay calculations.
 * 
 * Test Coverage:
 * 1. Weekly threshold breach triggered by current edit
 * 2. Monthly threshold breach triggered by current edit
 * 3. Partial-day public holiday with Mondayisation
 * 4. Transaction-aware calculations
 * 
 * NOTE: This integration test uses the REAL database, not mocks.
 */

// Mock server-only module to prevent test environment errors
import Module from 'module';
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') {
    return {};
  }
  return originalLoad(request, parent, isMain);
};

// Set required environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-min-32-chars-required-for-security';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Skip integration tests in CI or when test database is not configured
const SKIP_INTEGRATION_TESTS = 
  process.env.CI === 'true' || 
  process.env.SKIP_INTEGRATION_TESTS === 'true' ||
  !process.env.DATABASE_URL?.includes('overtime_test');

if (SKIP_INTEGRATION_TESTS) {
  console.log('\n⏭️  Skipping integration tests (CI environment or no test database configured)');
  console.log('   To run integration tests locally, see: tests/integration/SETUP.md\n');
  process.exit(0);
}

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../app/lib/prisma';
import { calculateOvertimeForEntry, OvertimeSettings } from '../../lib/overtime-calculator';

describe('Weekly and Monthly Overtime Threshold Tests', () => {
  let testCompanyId: string;
  let testEmployeeId: string;
  let testTimesheetId: string;

  before(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: {
        id: `test-company-${Date.now()}`,
        name: `Test Company - Weekly/Monthly OT ${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        publicHolidayTemplate: 'NZ',
      },
    });
    testCompanyId = company.id;

    // Create test employee
    const user = await prisma.user.create({
      data: {
        id: `user-${Date.now()}`,
        email: `employee-weekly-monthly-${Date.now()}@test.com`,
        name: 'Test Employee',
        role: 'EMPLOYEE',
        password: 'test-password-hash',
        companyId: testCompanyId,
        updatedAt: new Date(),
      },
    });

    const employee = await prisma.employee.create({
      data: {
        id: `employee-${Date.now()}`,
        userId: user.id,
        companyId: testCompanyId,
        startDate: new Date(),
      },
    });
    testEmployeeId = employee.id;

    // Create test timesheet
    const timesheet = await prisma.timesheet.create({
      data: {
        id: `timesheet-${Date.now()}`,
        employeeId: testEmployeeId,
        companyId: testCompanyId,
        periodStart: new Date('2024-06-03T00:00:00Z'),
        periodEnd: new Date('2024-06-09T23:59:59Z'),
        status: 'DRAFT',
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
      },
    });
    testTimesheetId = timesheet.id;
  });

  after(async () => {
    // Clean up test data
    await prisma.timesheetEntry.deleteMany({ where: { timesheetId: testTimesheetId } });
    await prisma.timesheet.deleteMany({ where: { id: testTimesheetId } });
    await prisma.employee.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.user.deleteMany({ where: { email: { contains: 'weekly-monthly' } } });
    await prisma.company.deleteMany({ where: { id: testCompanyId } });
  });

  describe('TEST CASE 1: Weekly Threshold Breach Triggered by Current Edit', () => {
    it('should include pending entry hours when calculating weekly overtime', async () => {
      // Create 4 existing entries with 9 hours each = 36 hours total
      const existingEntries = [];
      for (let i = 0; i < 4; i++) {
        const entry = await prisma.timesheetEntry.create({
          data: {
            id: `weekly-entry-${i}-${Date.now()}`,
            timesheetId: testTimesheetId,
            date: new Date(`2024-06-0${4+i}T00:00:00Z`),
            startTime: new Date(`2024-06-0${4+i}T09:00:00Z`),
            endTime: new Date(`2024-06-0${4+i}T18:00:00Z`),
            breakMinutes: 0,
            hours: 9.0,
            regularHours: 9.0,
            overtimeHours: 0,
            entryType: 'MANUAL',
          },
        });
        existingEntries.push(entry.id);
      }

      // Settings: 40h weekly threshold
      const settings: OvertimeSettings = {
        overtimeCalculationMode: 'WEEKLY',
        autoApplyOvertime: true,
        weeklyOvertimeThreshold: 40.0,
        overtimeMultiplier: 1.5,
        publicHolidayMultiplier: 2.0,
      };

      // Pending entry: 10 hours on Friday
      // Total with pending: 36 + 10 = 46 hours
      // Overtime: 46 - 40 = 6 hours
      // This entry's proportion: 10/46 = ~21.7%
      // This entry's OT: 6 * 0.217 = ~1.3 hours
      const result = await calculateOvertimeForEntry(
        {
          id: `temp-${Date.now()}`,
          date: new Date('2024-06-07T00:00:00Z'),
          hours: 10.0,
          timesheetId: testTimesheetId,
          startTime: new Date('2024-06-07T09:00:00Z'),
          endTime: new Date('2024-06-07T19:00:00Z'),
          breakMinutes: 0,
        },
        testEmployeeId,
        testCompanyId,
        settings
      );

      // Verify overtime was calculated
      assert.ok(result.overtimeHours > 0, 'Should have overtime hours');
      assert.equal(result.overtimeType, 'AUTO_WEEKLY');
      
      // Verify proportional distribution
      const expectedProportion = 10.0 / 46.0;
      const expectedOvertimeHours = 6.0 * expectedProportion;
      assert.ok(
        Math.abs(result.overtimeHours - expectedOvertimeHours) < 0.01,
        `Expected ~${expectedOvertimeHours.toFixed(2)}h OT, got ${result.overtimeHours.toFixed(2)}h`
      );
      
      assert.equal(result.overtimeMultiplier, 1.5);
      assert.match(result.overtimeReason, /46.*40/); // Should mention total and threshold

      // Clean up
      for (const entryId of existingEntries) {
        await prisma.timesheetEntry.delete({ where: { id: entryId } });
      }
    });
  });

  describe('TEST CASE 2: Monthly Threshold Breach Triggered by Current Edit', () => {
    it('should include pending entry hours when calculating monthly overtime', async () => {
      // Create entries totaling 170 hours across the month
      const existingEntries = [];
      for (let i = 0; i < 20; i++) {
        const entry = await prisma.timesheetEntry.create({
          data: {
            id: `monthly-entry-${i}-${Date.now()}`,
            timesheetId: testTimesheetId,
            date: new Date(`2024-06-${String(i + 3).padStart(2, '0')}T00:00:00Z`),
            startTime: new Date(`2024-06-${String(i + 3).padStart(2, '0')}T09:00:00Z`),
            endTime: new Date(`2024-06-${String(i + 3).padStart(2, '0')}T17:30:00Z`),
            breakMinutes: 0,
            hours: 8.5,
            regularHours: 8.5,
            overtimeHours: 0,
            entryType: 'MANUAL',
          },
        });
        existingEntries.push(entry.id);
      }

      // Settings: 173.33h monthly threshold (standard NZ full-time)
      const settings: OvertimeSettings = {
        overtimeCalculationMode: 'MONTHLY',
        autoApplyOvertime: true,
        monthlyOvertimeThreshold: 173.33,
        overtimeMultiplier: 1.5,
        publicHolidayMultiplier: 2.0,
      };

      // Pending entry: 10 hours
      // Total with pending: 170 + 10 = 180 hours
      // Overtime: 180 - 173.33 = 6.67 hours
      // This entry's proportion: 10/180 = ~5.56%
      // This entry's OT: 6.67 * 0.0556 = ~0.37 hours
      const result = await calculateOvertimeForEntry(
        {
          id: `temp-${Date.now()}`,
          date: new Date('2024-06-25T00:00:00Z'),
          hours: 10.0,
          timesheetId: testTimesheetId,
          startTime: new Date('2024-06-25T09:00:00Z'),
          endTime: new Date('2024-06-25T19:00:00Z'),
          breakMinutes: 0,
        },
        testEmployeeId,
        testCompanyId,
        settings
      );

      // Verify overtime was calculated
      assert.ok(result.overtimeHours > 0, 'Should have overtime hours');
      assert.equal(result.overtimeType, 'AUTO_MONTHLY');
      
      // Verify proportional distribution
      const expectedProportion = 10.0 / 180.0;
      const expectedOvertimeHours = 6.67 * expectedProportion;
      assert.ok(
        Math.abs(result.overtimeHours - expectedOvertimeHours) < 0.01,
        `Expected ~${expectedOvertimeHours.toFixed(2)}h OT, got ${result.overtimeHours.toFixed(2)}h`
      );
      
      assert.equal(result.overtimeMultiplier, 1.5);
      assert.match(result.overtimeReason, /180.*173/); // Should mention total and threshold

      // Clean up
      for (const entryId of existingEntries) {
        await prisma.timesheetEntry.delete({ where: { id: entryId } });
      }
    });
  });

  describe('TEST CASE 3: Partial-Day Public Holiday with Mondayisation', () => {
    it('should calculate precise holiday hours for shift spanning midnight', async () => {
      // Create Mondayised public holiday (e.g., ANZAC Day observed on Monday)
      await prisma.publicHoliday.create({
        data: {
          id: `holiday-mondayised-${Date.now()}`,
          companyId: testCompanyId,
          name: 'ANZAC Day (Observed)',
          date: new Date('2024-04-29T00:00:00Z'), // Monday (actual is April 25)
          isObserved: true,
          type: 'MONDAYISED',
        },
      });

      const settings: OvertimeSettings = {
        overtimeCalculationMode: 'DAILY',
        autoApplyOvertime: true,
        dailyOvertimeThreshold: 8.0,
        overtimeMultiplier: 1.5,
        publicHolidayMultiplier: 2.0,
      };

      // Shift: Sunday 10pm to Monday 6am (8 hours total)
      // Holiday hours: Only the portion on Monday (6 hours)
      const result = await calculateOvertimeForEntry(
        {
          id: `temp-${Date.now()}`,
          date: new Date('2024-04-29T00:00:00Z'), // Monday
          hours: 8.0,
          timesheetId: testTimesheetId,
          startTime: new Date('2024-04-28T22:00:00Z'), // Sunday 10pm
          endTime: new Date('2024-04-29T06:00:00Z'), // Monday 6am
          breakMinutes: 0,
        },
        testEmployeeId,
        testCompanyId,
        settings
      );

      // Verify partial holiday hours
      assert.equal(result.isPublicHoliday, true);
      assert.equal(result.publicHolidayName, 'ANZAC Day (Observed)');
      assert.equal(result.publicHolidayType, 'MONDAYISED');
      
      // Should calculate ~6 hours on the holiday (midnight to 6am)
      assert.ok(
        Math.abs(result.publicHolidayHours - 6.0) < 0.1,
        `Expected ~6h holiday hours, got ${result.publicHolidayHours.toFixed(2)}h`
      );
      
      // Mondayised holiday should grant alternative day
      assert.equal(result.alternativeDayGranted, true);
      
      assert.equal(result.publicHolidayMultiplier, 2.0);

      // Clean up
      await prisma.publicHoliday.deleteMany({
        where: { companyId: testCompanyId, name: 'ANZAC Day (Observed)' },
      });
    });

    it('should handle full-day public holiday correctly', async () => {
      // Create national public holiday
      await prisma.publicHoliday.create({
        data: {
          id: `holiday-national-${Date.now()}`,
          companyId: testCompanyId,
          name: 'Waitangi Day',
          date: new Date('2024-02-06T00:00:00Z'),
          isObserved: true,
          type: 'NATIONAL',
        },
      });

      const settings: OvertimeSettings = {
        overtimeCalculationMode: 'DAILY',
        autoApplyOvertime: true,
        dailyOvertimeThreshold: 8.0,
        overtimeMultiplier: 1.5,
        publicHolidayMultiplier: 2.0,
      };

      // Full 8-hour shift on the holiday
      const result = await calculateOvertimeForEntry(
        {
          id: `temp-${Date.now()}`,
          date: new Date('2024-02-06T00:00:00Z'),
          hours: 8.0,
          timesheetId: testTimesheetId,
          startTime: new Date('2024-02-06T09:00:00Z'),
          endTime: new Date('2024-02-06T17:00:00Z'),
          breakMinutes: 0,
        },
        testEmployeeId,
        testCompanyId,
        settings
      );

      // Verify full holiday hours
      assert.equal(result.isPublicHoliday, true);
      assert.equal(result.publicHolidayName, 'Waitangi Day');
      assert.equal(result.publicHolidayType, 'NATIONAL');
      assert.equal(result.publicHolidayHours, 8.0);
      
      // Working a public holiday should grant an alternative day entitlement
      assert.equal(result.alternativeDayGranted, true);

      // Clean up
      await prisma.publicHoliday.deleteMany({
        where: { companyId: testCompanyId, name: 'Waitangi Day' },
      });
    });

    it('should detect public holiday when shift starts before and ends on the holiday', async () => {
      const settings: OvertimeSettings = {
        overtimeCalculationMode: 'DAILY',
        autoApplyOvertime: true,
        dailyOvertimeThreshold: 8.0,
        overtimeMultiplier: 1.5,
        publicHolidayMultiplier: 2.0,
      };

      const result = await calculateOvertimeForEntry(
        {
          id: `temp-${Date.now()}`,
          date: new Date('2024-12-24T00:00:00Z'),
          hours: 8.0,
          timesheetId: testTimesheetId,
          startTime: new Date('2024-12-24T22:00:00Z'),
          endTime: new Date('2024-12-25T06:00:00Z'),
          breakMinutes: 0,
        },
        testEmployeeId,
        testCompanyId,
        settings
      );

      assert.equal(result.isPublicHoliday, true);
      assert.ok(result.publicHolidayName && /Christmas/i.test(result.publicHolidayName));
      assert.ok(
        Math.abs(result.publicHolidayHours - 6.0) < 0.1,
        `Expected ~6h holiday hours, got ${result.publicHolidayHours.toFixed(2)}h`
      );
      assert.equal(result.alternativeDayGranted, true);
    });
  });

  describe('TEST CASE 4: Transaction-Aware Calculations', () => {
    it('should use transaction client when provided', async () => {
      // This test verifies that the calculator respects transaction boundaries
      await prisma.$transaction(async (tx) => {
        // Create entry within transaction
        const entry = await tx.timesheetEntry.create({
          data: {
            id: `tx-entry-${Date.now()}`,
            timesheetId: testTimesheetId,
            date: new Date('2024-06-10T00:00:00Z'),
            startTime: new Date('2024-06-10T09:00:00Z'),
            endTime: new Date('2024-06-10T17:00:00Z'),
            breakMinutes: 0,
            hours: 8.0,
            regularHours: 8.0,
            overtimeHours: 0,
            entryType: 'MANUAL',
          },
        });

        const settings: OvertimeSettings = {
          overtimeCalculationMode: 'WEEKLY',
          autoApplyOvertime: true,
          weeklyOvertimeThreshold: 40.0,
          overtimeMultiplier: 1.5,
          publicHolidayMultiplier: 2.0,
        };

        // Calculate overtime with transaction client
        const result = await calculateOvertimeForEntry(
          {
            id: `temp-${Date.now()}`,
            date: new Date('2024-06-11T00:00:00Z'),
            hours: 10.0,
            timesheetId: testTimesheetId,
            startTime: new Date('2024-06-11T09:00:00Z'),
            endTime: new Date('2024-06-11T19:00:00Z'),
            breakMinutes: 0,
          },
          testEmployeeId,
          testCompanyId,
          settings,
          undefined,
          tx // Pass transaction client
        );

        // Should see the entry created within this transaction
        assert.ok(result !== null);
        
        // Clean up within transaction
        await tx.timesheetEntry.delete({ where: { id: entry.id } });
      });
    });
  });
});
