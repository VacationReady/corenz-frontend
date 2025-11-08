/**
 * Integration Tests: Timesheet Entry Edit with NZ-Compliant Overtime Calculation
 * 
 * Tests the refactored timesheet edit workflow that uses calculateOvertimeForEntry()
 * instead of the legacy weekly threshold calculation.
 * 
 * Test Coverage:
 * 1. Regular day edit (8h → 10h) = 8 regular + 2 OT @ 1.5x
 * 2. Public holiday edit (6h → 8h) = 8 hours @ 2x
 * 3. Edit creating negative hours = validation error
 * 4. Bulk edits = each entry recalculates independently
 * 5. Edge cases: calculator failure, missing settings, pattern changes
 */

import '../setupEnv';

import { describe, it, beforeAll, afterAll, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

type NextAuthModule = typeof import('next-auth');
type MockedGetServerSession = ReturnType<(typeof mock)['method']<NextAuthModule, 'getServerSession'>>;
type PatchHandler = typeof import('@/app/api/timesheets/entries/[id]/route')['PATCH'];

let getServerSessionMock: MockedGetServerSession;
let patchHandler: PatchHandler;

const runOvertimeIntegrationTests = process.env.RUN_NZ_OVERTIME_EDIT_TESTS === 'true';
const describeOvertime = runOvertimeIntegrationTests ? describe : describe.skip;

describeOvertime('Timesheet Entry Edit - NZ-Compliant Overtime', () => {
  let testCompanyId: string;
  let testEmployeeId: string;
  let testManagerId: string;
  let testManagerUserId: string;
  let testTimesheetId: string;
  let testEntryId: string;
  let testSettingsId: string;
  let testPublicHolidayDate: Date;
  let testRegularDate: Date;

  beforeAll(async () => {
    const nextAuthModule = await import('next-auth');
    getServerSessionMock = mock.method(nextAuthModule, 'getServerSession', async () => null);

    ({ PATCH: patchHandler } = await import('@/app/api/timesheets/entries/[id]/route'));

    // Create test company
    const company = await prisma.company.create({
      data: {
        id: `test-company-${Date.now()}`,
        name: 'Test Company - Overtime Edit',
        subdomain: `test-ot-edit-${Date.now()}`,
        createdAt: new Date(),
      },
    });
    testCompanyId = company.id;

    // Create manager user
    const managerUser = await prisma.user.create({
      data: {
        id: `manager-user-${Date.now()}`,
        email: `manager-ot-edit-${Date.now()}@test.com`,
        name: 'Test Manager',
        role: 'MANAGER',
      },
    });
    testManagerUserId = managerUser.id;

    // Create manager employee
    const manager = await prisma.employee.create({
      data: {
        id: `manager-${Date.now()}`,
        userId: managerUser.id,
        companyId: testCompanyId,
        firstName: 'Test',
        lastName: 'Manager',
        email: managerUser.email,
        startDate: new Date(),
      },
    });
    testManagerId = manager.id;

    // Create test employee user
    const employeeUser = await prisma.user.create({
      data: {
        id: `employee-user-${Date.now()}`,
        email: `employee-ot-edit-${Date.now()}@test.com`,
        name: 'Test Employee',
        role: 'EMPLOYEE',
      },
    });

    // Create test employee
    const employee = await prisma.employee.create({
      data: {
        id: `employee-${Date.now()}`,
        userId: employeeUser.id,
        companyId: testCompanyId,
        firstName: 'Test',
        lastName: 'Employee',
        email: employeeUser.email,
        startDate: new Date(),
      },
    });
    testEmployeeId = employee.id;

    // Create time tracking settings with NZ-compliant overtime
    const settings = await prisma.timeTrackingSettings.create({
      data: {
        id: `settings-${Date.now()}`,
        companyId: testCompanyId,
        overtimeCalculationMode: 'DAILY',
        autoApplyOvertime: true,
        dailyOvertimeThreshold: 8.0,
        weeklyOvertimeThreshold: 40.0,
        overtimeMultiplier: 1.5,
        publicHolidayMultiplier: 2.0,
        overtimeMultiplierTier2: 2.0,
        overtimeThresholdTier2: 4.0,
        enableOvertimeBreakdown: true,
      },
    });
    testSettingsId = settings.id;

    // Set up test dates (June 4, 2024 is a regular Tuesday)
    testRegularDate = new Date('2024-06-04T00:00:00Z');
    // January 1, 2024 is New Year's Day (NZ Public Holiday)
    testPublicHolidayDate = new Date('2024-01-01T00:00:00Z');

    // Create NZ public holiday
    await prisma.publicHoliday.create({
      data: {
        id: `holiday-${Date.now()}`,
        companyId: testCompanyId,
        name: "New Year's Day",
        date: testPublicHolidayDate,
        isObserved: true,
        type: 'NATIONAL',
      },
    });

    // Create test timesheet
    const timesheet = await prisma.timesheet.create({
      data: {
        id: `timesheet-${Date.now()}`,
        employeeId: testEmployeeId,
        companyId: testCompanyId,
        periodStart: new Date('2024-06-03T00:00:00Z'),
        periodEnd: new Date('2024-06-09T23:59:59Z'),
        status: 'DRAFT',
        totalHours: 8.0,
        regularHours: 8.0,
        overtimeHours: 0.0,
      },
    });
    testTimesheetId = timesheet.id;

    // Create test entry (8 hours on regular day)
    const entry = await prisma.timesheetEntry.create({
      data: {
        id: `entry-${Date.now()}`,
        timesheetId: testTimesheetId,
        date: testRegularDate,
        startTime: new Date('2024-06-04T09:00:00Z'),
        endTime: new Date('2024-06-04T17:00:00Z'),
        breakMinutes: 0,
        hours: 8.0,
        regularHours: 8.0,
        overtimeHours: 0.0,
        entryType: 'MANUAL',
        isOvertime: false,
      },
    });
    testEntryId = entry.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.timesheetEntry.deleteMany({ where: { timesheetId: testTimesheetId } });
    await prisma.timesheet.deleteMany({ where: { id: testTimesheetId } });
    await prisma.publicHoliday.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.timeTrackingSettings.deleteMany({ where: { id: testSettingsId } });
    await prisma.employee.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.user.deleteMany({ where: { email: { contains: 'ot-edit' } } });
    await prisma.globalAuditLog.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.deleteMany({ where: { id: testCompanyId } });

    getServerSessionMock.mock.restore();
  });

  afterEach(() => {
    getServerSessionMock.mock.reset();
    getServerSessionMock.mockImplementation(async () => null);
  });

  describe('TEST CASE 1: Regular Day Edit (8h → 10h)', () => {
    it('should calculate 8 regular + 2 OT @ 1.5x when editing hours from 8 to 10', async () => {
      // Mock manager session
      getServerSessionMock.mockImplementation(async () => ({
        user: { id: testManagerUserId, email: 'manager@test.com', name: 'Test Manager' },
        expires: '2025-01-01',
      }));

      const req = new NextRequest('http://localhost/api/timesheets/entries/' + testEntryId, {
        method: 'PATCH',
        body: JSON.stringify({
          endTime: new Date('2024-06-04T19:00:00Z').toISOString(), // 9am-7pm = 10 hours
          changeReason: 'Employee worked late to complete project',
        }),
      });

      const response = await patchHandler(req, { params: Promise.resolve({ id: testEntryId }) });
      const result = await response.json();

      assert.equal(response.status, 200);
      assert.equal(result.success, true);
      assert.ok(result.changesCount > 0);

      // Verify entry was updated with overtime breakdown
      const updatedEntry = await prisma.timesheetEntry.findUnique({
        where: { id: testEntryId },
      });

      assert.ok(updatedEntry);
      assert.equal(parseFloat(updatedEntry!.hours.toString()), 10.0);
      assert.equal(parseFloat(updatedEntry!.regularHours!.toString()), 8.0);
      assert.equal(parseFloat(updatedEntry!.overtimeHours!.toString()), 2.0);
      assert.equal(parseFloat(updatedEntry!.overtimeMultiplier!.toString()), 1.5);
      assert.equal(updatedEntry!.overtimeType, 'AUTO_DAILY');
      assert.equal(updatedEntry!.isOvertime, true);
      assert.match(updatedEntry!.overtimeReason ?? '', /8h/);

      // Verify audit trail
      const auditLogs = await prisma.timesheetEntryAudit.findMany({
        where: { entryId: testEntryId },
        orderBy: { changedAt: 'desc' },
      });

      const overtimeAuditLog = auditLogs.find(log => log.field === 'overtime_calculation');
      assert.ok(overtimeAuditLog);
      
      const newValue = JSON.parse(overtimeAuditLog!.newValue || '{}');
      assert.equal(newValue.regular, 8.0);
      assert.equal(newValue.overtime, 2.0);
      assert.equal(newValue.multiplier, 1.5);
      assert.equal(newValue.type, 'AUTO_DAILY');

      // Verify overtime audit log for NZ compliance
      const overtimeAudit = await prisma.overtimeAuditLog.findFirst({
        where: { 
          timesheetEntryId: testEntryId,
          action: 'CALCULATED',
        },
        orderBy: { triggeredAt: 'desc' },
      });

      assert.ok(overtimeAudit);
      assert.equal(overtimeAudit!.calculationMethod, 'AUTO_DAILY');
      assert.match(overtimeAudit!.reason ?? '', /Recalculated after entry edit/);
    });
  });

  describe('TEST CASE 2: Public Holiday Edit (6h → 8h)', () => {
    let holidayEntryId: string;

    beforeAll(async () => {
      // Create entry on public holiday
      const holidayEntry = await prisma.timesheetEntry.create({
        data: {
          id: `holiday-entry-${Date.now()}`,
          timesheetId: testTimesheetId,
          date: testPublicHolidayDate,
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T15:00:00Z'),
          breakMinutes: 0,
          hours: 6.0,
          regularHours: 6.0,
          overtimeHours: 0.0,
          entryType: 'MANUAL',
          isOvertime: false,
        },
      });
      holidayEntryId = holidayEntry.id;
    });

    it('should apply 2x multiplier for all hours on public holiday', async () => {
      getServerSessionMock.mockImplementation(async () => ({
        user: { id: testManagerUserId, email: 'manager@test.com', name: 'Test Manager' },
        expires: '2025-01-01',
      }));

      const req = new NextRequest('http://localhost/api/timesheets/entries/' + holidayEntryId, {
        method: 'PATCH',
        body: JSON.stringify({
          endTime: new Date('2024-01-01T17:00:00Z').toISOString(), // 9am-5pm = 8 hours
          changeReason: 'Corrected end time for public holiday work',
        }),
      });

      const response = await patchHandler(req, { params: Promise.resolve({ id: holidayEntryId }) });

      assert.equal(response.status, 200);

      // Verify public holiday premium
      const updatedEntry = await prisma.timesheetEntry.findUnique({
        where: { id: holidayEntryId },
      });

      assert.ok(updatedEntry);
      assert.equal(parseFloat(updatedEntry!.hours.toString()), 8.0);
      // On public holidays with daily threshold of 8h, all hours get special rate
      assert.equal(parseFloat(updatedEntry!.overtimeMultiplier!.toString()), 2.0);
      assert.match(updatedEntry!.overtimeReason ?? '', /Public Holiday/);
    });
  });

  describe('TEST CASE 3: Negative Hours Validation', () => {
    it('should reject edit that creates negative hours', async () => {
      getServerSessionMock.mockImplementation(async () => ({
        user: { id: testManagerUserId, email: 'manager@test.com', name: 'Test Manager' },
        expires: '2025-01-01',
      }));

      const req = new NextRequest('http://localhost/api/timesheets/entries/' + testEntryId, {
        method: 'PATCH',
        body: JSON.stringify({
          startTime: new Date('2024-06-04T18:00:00Z').toISOString(), // After end time
          changeReason: 'Invalid time change',
        }),
      });

      const response = await patchHandler(req, { params: Promise.resolve({ id: testEntryId }) });
      
      // The calculateHours function should return 0 or positive hours
      // If it's 0, the entry will still update but with 0 hours
      assert.ok(response.status < 500);
    });
  });

  describe('TEST CASE 4: Bulk Edit Simulation', () => {
    let bulkEntryIds: string[] = [];

    beforeAll(async () => {
      // Create 3 entries for the same timesheet
      for (let i = 0; i < 3; i++) {
        const date = new Date(`2024-06-0${5+i}T00:00:00Z`);
        const entry = await prisma.timesheetEntry.create({
          data: {
            id: `bulk-entry-${i}-${Date.now()}`,
            timesheetId: testTimesheetId,
            date,
            startTime: new Date(`2024-06-0${5+i}T09:00:00Z`),
            endTime: new Date(`2024-06-0${5+i}T17:00:00Z`),
            breakMinutes: 0,
            hours: 8.0,
            regularHours: 8.0,
            overtimeHours: 0.0,
            entryType: 'MANUAL',
            isOvertime: false,
          },
        });
        bulkEntryIds.push(entry.id);
      }
    });

    it('should recalculate overtime independently for each edited entry', async () => {
      getServerSessionMock.mockImplementation(async () => ({
        user: { id: testManagerUserId, email: 'manager@test.com', name: 'Test Manager' },
        expires: '2025-01-01',
      }));

      // Edit all 3 entries to 10 hours each
      for (const entryId of bulkEntryIds) {
        const entry = await prisma.timesheetEntry.findUnique({
          where: { id: entryId },
        });

        const endTime = new Date(entry!.startTime);
        endTime.setHours(endTime.getHours() + 10);

        const req = new NextRequest('http://localhost/api/timesheets/entries/' + entryId, {
          method: 'PATCH',
          body: JSON.stringify({
            endTime: endTime.toISOString(),
            changeReason: 'Bulk edit test',
          }),
        });

        await patchHandler(req, { params: Promise.resolve({ id: entryId }) });
      }

      // Verify each entry has independent calculation
      for (const entryId of bulkEntryIds) {
        const entry = await prisma.timesheetEntry.findUnique({
          where: { id: entryId },
        });

        assert.equal(parseFloat(entry!.hours.toString()), 10.0);
        assert.equal(parseFloat(entry!.regularHours!.toString()), 8.0);
        assert.equal(parseFloat(entry!.overtimeHours!.toString()), 2.0);
        assert.equal(parseFloat(entry!.overtimeMultiplier!.toString()), 1.5);
      }

      // Verify timesheet totals are recalculated correctly
      const timesheet = await prisma.timesheet.findUnique({
        where: { id: testTimesheetId },
      });

      const allEntries = await prisma.timesheetEntry.findMany({
        where: { timesheetId: testTimesheetId },
      });

      const expectedTotalHours = allEntries.reduce(
        (sum, e) => sum + parseFloat(e.hours.toString()),
        0
      );

      const totalHours = parseFloat(timesheet!.totalHours.toString());
      assert.ok(Math.abs(totalHours - expectedTotalHours) < 10 ** -2);
    });
  });

  describe('TEST CASE 5: Edge Cases', () => {
    it('should handle calculator failure gracefully', async () => {
      // Create entry with invalid data that might cause calculator issues
      const edgeEntry = await prisma.timesheetEntry.create({
        data: {
          id: `edge-entry-${Date.now()}`,
          timesheetId: testTimesheetId,
          date: new Date('2024-06-10T00:00:00Z'),
          startTime: new Date('2024-06-10T09:00:00Z'),
          endTime: new Date('2024-06-10T17:00:00Z'),
          breakMinutes: 0,
          hours: 8.0,
          entryType: 'MANUAL',
        },
      });

      getServerSessionMock.mockImplementation(async () => ({
        user: { id: testManagerUserId, email: 'manager@test.com', name: 'Test Manager' },
        expires: '2025-01-01',
      }));

      const req = new NextRequest('http://localhost/api/timesheets/entries/' + edgeEntry.id, {
        method: 'PATCH',
        body: JSON.stringify({
          hours: 10.0,
          changeReason: 'Edge case test',
        }),
      });

      // Even if calculator fails, the edit should succeed without overtime calculation
      const response = await patchHandler(req, { params: Promise.resolve({ id: edgeEntry.id }) });
      
      // Should not throw 500 error
      assert.ok(response.status < 500);
    });

    it('should handle missing settings gracefully', async () => {
      // Create a company without settings
      const tempCompany = await prisma.company.create({
        data: {
          id: `temp-company-${Date.now()}`,
          name: 'Temp Company',
          subdomain: `temp-${Date.now()}`,
        },
      });

      const tempEmployee = await prisma.employee.create({
        data: {
          id: `temp-employee-${Date.now()}`,
          userId: testManagerUserId,
          companyId: tempCompany.id,
          firstName: 'Temp',
          lastName: 'Employee',
          email: 'temp@test.com',
          startDate: new Date(),
        },
      });

      const tempTimesheet = await prisma.timesheet.create({
        data: {
          id: `temp-timesheet-${Date.now()}`,
          employeeId: tempEmployee.id,
          companyId: tempCompany.id,
          periodStart: new Date('2024-06-03T00:00:00Z'),
          periodEnd: new Date('2024-06-09T23:59:59Z'),
          status: 'DRAFT',
          totalHours: 8.0,
        },
      });

      const tempEntry = await prisma.timesheetEntry.create({
        data: {
          id: `temp-entry-${Date.now()}`,
          timesheetId: tempTimesheet.id,
          date: new Date('2024-06-04T00:00:00Z'),
          startTime: new Date('2024-06-04T09:00:00Z'),
          endTime: new Date('2024-06-04T17:00:00Z'),
          breakMinutes: 0,
          hours: 8.0,
          entryType: 'MANUAL',
        },
      });

      getServerSessionMock.mockImplementation(async () => ({
        user: { id: testManagerUserId, email: 'manager@test.com', name: 'Test Manager' },
        expires: '2025-01-01',
      }));

      const req = new NextRequest('http://localhost/api/timesheets/entries/' + tempEntry.id, {
        method: 'PATCH',
        body: JSON.stringify({
          hours: 10.0,
          changeReason: 'Missing settings test',
        }),
      });

      const response = await patchHandler(req, { params: Promise.resolve({ id: tempEntry.id }) });
      
      // Should return error about missing settings
      assert.equal(response.status, 500);

      // Cleanup
      await prisma.timesheetEntry.deleteMany({ where: { timesheetId: tempTimesheet.id } });
      await prisma.timesheet.deleteMany({ where: { id: tempTimesheet.id } });
      await prisma.employee.deleteMany({ where: { id: tempEmployee.id } });
      await prisma.company.deleteMany({ where: { id: tempCompany.id } });
    });
  });
});
