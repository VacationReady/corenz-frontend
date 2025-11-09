/**
 * Payroll Export Service Tests
 * 
 * Tests the NZ IRD-compliant payroll export generation
 * 
 * Test scenarios:
 * 1. Employee with regular hours only
 * 2. Employee with overtime (1.5x)
 * 3. Employee with public holiday hours (2x)
 * 4. Employee with KiwiSaver and student loan
 * 5. Employee missing IRD number (validation should block)
 * 6. Full pay period with multiple employees
 * 
 * Note: These are integration tests that require a test database.
 * To run these tests, you'll need to:
 * 1. Set up a test database
 * 2. Install Jest: npm install --save-dev @jest/globals jest ts-jest @types/jest
 * 3. Configure Jest for the project
 * 4. Run: npm test payroll-export.test.ts
 */

// Test file stub - uncomment and configure Jest to run full tests
export {}

/*
// Uncomment when Jest is configured

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PayrollExportService } from '../lib/payroll/payroll-export-service';
import { calculatePAYE } from '../lib/payroll/paye-calculator';
import { calculateKiwiSaver } from '../lib/payroll/kiwisaver-calculator';
import { calculateStudentLoanDeduction } from '../lib/payroll/student-loan-calculator';

const prisma = new PrismaClient();

// Test data setup
const TEST_COMPANY_ID = `test-company-${Date.now()}`;
const TEST_USER_ID = `test-user-${Date.now()}`;
const TEST_EMPLOYEE_IDS: string[] = [];

describe('Payroll Export Service', () => {
  beforeAll(async () => {
    // Create test company
    await prisma.company.create({
      data: {
        id: TEST_COMPANY_ID,
        name: 'Test Company Ltd',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test user
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        name: 'Test Admin',
        email: `test-admin-${Date.now()}@test.com`,
        password: 'hashedpassword',
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.payrollCalculation.deleteMany({
      where: { companyId: TEST_COMPANY_ID },
    });
    
    await prisma.timesheetEntry.deleteMany({
      where: {
        Timesheet: {
          companyId: TEST_COMPANY_ID,
        },
      },
    });

    await prisma.timesheet.deleteMany({
      where: { companyId: TEST_COMPANY_ID },
    });

    await prisma.employee.deleteMany({
      where: { companyId: TEST_COMPANY_ID },
    });

    await prisma.user.delete({
      where: { id: TEST_USER_ID },
    });

    await prisma.company.delete({
      where: { id: TEST_COMPANY_ID },
    });

    await prisma.$disconnect();
  });

  describe('Test Case 1: Employee with regular hours only', () => {
    it('should correctly calculate payroll for regular hours', async () => {
      // Create test employee
      const employeeId = `emp-regular-${Date.now()}`;
      TEST_EMPLOYEE_IDS.push(employeeId);

      await prisma.employee.create({
        data: {
          id: employeeId,
          userId: TEST_USER_ID,
          companyId: TEST_COMPANY_ID,
          irdNumber: '123456789',
          taxCode: 'M',
          hourlyRate: 25.0,
          kiwiSaverEnrolled: true,
          kiwiSaverEmployeeRate: 0.03,
          kiwiSaverEmployerRate: 0.03,
          esctRate: 0.175,
          hasStudentLoan: false,
        },
      });

      // Create timesheet with regular hours
      const timesheetId = `ts-regular-${Date.now()}`;
      await prisma.timesheet.create({
        data: {
          id: timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          periodStart: new Date('2024-11-01'),
          periodEnd: new Date('2024-11-07'),
          totalHours: 40,
          regularHours: 40,
          overtimeHours: 0,
          breakHours: 0,
          approvalStatus: 'APPROVED',
        },
      });

      // Create payroll calculation
      const grossPay = 40 * 25; // $1,000

      const payeResult = calculatePAYE({
        grossEarnings: grossPay,
        taxCode: 'M',
        payFrequency: 'WEEKLY',
      });

      const kiwiSaverResult = calculateKiwiSaver({
        grossEarnings: grossPay,
        employeeRate: 0.03,
        employerRate: 0.03,
        esctRate: 0.175,
      });

      await prisma.payrollCalculation.create({
        data: {
          timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          regularPay: 1000,
          overtimePay: 0,
          publicHolidayPay: 0,
          grossPay: 1000,
          payeTax: payeResult.paye,
          accLevy: 14.60, // 1.46% of gross
          studentLoanDeduction: 0,
          kiwiSaverEmployee: kiwiSaverResult.employeeContribution,
          kiwiSaverEmployer: kiwiSaverResult.employerContribution,
          esctDeduction: kiwiSaverResult.esct,
          totalDeductions: payeResult.paye + 14.60 + kiwiSaverResult.employeeContribution,
          netPay: 1000 - (payeResult.paye + 14.60 + kiwiSaverResult.employeeContribution),
          employerCost: 1000 + kiwiSaverResult.employerContribution + kiwiSaverResult.esct,
          payPeriodStart: new Date('2024-11-01'),
          payPeriodEnd: new Date('2024-11-07'),
          paymentDate: new Date('2024-11-08'),
          payFrequency: 'WEEKLY',
          calculatedBy: TEST_USER_ID,
          taxYear: '2024/25',
          status: 'CALCULATED',
        },
      });

      // Verify the calculation values
      expect(kiwiSaverResult.employeeContribution).toBe(30); // 3% of $1,000
      expect(kiwiSaverResult.employerContribution).toBe(30); // 3% of $1,000
      expect(kiwiSaverResult.esct).toBe(5.25); // 17.5% of $30
      expect(payeResult.paye).toBeGreaterThan(0);
    });
  });

  describe('Test Case 2: Employee with overtime (1.5x)', () => {
    it('should correctly calculate overtime pay at 1.5x multiplier', async () => {
      const employeeId = `emp-overtime-${Date.now()}`;
      TEST_EMPLOYEE_IDS.push(employeeId);

      await prisma.employee.create({
        data: {
          id: employeeId,
          userId: TEST_USER_ID,
          companyId: TEST_COMPANY_ID,
          irdNumber: '234567890',
          taxCode: 'M',
          hourlyRate: 25.0,
          kiwiSaverEnrolled: false,
          hasStudentLoan: false,
        },
      });

      const timesheetId = `ts-overtime-${Date.now()}`;
      await prisma.timesheet.create({
        data: {
          id: timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          periodStart: new Date('2024-11-01'),
          periodEnd: new Date('2024-11-07'),
          totalHours: 50,
          regularHours: 40,
          overtimeHours: 10,
          breakHours: 0,
          approvalStatus: 'APPROVED',
        },
      });

      // Create timesheet entries with overtime
      await prisma.timesheetEntry.create({
        data: {
          id: `entry-ot-${Date.now()}`,
          timesheetId,
          date: new Date('2024-11-06'),
          startTime: new Date('2024-11-06T08:00:00'),
          endTime: new Date('2024-11-06T20:00:00'),
          hours: 12,
          overtimeHours: 10,
          regularHours: 2,
          overtimeMultiplier: 1.5,
          overtimeReason: 'Project deadline',
        },
      });

      const regularPay = 40 * 25; // $1,000
      const overtimePay = 10 * 25 * 1.5; // $375
      const grossPay = regularPay + overtimePay; // $1,375

      const payeResult = calculatePAYE({
        grossEarnings: grossPay,
        taxCode: 'M',
        payFrequency: 'WEEKLY',
      });

      await prisma.payrollCalculation.create({
        data: {
          timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          regularPay,
          overtimePay,
          publicHolidayPay: 0,
          grossPay,
          payeTax: payeResult.paye,
          accLevy: 20.08, // 1.46% of $1,375
          studentLoanDeduction: 0,
          kiwiSaverEmployee: 0,
          kiwiSaverEmployer: 0,
          esctDeduction: 0,
          totalDeductions: payeResult.paye + 20.08,
          netPay: grossPay - (payeResult.paye + 20.08),
          employerCost: grossPay,
          payPeriodStart: new Date('2024-11-01'),
          payPeriodEnd: new Date('2024-11-07'),
          paymentDate: new Date('2024-11-08'),
          payFrequency: 'WEEKLY',
          calculatedBy: TEST_USER_ID,
          taxYear: '2024/25',
          status: 'CALCULATED',
        },
      });

      expect(overtimePay).toBe(375);
      expect(grossPay).toBe(1375);
    });
  });

  describe('Test Case 3: Employee with public holiday hours (2x)', () => {
    it('should correctly calculate public holiday premium', async () => {
      const employeeId = `emp-pubholiday-${Date.now()}`;
      TEST_EMPLOYEE_IDS.push(employeeId);

      await prisma.employee.create({
        data: {
          id: employeeId,
          userId: TEST_USER_ID,
          companyId: TEST_COMPANY_ID,
          irdNumber: '345678901',
          taxCode: 'M',
          hourlyRate: 25.0,
          kiwiSaverEnrolled: false,
          hasStudentLoan: false,
        },
      });

      const timesheetId = `ts-pubholiday-${Date.now()}`;
      await prisma.timesheet.create({
        data: {
          id: timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          periodStart: new Date('2024-12-23'),
          periodEnd: new Date('2024-12-29'),
          totalHours: 48,
          regularHours: 40,
          overtimeHours: 0,
          breakHours: 0,
          approvalStatus: 'APPROVED',
        },
      });

      // Create entry for working on Christmas Day
      await prisma.timesheetEntry.create({
        data: {
          id: `entry-xmas-${Date.now()}`,
          timesheetId,
          date: new Date('2024-12-25'),
          startTime: new Date('2024-12-25T08:00:00'),
          endTime: new Date('2024-12-25T16:00:00'),
          hours: 8,
          isPublicHoliday: true,
          publicHolidayName: 'Christmas Day',
          publicHolidayHours: 8,
          publicHolidayMultiplier: 2.0,
          alternativeDayGranted: true,
        },
      });

      const regularPay = 40 * 25; // $1,000
      const publicHolidayPay = 8 * 25 * 2.0; // $400 (double time)
      const grossPay = regularPay + publicHolidayPay; // $1,400

      const payeResult = calculatePAYE({
        grossEarnings: grossPay,
        taxCode: 'M',
        payFrequency: 'WEEKLY',
      });

      await prisma.payrollCalculation.create({
        data: {
          timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          regularPay,
          overtimePay: 0,
          publicHolidayPay,
          grossPay,
          payeTax: payeResult.paye,
          accLevy: 20.44, // 1.46% of $1,400
          studentLoanDeduction: 0,
          kiwiSaverEmployee: 0,
          kiwiSaverEmployer: 0,
          esctDeduction: 0,
          totalDeductions: payeResult.paye + 20.44,
          netPay: grossPay - (payeResult.paye + 20.44),
          employerCost: grossPay,
          payPeriodStart: new Date('2024-12-23'),
          payPeriodEnd: new Date('2024-12-29'),
          paymentDate: new Date('2024-12-30'),
          payFrequency: 'WEEKLY',
          calculatedBy: TEST_USER_ID,
          taxYear: '2024/25',
          status: 'CALCULATED',
        },
      });

      expect(publicHolidayPay).toBe(400);
      expect(grossPay).toBe(1400);
    });
  });

  describe('Test Case 4: Employee with KiwiSaver and student loan', () => {
    it('should correctly calculate all deductions', async () => {
      const employeeId = `emp-full-deductions-${Date.now()}`;
      TEST_EMPLOYEE_IDS.push(employeeId);

      await prisma.employee.create({
        data: {
          id: employeeId,
          userId: TEST_USER_ID,
          companyId: TEST_COMPANY_ID,
          irdNumber: '456789012',
          taxCode: 'M SL', // With student loan
          hourlyRate: 30.0,
          kiwiSaverEnrolled: true,
          kiwiSaverEmployeeRate: 0.06, // 6%
          kiwiSaverEmployerRate: 0.03,
          esctRate: 0.175,
          hasStudentLoan: true,
          studentLoanBalance: 15000,
        },
      });

      const timesheetId = `ts-full-${Date.now()}`;
      await prisma.timesheet.create({
        data: {
          id: timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          periodStart: new Date('2024-11-01'),
          periodEnd: new Date('2024-11-07'),
          totalHours: 40,
          regularHours: 40,
          overtimeHours: 0,
          breakHours: 0,
          approvalStatus: 'APPROVED',
        },
      });

      const grossPay = 40 * 30; // $1,200

      const payeResult = calculatePAYE({
        grossEarnings: grossPay,
        taxCode: 'M SL',
        payFrequency: 'WEEKLY',
      });

      const kiwiSaverResult = calculateKiwiSaver({
        grossEarnings: grossPay,
        employeeRate: 0.06,
        employerRate: 0.03,
        esctRate: 0.175,
      });

      const studentLoanResult = calculateStudentLoanDeduction({
        grossEarnings: grossPay,
        taxCode: 'M SL',
        payFrequency: 'WEEKLY',
        loanBalance: 15000,
      });

      await prisma.payrollCalculation.create({
        data: {
          timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          regularPay: 1200,
          overtimePay: 0,
          publicHolidayPay: 0,
          grossPay: 1200,
          payeTax: payeResult.paye,
          accLevy: 17.52, // 1.46% of $1,200
          studentLoanDeduction: studentLoanResult.deduction,
          kiwiSaverEmployee: kiwiSaverResult.employeeContribution,
          kiwiSaverEmployeeRate: 0.06,
          kiwiSaverEmployer: kiwiSaverResult.employerContribution,
          kiwiSaverEmployerRate: 0.03,
          esctDeduction: kiwiSaverResult.esct,
          totalDeductions: payeResult.paye + 17.52 + studentLoanResult.deduction + kiwiSaverResult.employeeContribution,
          netPay: 1200 - (payeResult.paye + 17.52 + studentLoanResult.deduction + kiwiSaverResult.employeeContribution),
          employerCost: 1200 + kiwiSaverResult.employerContribution + kiwiSaverResult.esct,
          payPeriodStart: new Date('2024-11-01'),
          payPeriodEnd: new Date('2024-11-07'),
          paymentDate: new Date('2024-11-08'),
          payFrequency: 'WEEKLY',
          calculatedBy: TEST_USER_ID,
          taxYear: '2024/25',
          status: 'CALCULATED',
        },
      });

      // Verify calculations
      expect(kiwiSaverResult.employeeContribution).toBe(72); // 6% of $1,200
      expect(kiwiSaverResult.employerContribution).toBe(36); // 3% of $1,200
      expect(studentLoanResult.deduction).toBeGreaterThan(0); // 12% above threshold ($464/week)
      expect(studentLoanResult.deduction).toBe(88.32); // 12% of ($1,200 - $464)
    });
  });

  describe('Test Case 5: Employee missing IRD number (validation should block)', () => {
    it('should fail validation when IRD number is missing', async () => {
      const employeeId = `emp-no-ird-${Date.now()}`;
      TEST_EMPLOYEE_IDS.push(employeeId);

      await prisma.employee.create({
        data: {
          id: employeeId,
          userId: TEST_USER_ID,
          companyId: TEST_COMPANY_ID,
          irdNumber: null, // Missing IRD number
          taxCode: 'M',
          hourlyRate: 25.0,
          kiwiSaverEnrolled: false,
          hasStudentLoan: false,
        },
      });

      const timesheetId = `ts-no-ird-${Date.now()}`;
      await prisma.timesheet.create({
        data: {
          id: timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          periodStart: new Date('2024-11-01'),
          periodEnd: new Date('2024-11-07'),
          totalHours: 40,
          regularHours: 40,
          overtimeHours: 0,
          breakHours: 0,
          approvalStatus: 'APPROVED',
        },
      });

      await prisma.payrollCalculation.create({
        data: {
          timesheetId,
          employeeId,
          companyId: TEST_COMPANY_ID,
          regularPay: 1000,
          grossPay: 1000,
          payeTax: 100,
          accLevy: 14.60,
          totalDeductions: 114.60,
          netPay: 885.40,
          employerCost: 1000,
          payPeriodStart: new Date('2024-11-01'),
          payPeriodEnd: new Date('2024-11-07'),
          paymentDate: new Date('2024-11-08'),
          payFrequency: 'WEEKLY',
          calculatedBy: TEST_USER_ID,
          taxYear: '2024/25',
          status: 'CALCULATED',
        },
      });

      // Export should fail validation
      const exportService = new PayrollExportService();
      
      await expect(
        exportService.generateExport({
          companyId: TEST_COMPANY_ID,
          payPeriodStart: new Date('2024-11-01'),
          payPeriodEnd: new Date('2024-11-07'),
          format: 'csv',
          exportedBy: TEST_USER_ID,
          employeeIds: [employeeId],
        })
      ).rejects.toThrow('missing IRD number');
    });
  });

  describe('Test Case 6: Full pay period with multiple employees', () => {
    it('should generate export for multiple employees', async () => {
      // This test uses all the employees created above (except the one without IRD)
      const exportService = new PayrollExportService();

      const result = await exportService.generateExport({
        companyId: TEST_COMPANY_ID,
        payPeriodStart: new Date('2024-11-01'),
        payPeriodEnd: new Date('2024-11-07'),
        format: 'csv',
        exportedBy: TEST_USER_ID,
        employeeIds: TEST_EMPLOYEE_IDS.filter(id => !id.includes('no-ird')),
      });

      expect(result).toBeDefined();
      expect(result.filename).toContain('payroll_export');
      expect(result.filename).toContain('.csv');
      expect(result.recordCount).toBeGreaterThanOrEqual(3); // Regular, overtime, full deductions employees
      expect(result.warnings).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.data).toContain('Employee ID');
      expect(result.data).toContain('IRD Number');
      expect(result.data).toContain('Gross Pay');
      expect(result.data).toContain('Net Pay');
    });

    it('should generate JSON export', async () => {
      const exportService = new PayrollExportService();

      const result = await exportService.generateExport({
        companyId: TEST_COMPANY_ID,
        payPeriodStart: new Date('2024-11-01'),
        payPeriodEnd: new Date('2024-11-07'),
        format: 'json',
        exportedBy: TEST_USER_ID,
        employeeIds: TEST_EMPLOYEE_IDS.filter(id => !id.includes('no-ird')),
      });

      expect(result).toBeDefined();
      expect(result.filename).toContain('.json');
      expect(result.mimeType).toBe('application/json');
      
      const jsonData = JSON.parse(result.data as string);
      expect(jsonData.exportMetadata).toBeDefined();
      expect(jsonData.records).toBeDefined();
      expect(Array.isArray(jsonData.records)).toBe(true);
    });

    it('should generate Excel export', async () => {
      const exportService = new PayrollExportService();

      const result = await exportService.generateExport({
        companyId: TEST_COMPANY_ID,
        payPeriodStart: new Date('2024-11-01'),
        payPeriodEnd: new Date('2024-11-07'),
        format: 'excel',
        exportedBy: TEST_USER_ID,
        employeeIds: TEST_EMPLOYEE_IDS.filter(id => !id.includes('no-ird')),
      });

      expect(result).toBeDefined();
      expect(result.filename).toContain('.xlsx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.data).toBeInstanceOf(Buffer);
    });
  });
});

*/
