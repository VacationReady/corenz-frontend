/**
 * Test Fixtures and Database Helpers for Overtime Integration Tests
 * 
 * Provides utilities for:
 * - Creating test companies, employees, and working patterns
 * - Setting up time tracking settings
 * - Creating clock entries and timesheets
 * - Cleaning up test data
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

export interface TestCompany {
  id: string;
  name: string;
}

export interface TestEmployee {
  id: string;
  userId: string;
  companyId: string;
  firstName: string;
  lastName: string;
}

export interface TestUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Generate unique test identifiers
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a test company
 */
export async function createTestCompany(name?: string): Promise<TestCompany> {
  const companyName = name || generateTestId('TestCompany');
  
  const company = await prisma.company.create({
    data: {
      name: companyName,
      industry: 'TEST',
      size: 'SMALL',
    },
  });

  return company;
}

/**
 * Create a test user with employee record
 */
export async function createTestEmployee(
  companyId: string,
  overrides?: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    contractedHours: number;
  }>
): Promise<{ user: TestUser; employee: TestEmployee }> {
  const email = overrides?.email || generateTestId('employee') + '@test.com';
  const firstName = overrides?.firstName || 'Test';
  const lastName = overrides?.lastName || 'Employee';
  const role = overrides?.role || 'EMPLOYEE';

  const user = await prisma.user.create({
    data: {
      email,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      role,
      password: 'test-password-hash', // Not used in tests
      companyId,
      updatedAt: new Date(),
    },
  });

  const employee = await prisma.employee.create({
    data: {
      id: `emp_${randomBytes(12).toString('hex')}`,
      userId: user.id,
      companyId,
      startDate: new Date(),
      isActive: true,
    },
  });

  return {
    user: { id: user.id, email: user.email, role: user.role },
    employee: {
      id: employee.id,
      userId: user.id,
      companyId: employee.companyId,
      firstName, // From User model
      lastName,  // From User model
    },
  };
}

/**
 * Create time tracking settings for a company
 */
export async function createTimeTrackingSettings(
  companyId: string,
  overrides?: Partial<{
    autoApplyOvertime: boolean;
    overtimeCalculationMode: string;
    dailyOvertimeThreshold: number;
    weeklyOvertimeThreshold: number;
    monthlyOvertimeThreshold: number;
    overtimeMultiplier: number;
    publicHolidayMultiplier: number;
    sundayMultiplier: number;
    overtimeMultiplierTier2: number;
    overtimeThresholdTier2: number;
  }>
) {
  return await prisma.timeTrackingSettings.create({
    data: {
      companyId,
      // Default settings for NZ compliance
      autoApplyOvertime: overrides?.autoApplyOvertime ?? true,
      overtimeCalculationMode: overrides?.overtimeCalculationMode || 'DAILY',
      dailyOvertimeThreshold: overrides?.dailyOvertimeThreshold ?? 8.0,
      weeklyOvertimeThreshold: overrides?.weeklyOvertimeThreshold ?? 40.0,
      monthlyOvertimeThreshold: overrides?.monthlyOvertimeThreshold ?? 173.33,
      overtimeMultiplier: overrides?.overtimeMultiplier ?? 1.5,
      publicHolidayMultiplier: overrides?.publicHolidayMultiplier ?? 2.0,
      sundayMultiplier: overrides?.sundayMultiplier,
      overtimeMultiplierTier2: overrides?.overtimeMultiplierTier2,
      overtimeThresholdTier2: overrides?.overtimeThresholdTier2,
      // Default other settings
      requireGpsLocation: false,
      requirePhotoClockIn: false,
      requirePhotoClockOut: false,
      timesheetPeriod: 'WEEKLY',
      periodStartDay: 'MONDAY',
      autoSubmit: false,
    },
  });
}

/**
 * Create a working pattern for an employee
 */
export async function createWorkingPattern(
  companyId: string,
  employeeId: string,
  options?: {
    name?: string;
    weekCount?: number;
    daysPerWeek?: number;
    hoursPerDay?: number;
  }
) {
  const name = options?.name || 'Standard 40h Week';
  const hoursPerDay = options?.hoursPerDay || 8;
  
  // Create the working pattern
  const pattern = await prisma.workingPattern.create({
    data: {
      companyId,
      name,
      description: 'Test working pattern',
      weekCount: options?.weekCount || 1,
    },
  });

  // Create a standard week (Monday-Friday, 8h/day)
  const week = await prisma.workingPatternWeek.create({
    data: {
      workingPatternId: pattern.id,
      weekNumber: 1,
      totalHours: hoursPerDay * (options?.daysPerWeek || 5),
    },
  });

  // Create days
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  for (const day of days) {
    await prisma.workingPatternDay.create({
      data: {
        workingPatternWeekId: week.id,
        day,
        type: 'FULL_DAY',
        hoursPerDay,
      },
    });
  }

  // Assign pattern to employee
  await prisma.employeeWorkingPatternAssignment.create({
    data: {
      employeeId,
      workingPatternId: pattern.id,
      effectiveDate: new Date('2024-01-01'),
    },
  });

  return { pattern, week };
}

/**
 * Note: Public holidays are handled by the date-holidays library via isNZPublicHoliday().
 * There is no PublicHoliday database model. Tests should use actual NZ holiday dates
 * (e.g., 2024-02-06 for Waitangi Day) which will be detected automatically.
 */

/**
 * Create a clock entry
 */
export async function createClockEntry(
  employeeId: string,
  companyId: string,
  clockInTime: Date,
  clockOutTime?: Date,
  status: 'ACTIVE' | 'COMPLETED' = 'COMPLETED'
) {
  return await prisma.clockEntry.create({
    data: {
      employeeId,
      companyId,
      clockInTime,
      clockOutTime,
      status,
    },
  });
}

/**
 * Create a timesheet with entries
 */
export async function createTimesheet(
  employeeId: string,
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
  totalHours: number = 0
) {
  return await prisma.timesheet.create({
    data: {
      employeeId,
      companyId,
      periodStart,
      periodEnd,
      totalHours,
      regularHours: totalHours,
      overtimeHours: 0,
      breakHours: 0,
      approvalStatus: 'PENDING',
    },
  });
}

/**
 * Create a timesheet entry
 */
export async function createTimesheetEntry(
  timesheetId: string,
  date: Date,
  hours: number,
  overrides?: Partial<{
    regularHours: number;
    overtimeHours: number;
    overtimeMultiplier: number;
    overtimeType: string;
    overtimeReason: string;
  }>
) {
  return await prisma.timesheetEntry.create({
    data: {
      timesheetId,
      date,
      hours,
      regularHours: overrides?.regularHours ?? hours,
      overtimeHours: overrides?.overtimeHours ?? 0,
      overtimeMultiplier: overrides?.overtimeMultiplier ?? 1.0,
      overtimeType: overrides?.overtimeType,
      overtimeReason: overrides?.overtimeReason,
      entryType: 'CLOCK',
      isOvertime: (overrides?.overtimeHours ?? 0) > 0,
    },
  });
}

/**
 * Clean up test data by company ID
 */
export async function cleanupTestData(companyId: string) {
  // Delete in order to respect foreign key constraints
  await prisma.timesheetEntryAudit.deleteMany({ where: { Timesheet: { companyId } } });
  await prisma.timesheetApprovalDecision.deleteMany({ where: { TimesheetApprovalStage: { Timesheet: { companyId } } } });
  await prisma.timesheetApprovalStage.deleteMany({ where: { Timesheet: { companyId } } });
  await prisma.timesheetEntry.deleteMany({ where: { Timesheet: { companyId } } });
  await prisma.clockEntry.deleteMany({ where: { companyId } });
  await prisma.timesheet.deleteMany({ where: { companyId } });
  await prisma.employeeWorkingPatternAssignment.deleteMany({ where: { Employee: { companyId } } });
  await prisma.workingPatternDay.deleteMany({ where: { WorkingPatternWeek: { WorkingPattern: { companyId } } } });
  await prisma.workingPatternWeek.deleteMany({ where: { WorkingPattern: { companyId } } });
  await prisma.workingPattern.deleteMany({ where: { companyId } });
  await prisma.timeTrackingSettings.deleteMany({ where: { companyId } });
  await prisma.employee.deleteMany({ where: { companyId } });
  await prisma.user.deleteMany({ where: { Employee: { some: { companyId } } } });
  await prisma.company.deleteMany({ where: { id: companyId } });
}

/**
 * Clean up all test data (use with caution!)
 */
export async function cleanupAllTestData() {
  const testCompanies = await prisma.company.findMany({
    where: {
      name: { contains: 'TestCompany' },
    },
  });

  for (const company of testCompanies) {
    await cleanupTestData(company.id);
  }
}

/**
 * Get audit logs for a timesheet entry
 */
export async function getTimesheetEntryAuditLogs(entryId: string) {
  return await prisma.timesheetEntryAudit.findMany({
    where: { entryId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Disconnect Prisma client
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
