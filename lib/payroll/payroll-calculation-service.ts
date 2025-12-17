/**
 * NZ Payroll Calculation Service
 * 
 * Orchestrates all payroll calculations including:
 * - PAYE tax
 * - ACC levy
 * - Student loan deductions
 * - KiwiSaver contributions
 * - Leave accruals
 * 
 * @version 1.0
 * @date 2024-11-08
 */

import { calculatePAYE, PayFrequency, getCurrentTaxYear } from './paye-calculator';
import { calculateACCLevy } from './acc-calculator';
import { calculateStudentLoanDeduction } from './student-loan-calculator';
import { calculateKiwiSaver } from './kiwisaver-calculator';
import { calculateLeaveAccrual, AnnualLeaveMethod } from './leave-calculator';
import { NZTaxCode } from '../../types/nz-payroll-export';
import type { PrismaClient } from '@prisma/client';

// Lazy-load Prisma to prevent test environment database connection errors
let prisma: PrismaClient | null = null;
function getPrismaClient(): PrismaClient | null {
  if (!prisma && process.env.NODE_ENV !== 'test') {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

// ============================================
// TYPES
// ============================================

export interface PayrollCalculationInput {
  timesheetId: string;
  employeeId: string;
  companyId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  paymentDate: Date;
  payFrequency: PayFrequency;
  regularHours: number;
  regularRate: number;
  overtimeHours?: number;
  overtimeRate?: number;
  overtimeMultiplier?: number;
  publicHolidayHours?: number;
  publicHolidayRate?: number;
  publicHolidayMultiplier?: number;
  allowances?: number;
  bonuses?: number;
  commission?: number;
  reimbursements?: number;
  calculatedBy: string;
}

export interface PayrollCalculationOutput {
  id: string;
  timesheetId: string;
  employeeId: string;
  companyId: string;
  
  // Earnings
  regularPay: number;
  overtimePay: number;
  publicHolidayPay: number;
  allowances: number;
  bonuses: number;
  commission: number;
  reimbursements: number;
  grossPay: number;
  
  // Deductions
  payeTax: number;
  accLevy: number;
  studentLoanDeduction: number;
  kiwiSaverEmployee: number;
  kiwiSaverEmployer: number;
  esctDeduction: number;
  totalDeductions: number;
  
  // Totals
  netPay: number;
  employerCost: number;
  
  // Leave Accruals
  annualLeaveAccrued: number;
  sickLeaveAccrued: number;
  
  // Metadata
  taxYear: string;
  calculatedAt: Date;
  warnings: string[];
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate complete payroll for an employee
 */
export async function calculatePayroll(
  input: PayrollCalculationInput
): Promise<PayrollCalculationOutput> {
  const warnings: string[] = [];
  
  // Fetch employee details
  const prismaClient = getPrismaClient();
  if (!prismaClient) {
    throw new Error('Database connection unavailable - cannot calculate payroll');
  }
  
  const employee = await prismaClient.employee.findUnique({
    where: { id: input.employeeId },
    select: {
      id: true,
      irdNumber: true,
      taxCode: true,
      hourlyRate: true,
      kiwiSaverEnrolled: true,
      kiwiSaverEmployeeRate: true,
      kiwiSaverEmployerRate: true,
      esctRate: true,
      hasStudentLoan: true,
      studentLoanBalance: true,
      annualLeaveBalance: true,
      sickLeaveBalance: true,
      employmentStartDate: true,
      startDate: true,
    },
  });
  
  if (!employee) {
    throw new Error(`Employee ${input.employeeId} not found`);
  }
  
  // Validate required fields
  if (!employee.irdNumber) {
    warnings.push('Employee missing IRD number - export will fail');
  }
  
  if (!employee.taxCode) {
    warnings.push('Employee missing tax code - using ND (non-declaration 45%)');
  }
  
  // ============================================
  // STEP 1: CALCULATE EARNINGS
  // ============================================
  
  const regularPay = input.regularHours * input.regularRate;
  
  const overtimePay = input.overtimeHours && input.overtimeRate
    ? input.overtimeHours * input.overtimeRate
    : 0;
  
  const publicHolidayPay = input.publicHolidayHours && input.publicHolidayRate
    ? input.publicHolidayHours * input.publicHolidayRate
    : 0;
  
  const grossPay =
    regularPay +
    overtimePay +
    publicHolidayPay +
    (input.allowances || 0) +
    (input.bonuses || 0) +
    (input.commission || 0) +
    (input.reimbursements || 0);
  
  // ============================================
  // STEP 2: CALCULATE TAX (PAYE)
  // ============================================
  
  const taxCode = (employee.taxCode || 'ND') as NZTaxCode;
  
  const payeResult = calculatePAYE({
    grossEarnings: grossPay,
    taxCode,
    payFrequency: input.payFrequency,
  });
  
  // ============================================
  // STEP 3: CALCULATE ACC LEVY
  // ============================================
  
  const accResult = calculateACCLevy({
    grossEarnings: grossPay,
    payFrequency: input.payFrequency,
  });
  
  // ============================================
  // STEP 4: CALCULATE STUDENT LOAN DEDUCTION
  // ============================================
  
  let studentLoanDeduction = 0;
  
  if (employee.hasStudentLoan) {
    const studentLoanResult = calculateStudentLoanDeduction({
      grossEarnings: grossPay,
      taxCode,
      payFrequency: input.payFrequency,
      loanBalance: employee.studentLoanBalance
        ? parseFloat(employee.studentLoanBalance.toString())
        : undefined,
    });
    
    studentLoanDeduction = studentLoanResult.deduction;
    
    // Update student loan balance
    if (employee.studentLoanBalance && studentLoanDeduction > 0) {
      await prismaClient.employee.update({
        where: { id: employee.id },
        data: {
          studentLoanBalance: {
            decrement: studentLoanDeduction,
          },
        },
      });
    }
  }
  
  // ============================================
  // STEP 5: CALCULATE KIWISAVER
  // ============================================
  
  let kiwiSaverEmployee = 0;
  let kiwiSaverEmployer = 0;
  let esctDeduction = 0;
  
  if (employee.kiwiSaverEnrolled) {
    const employeeRate = employee.kiwiSaverEmployeeRate
      ? parseFloat(employee.kiwiSaverEmployeeRate.toString())
      : 0.03;
    
    const employerRate = employee.kiwiSaverEmployerRate
      ? parseFloat(employee.kiwiSaverEmployerRate.toString())
      : 0.03;
    
    const esctRate = employee.esctRate
      ? parseFloat(employee.esctRate.toString())
      : 0.175;
    
    const kiwiSaverResult = calculateKiwiSaver({
      grossEarnings: grossPay,
      employeeRate,
      employerRate,
      esctRate,
      optedOut: !employee.kiwiSaverEnrolled,
    });
    
    kiwiSaverEmployee = kiwiSaverResult.employeeContribution;
    kiwiSaverEmployer = kiwiSaverResult.employerContribution;
    esctDeduction = kiwiSaverResult.esct;
    
    if (kiwiSaverResult.warnings.length > 0) {
      warnings.push(...kiwiSaverResult.warnings);
    }
  }
  
  // ============================================
  // STEP 6: CALCULATE TOTALS
  // ============================================
  
  const totalDeductions =
    payeResult.paye +
    accResult.accLevy +
    studentLoanDeduction +
    kiwiSaverEmployee;
  
  const netPay = grossPay - totalDeductions;
  
  const employerCost =
    grossPay +
    kiwiSaverEmployer +
    esctDeduction +
    accResult.accLevy;
  
  // ============================================
  // STEP 7: CALCULATE LEAVE ACCRUALS
  // ============================================
  
  const employmentStartDate = employee.employmentStartDate || employee.startDate || new Date();
  const totalHours = input.regularHours + (input.overtimeHours || 0) + (input.publicHolidayHours || 0);
  
  // NZ SICK LEAVE REFACTOR: Sick leave is now anniversary-grant based, not accrued per pay period.
  // Only annual leave accrues per pay period. Sick leave is handled by the ledger system.
  // See lib/leave/nz-sick-leave-ledger.ts for the new sick leave entitlement engine.
  const leaveResult = calculateLeaveAccrual({
    grossEarnings: grossPay,
    hoursWorked: totalHours,
    employmentStartDate,
    currentDate: input.payPeriodEnd,
    annualLeaveMethod: 'EIGHT_PERCENT',
    currentAnnualLeaveBalance: employee.annualLeaveBalance
      ? parseFloat(employee.annualLeaveBalance.toString())
      : 0,
    currentSickLeaveBalance: employee.sickLeaveBalance
      ? parseFloat(employee.sickLeaveBalance.toString())
      : 0,
    // Flag to skip sick leave accrual (NZ anniversary-grant model)
    skipSickLeaveAccrual: true,
  });
  
  if (leaveResult.warnings.length > 0) {
    warnings.push(...leaveResult.warnings);
  }
  
  // Update leave balances - ONLY annual leave (sick leave managed by ledger)
  await prismaClient.employee.update({
    where: { id: employee.id },
    data: {
      annualLeaveBalance: leaveResult.updatedAnnualLeaveBalance,
      // NOTE: sickLeaveBalance is NOT updated here - it's managed by the ledger system
      // See lib/leave/nz-sick-leave-ledger.ts
      leaveBalanceLastUpdated: new Date(),
    },
  });
  
  // ============================================
  // STEP 8: SAVE TO DATABASE
  // ============================================
  
  const calculation = await prismaClient.payrollCalculation.create({
    data: {
      timesheetId: input.timesheetId,
      employeeId: input.employeeId,
      companyId: input.companyId,
      
      // Earnings
      regularPay,
      overtimePay,
      publicHolidayPay,
      allowances: input.allowances || 0,
      bonuses: input.bonuses || 0,
      commission: input.commission || 0,
      reimbursements: input.reimbursements || 0,
      grossPay,
      
      // Deductions
      payeTax: payeResult.paye,
      accLevy: accResult.accLevy,
      studentLoanDeduction,
      kiwiSaverEmployee,
      kiwiSaverEmployeeRate: employee.kiwiSaverEmployeeRate || 0.03,
      kiwiSaverEmployer,
      kiwiSaverEmployerRate: employee.kiwiSaverEmployerRate || 0.03,
      esctDeduction,
      totalDeductions,
      
      // Totals
      netPay,
      employerCost,
      
      // Pay Period
      payPeriodStart: input.payPeriodStart,
      payPeriodEnd: input.payPeriodEnd,
      paymentDate: input.paymentDate,
      payFrequency: input.payFrequency,
      
      // Metadata
      calculatedAt: new Date(),
      calculatedBy: input.calculatedBy,
      calculationVersion: '1.0',
      taxYear: getCurrentTaxYear(),
      status: 'CALCULATED',
    },
  });
  
  return {
    id: calculation.id,
    timesheetId: calculation.timesheetId,
    employeeId: calculation.employeeId,
    companyId: calculation.companyId,
    
    regularPay,
    overtimePay,
    publicHolidayPay,
    allowances: input.allowances || 0,
    bonuses: input.bonuses || 0,
    commission: input.commission || 0,
    reimbursements: input.reimbursements || 0,
    grossPay,
    
    payeTax: payeResult.paye,
    accLevy: accResult.accLevy,
    studentLoanDeduction,
    kiwiSaverEmployee,
    kiwiSaverEmployer,
    esctDeduction,
    totalDeductions,
    
    netPay,
    employerCost,
    
    annualLeaveAccrued: leaveResult.annualLeaveAccrued,
    sickLeaveAccrued: leaveResult.sickLeaveAccrued,
    
    taxYear: getCurrentTaxYear(),
    calculatedAt: new Date(),
    warnings,
  };
}

/**
 * Calculate payroll for multiple timesheets (batch)
 */
export async function calculatePayrollBatch(
  inputs: PayrollCalculationInput[]
): Promise<PayrollCalculationOutput[]> {
  const results: PayrollCalculationOutput[] = [];
  
  for (const input of inputs) {
    try {
      const result = await calculatePayroll(input);
      results.push(result);
    } catch (error) {
      console.error(`Failed to calculate payroll for employee ${input.employeeId}:`, error);
      // Continue with other employees
    }
  }
  
  return results;
}

/**
 * Recalculate payroll (e.g., after correction)
 */
export async function recalculatePayroll(
  calculationId: string,
  updatedBy: string
): Promise<PayrollCalculationOutput> {
  const prismaClient = getPrismaClient();
  if (!prismaClient) {
    throw new Error('Database connection unavailable - cannot recalculate payroll');
  }
  
  const existing = await prismaClient.payrollCalculation.findUnique({
    where: { id: calculationId },
    include: {
      Timesheet: {
        include: {
          TimesheetEntries: true,
        },
      },
    },
  });
  
  if (!existing) {
    throw new Error(`Payroll calculation ${calculationId} not found`);
  }
  
  // Extract input from existing calculation and timesheet
  const timesheet = existing.Timesheet;
  const entries = timesheet.TimesheetEntries;
  
  const regularHours = entries.reduce((sum: number, e: any) => sum + (parseFloat(e.regularHours?.toString() || '0')), 0);
  const overtimeHours = entries.reduce((sum: number, e: any) => sum + (parseFloat(e.overtimeHours?.toString() || '0')), 0);
  const publicHolidayHours = entries.reduce((sum: number, e: any) => sum + (parseFloat(e.publicHolidayHours?.toString() || '0')), 0);
  
  const employee = await prismaClient.employee.findUnique({
    where: { id: existing.employeeId },
    select: { hourlyRate: true },
  });
  
  const hourlyRate = employee?.hourlyRate ? parseFloat(employee.hourlyRate.toString()) : 25;
  
  const input: PayrollCalculationInput = {
    timesheetId: existing.timesheetId,
    employeeId: existing.employeeId,
    companyId: existing.companyId,
    payPeriodStart: existing.payPeriodStart,
    payPeriodEnd: existing.payPeriodEnd,
    paymentDate: existing.paymentDate,
    payFrequency: existing.payFrequency as PayFrequency,
    regularHours,
    regularRate: hourlyRate,
    overtimeHours: overtimeHours > 0 ? overtimeHours : undefined,
    overtimeRate: overtimeHours > 0 ? hourlyRate * 1.5 : undefined,
    publicHolidayHours: publicHolidayHours > 0 ? publicHolidayHours : undefined,
    publicHolidayRate: publicHolidayHours > 0 ? hourlyRate * 2.0 : undefined,
    calculatedBy: updatedBy,
  };
  
  // Delete old calculation
  await prismaClient.payrollCalculation.delete({
    where: { id: calculationId },
  });
  
  // Create new calculation
  return calculatePayroll(input);
}
