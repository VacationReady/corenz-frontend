/**
 * NZ IRD-Compliant Payroll Export Types
 * 
 * Complies with:
 * - Tax Administration Act 1994 (Payday Filing)
 * - Employment Relations Act 2000 (Record Keeping)
 * - Holidays Act 2003 (Leave Entitlements)
 * - KiwiSaver Act 2006 (Retirement Contributions)
 * 
 * @version 1.0
 * @date 2024-11-08
 */

import { z } from 'zod';

// ============================================
// TAX CODE DEFINITIONS
// ============================================

/**
 * Valid NZ Tax Codes (2024/25 Tax Year)
 * 
 * Reference: https://www.ird.govt.nz/employing-staff/payday-filing/tax-codes
 */
export type NZTaxCode =
  // Primary employment
  | 'M'      // Primary, no student loan
  | 'ME'     // Primary, low earner (<$24k), no student loan
  | 'M SL'   // Primary with student loan
  | 'ME SL'  // Primary, low earner with student loan
  // Secondary employment
  | 'SB'     // Secondary basic
  | 'SB SL'  // Secondary with student loan
  | 'S'      // Secondary higher
  | 'S SL'   // Secondary higher with student loan
  | 'SH'     // Secondary highest
  | 'SH SL'  // Secondary highest with student loan
  // Special rates
  | 'ST'     // Special tax rate
  | 'ST SL'  // Special tax rate with student loan
  | 'SA'     // Special exempt
  | 'SA SL'  // Special exempt with student loan
  | 'SL'     // Student loan only (no PAYE)
  // Other codes
  | 'CAE'    // Casual agricultural employee
  | 'EDW'    // Election day worker
  | 'ND'     // Non-declaration (45% rate)
  | 'NS'     // Non-resident seasonal worker
  | 'STC'    // Special tax code certificate
  | 'WT'     // Withholding tax
  | 'P';     // Provisional tax

/**
 * Pay frequency options
 */
export type PayFrequency = 
  | 'WEEKLY' 
  | 'FORTNIGHTLY' 
  | 'FOUR_WEEKLY'
  | 'MONTHLY';

/**
 * Employment type
 */
export type EmploymentType = 
  | 'FULL_TIME' 
  | 'PART_TIME' 
  | 'CASUAL' 
  | 'FIXED_TERM';

/**
 * Contract type
 */
export type ContractType = 
  | 'PERMANENT' 
  | 'FIXED_TERM' 
  | 'CASUAL' 
  | 'CONTRACTOR';

// ============================================
// EARNINGS BREAKDOWN
// ============================================

/**
 * Regular earnings (standard hours)
 */
export interface RegularEarnings {
  /** Regular hours worked (non-overtime) */
  hours: number;
  /** Regular hourly rate (NZD) */
  rate: number;
  /** Regular pay = hours × rate */
  pay: number;
}

/**
 * Overtime earnings (NZ Employment Relations Act 2000 compliance)
 */
export interface OvertimeEarnings {
  /** Overtime hours worked */
  hours: number;
  /** Overtime base rate (usually same as regular rate) */
  rate: number;
  /** Overtime multiplier applied (1.5x, 2.0x, etc.) */
  multiplier: number;
  /** Overtime pay = hours × rate × multiplier */
  pay: number;
  /** Reason for overtime (required for audit trail) */
  reason?: string;
  /** Overtime type (MANUAL, AUTO_DAILY, AUTO_WEEKLY, etc.) */
  type?: string;
}

/**
 * Public holiday premium (Holidays Act 2003 compliance)
 */
export interface PublicHolidayEarnings {
  /** Hours worked on public holidays */
  hours: number;
  /** Rate for public holiday work */
  rate: number;
  /** Public holiday multiplier (minimum 1.5x, typically 2.0x) */
  multiplier: number;
  /** Public holiday pay = hours × rate × multiplier */
  pay: number;
  /** Name of public holiday worked (Christmas, Waitangi Day, etc.) */
  holidayName?: string;
  /** Alternative day granted for working public holiday */
  alternativeDayGranted: boolean;
}

/**
 * Other earnings (allowances, bonuses, etc.)
 */
export interface OtherEarnings {
  /** Allowances (travel, uniform, tools) */
  allowances: number;
  /** Bonuses paid this period */
  bonuses: number;
  /** Commission earned */
  commission: number;
  /** Reimbursements (non-taxable) */
  reimbursements: number;
}

/**
 * Complete earnings breakdown
 */
export interface EarningsBreakdown {
  regular: RegularEarnings;
  overtime: OvertimeEarnings;
  publicHoliday: PublicHolidayEarnings;
  other: OtherEarnings;
}

// ============================================
// DEDUCTIONS BREAKDOWN
// ============================================

/**
 * PAYE deductions (Tax Administration Act 1994)
 */
export interface PAYEDeductions {
  /** PAYE tax deducted (calculated using IRD tax tables) */
  tax: number;
  /** ACC earner levy (1.46% of gross, capped at $142,283 annual) */
  accLevy: number;
  /** Tax rate applied (for audit purposes) */
  effectiveTaxRate?: number;
}

/**
 * Student loan deductions
 */
export interface StudentLoanDeductions {
  /** Student loan deduction (12% of earnings above $24,128 threshold) */
  deduction: number;
  /** Current student loan balance (if available) */
  balance?: number;
  /** Threshold applied ($464/week for 2024/25) */
  threshold?: number;
}

/**
 * KiwiSaver deductions (KiwiSaver Act 2006)
 */
export interface KiwiSaverDeductions {
  /** Employee KiwiSaver contribution (3%, 4%, 6%, 8%, 10% of gross) */
  employee: number;
  /** Employee contribution rate (e.g., 0.03 for 3%) */
  employeeRate: number;
  /** Employer KiwiSaver contribution (minimum 3% of gross) */
  employer: number;
  /** Employer contribution rate (e.g., 0.03 for 3%) */
  employerRate: number;
  /** ESCT (tax on employer contribution: 10.5%, 17.5%, 28%, 33%) */
  esct: number;
  /** KiwiSaver opted out */
  optedOut: boolean;
}

/**
 * Other deductions
 */
export interface OtherDeductions {
  /** Union fees */
  unionFees: number;
  /** Insurance deductions */
  insurance: number;
  /** Childcare levy */
  childcareLevy: number;
  /** Other deductions (garnishments, etc.) */
  other: number;
}

/**
 * Complete deductions breakdown
 */
export interface DeductionsBreakdown {
  paye: PAYEDeductions;
  studentLoan: StudentLoanDeductions;
  kiwiSaver: KiwiSaverDeductions;
  other: OtherDeductions;
}

// ============================================
// LEAVE BALANCES
// ============================================

/**
 * Annual leave balance (Holidays Act 2003)
 */
export interface AnnualLeaveBalance {
  /** Annual leave accrued this period (hours) */
  accrued: number;
  /** Annual leave taken this period (hours) */
  taken: number;
  /** Annual leave balance (hours) */
  balance: number;
  /** Accrual rate (usually 8% of gross earnings) */
  accrualRate?: number;
}

/**
 * Sick leave balance (Holidays Act 2003)
 */
export interface SickLeaveBalance {
  /** Sick leave accrued this period (hours) */
  accrued: number;
  /** Sick leave taken this period (hours) */
  taken: number;
  /** Sick leave balance (hours) */
  balance: number;
  /** Maximum sick leave per year (80 hours = 10 days) */
  annualEntitlement?: number;
}

/**
 * Alternative days balance (for public holidays worked)
 */
export interface AlternativeDaysBalance {
  /** Alternative days balance */
  balance: number;
  /** Alternative days granted this period */
  granted?: number;
  /** Alternative days taken this period */
  taken?: number;
}

/**
 * Complete leave balances
 */
export interface LeaveBalances {
  annualLeave: AnnualLeaveBalance;
  sickLeave: SickLeaveBalance;
  alternativeDays: AlternativeDaysBalance;
}

// ============================================
// PAY TOTALS
// ============================================

/**
 * Payroll totals
 */
export interface PayrollTotals {
  /** Total hours worked (regular + overtime + public holiday) */
  totalHours: number;
  /** Gross pay before deductions */
  grossPay: number;
  /** Total deductions (PAYE + ACC + KiwiSaver + SL + others) */
  totalDeductions: number;
  /** Net pay = grossPay - totalDeductions */
  netPay: number;
  /** Employer cost (gross + employer KiwiSaver + ESCT) */
  employerCost: number;
}

// ============================================
// METADATA
// ============================================

/**
 * Employee metadata
 */
export interface EmployeeMetadata {
  /** Department name */
  department?: string;
  /** Location/site name */
  location?: string;
  /** Job role/title */
  jobRole?: string;
  /** Bank account number (for direct deposit) */
  bankAccount?: string;
  /** Employment type (FULL_TIME, PART_TIME, CASUAL) */
  employmentType?: EmploymentType;
  /** Contract type (PERMANENT, FIXED_TERM, CASUAL) */
  contractType?: ContractType;
}

/**
 * Export metadata
 */
export interface ExportMetadata {
  /** Timesheet IDs included in this export */
  timesheetIds: string[];
  /** Export timestamp (ISO 8601) */
  exportedAt: string;
  /** User who generated export */
  exportedBy: string;
  /** Export version/format version */
  exportVersion: string;
  /** Validation warnings (if any) */
  warnings?: string[];
}

// ============================================
// MAIN EXPORT RECORD
// ============================================

/**
 * NZ IRD-Compliant Payroll Export Record
 * 
 * This is the primary interface for a single employee's payroll record
 * in an export file. It contains all information required for:
 * - IRD Payday Filing
 * - Wage record keeping (Employment Relations Act 2000)
 * - Holiday and leave compliance (Holidays Act 2003)
 * - KiwiSaver reporting (KiwiSaver Act 2006)
 */
export interface NZPayrollExportRecord {
  // ============================================
  // EMPLOYEE IDENTIFICATION (Required by IRD)
  // ============================================
  
  /** Internal employee ID */
  employeeId: string;
  
  /** IRD Number (8-9 digits, validated with checksum algorithm) */
  irdNumber: string;
  
  /** Full legal name matching IRD records */
  employeeName: string;
  
  /** Employee email for electronic payslip */
  employeeEmail: string;
  
  /** NZ Tax Code (M, ME, M SL, SB, S, etc.) */
  taxCode: NZTaxCode;
  
  /** Date of birth (YYYY-MM-DD) for PAYE verification */
  dateOfBirth?: string;
  
  // ============================================
  // EARNINGS (Structured)
  // ============================================
  
  /** Earnings breakdown */
  earnings: EarningsBreakdown;
  
  // ============================================
  // DEDUCTIONS (Structured)
  // ============================================
  
  /** Deductions breakdown */
  deductions: DeductionsBreakdown;
  
  // ============================================
  // LEAVE BALANCES (Structured)
  // ============================================
  
  /** Leave balances */
  leaveBalances: LeaveBalances;
  
  // ============================================
  // PAY TOTALS
  // ============================================
  
  /** Payroll totals */
  totals: PayrollTotals;
  
  // ============================================
  // PAY PERIOD INFORMATION
  // ============================================
  
  /** Pay period start date (ISO 8601: YYYY-MM-DD) */
  payPeriodStart: string;
  
  /** Pay period end date (ISO 8601: YYYY-MM-DD) */
  payPeriodEnd: string;
  
  /** Actual payment date (ISO 8601: YYYY-MM-DD) */
  paymentDate: string;
  
  /** Pay frequency (WEEKLY, FORTNIGHTLY, MONTHLY) */
  payFrequency: PayFrequency;
  
  // ============================================
  // COMPANY INFORMATION
  // ============================================
  
  /** Company ID */
  companyId: string;
  
  /** Company name */
  companyName: string;
  
  /** Company IRD number */
  companyIrdNumber?: string;
  
  // ============================================
  // EMPLOYEE METADATA
  // ============================================
  
  /** Employee metadata (department, location, role, etc.) */
  metadata: EmployeeMetadata & ExportMetadata;
}

// ============================================
// FLAT EXPORT RECORD (for CSV compatibility)
// ============================================

/**
 * Flat payroll export record (for CSV exports)
 * 
 * This is a flattened version of NZPayrollExportRecord
 * suitable for CSV/Excel exports where nested objects
 * are not supported.
 */
export interface FlatPayrollExportRecord {
  // Employee Identification
  employeeId: string;
  irdNumber: string;
  employeeName: string;
  employeeEmail: string;
  taxCode: NZTaxCode;
  dateOfBirth?: string;
  
  // Regular Earnings
  regularHours: number;
  regularRate: number;
  regularPay: number;
  
  // Overtime Earnings
  overtimeHours: number;
  overtimeRate: number;
  overtimeMultiplier: number;
  overtimePay: number;
  overtimeReason?: string;
  
  // Public Holiday Premium
  publicHolidayHours: number;
  publicHolidayRate: number;
  publicHolidayMultiplier: number;
  publicHolidayPay: number;
  publicHolidayName?: string;
  alternativeDayGranted: boolean;
  
  // Other Earnings
  allowances: number;
  bonuses: number;
  commission: number;
  reimbursements: number;
  
  // PAYE Deductions
  payeTax: number;
  accLevyDeduction: number;
  
  // Student Loan
  studentLoanDeduction: number;
  studentLoanBalance?: number;
  
  // KiwiSaver
  kiwiSaverEmployee: number;
  kiwiSaverEmployeeRate: number;
  kiwiSaverEmployer: number;
  kiwiSaverEmployerRate: number;
  esctDeduction: number;
  kiwiSaverOptedOut: boolean;
  
  // Other Deductions
  unionFees: number;
  insuranceDeductions: number;
  childcareLevy: number;
  otherDeductions: number;
  
  // Leave Balances
  annualLeaveAccrued: number;
  annualLeaveTaken: number;
  annualLeaveBalance: number;
  sickLeaveAccrued: number;
  sickLeaveTaken: number;
  sickLeaveBalance: number;
  alternativeDaysBalance: number;
  
  // Totals
  totalHours: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  employerCost: number;
  
  // Pay Period
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
  payFrequency: PayFrequency;
  
  // Company
  companyId: string;
  companyName: string;
  companyIrdNumber?: string;
  
  // Metadata
  department?: string;
  location?: string;
  jobRole?: string;
  bankAccount?: string;
  employmentType?: string;
  contractType?: string;
  
  // Audit
  exportedAt: string;
  exportedBy: string;
  exportVersion: string;
  timesheetIds: string;
  warnings?: string;
}

// ============================================
// EXPORT OPTIONS
// ============================================

/**
 * Payroll export options
 */
export interface PayrollExportOptions {
  /** Export file format */
  format: 'CSV' | 'EXCEL' | 'JSON' | 'IRD_PAYDAY_FILE';
  
  /** Include overtime breakdown */
  includeOvertimeBreakdown: boolean;
  
  /** Include tax calculations */
  includeTaxCalculations: boolean;
  
  /** Include leave balances */
  includeLeaveBalances: boolean;
  
  /** Include employer costs */
  includeEmployerCosts: boolean;
  
  /** Company ID for filtering */
  companyId: string;
  
  /** Pay period start date */
  periodStart: Date;
  
  /** Pay period end date */
  periodEnd: Date;
  
  /** Payment date */
  paymentDate: Date;
  
  /** Filter by department */
  departmentIds?: string[];
  
  /** Filter by location */
  locationIds?: string[];
  
  /** Include only specific employees */
  employeeIds?: string[];
  
  /** Exclude specific employees */
  excludeEmployeeIds?: string[];
}

/**
 * Export result
 */
export interface PayrollExportResult {
  /** Export data (string or Buffer depending on format) */
  data: string | Buffer;
  
  /** Filename */
  filename: string;
  
  /** MIME type */
  mimeType: string;
  
  /** Number of records exported */
  recordCount: number;
  
  /** Export metadata */
  metadata: {
    exportedAt: string;
    exportedBy: string;
    companyId: string;
    payPeriodStart: string;
    payPeriodEnd: string;
  };
  
  /** Validation warnings */
  warnings: string[];
  
  /** Validation errors (if any) */
  errors: string[];
}

// ============================================
// VALIDATION SCHEMAS (ZOD)
// ============================================

/**
 * IRD Number Validation
 * 8-9 digits with checksum algorithm
 */
export const irdNumberSchema = z
  .string()
  .regex(/^\d{8,9}$/, 'IRD number must be 8-9 digits')
  .refine(validateIRDChecksum, {
    message: 'Invalid IRD number checksum',
  });

/**
 * NZ Tax Code Validation
 */
export const taxCodeSchema = z.enum([
  'M', 'ME', 'M SL', 'ME SL',
  'SB', 'SB SL', 'S', 'S SL',
  'SH', 'SH SL', 'ST', 'ST SL',
  'SA', 'SA SL', 'SL',
  'CAE', 'EDW', 'ND', 'NS', 'STC', 'WT', 'P'
]);

/**
 * Payroll Export Record Validation
 */
export const payrollExportSchema = z.object({
  // Employee Identification
  employeeId: z.string().min(1),
  irdNumber: irdNumberSchema,
  employeeName: z.string().min(1),
  employeeEmail: z.string().email(),
  taxCode: taxCodeSchema,
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Earnings (simplified validation)
  earnings: z.object({
    regular: z.object({
      hours: z.number().min(0).max(744), // Max hours per month
      rate: z.number().min(23.15), // NZ minimum wage 2024
      pay: z.number().min(0),
    }),
    overtime: z.object({
      hours: z.number().min(0).max(100),
      rate: z.number().min(23.15),
      multiplier: z.number().min(1.0).max(3.0),
      pay: z.number().min(0),
    }),
    publicHoliday: z.object({
      hours: z.number().min(0).max(24),
      rate: z.number().min(23.15),
      multiplier: z.number().min(1.5).max(3.0),
      pay: z.number().min(0),
    }),
  }),
  
  // Deductions
  deductions: z.object({
    paye: z.object({
      tax: z.number().min(0),
      accLevy: z.number().min(0),
    }),
    kiwiSaver: z.object({
      employee: z.number().min(0),
      employer: z.number().min(0),
    }),
  }),
  
  // Totals
  totals: z.object({
    grossPay: z.number().min(0),
    totalDeductions: z.number().min(0),
    netPay: z.number().min(0),
  }),
  
  // Metadata
  payPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'FOUR_WEEKLY', 'MONTHLY']),
  companyId: z.string().min(1),
}).refine(
  (data) => Math.abs(data.totals.netPay - (data.totals.grossPay - data.totals.totalDeductions)) < 0.01,
  { message: 'Net pay must equal gross pay minus deductions' }
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * IRD Checksum Validation Algorithm
 * 
 * Reference: https://www.ird.govt.nz/managing-my-tax/ird-numbers
 */
export function validateIRDChecksum(irdNumber: string): boolean {
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const digits = irdNumber.padStart(9, '0').split('').map(Number);
  
  // Remove check digit
  const checkDigit = digits.pop()!;
  
  // Calculate weighted sum
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += digits[i] * weights[i];
  }
  
  // Calculate check digit
  const remainder = sum % 11;
  const calculatedCheck = remainder === 0 ? 0 : 11 - remainder;
  
  return calculatedCheck === checkDigit;
}

/**
 * Convert nested record to flat record for CSV export
 */
export function flattenPayrollRecord(record: NZPayrollExportRecord): FlatPayrollExportRecord {
  return {
    // Employee Identification
    employeeId: record.employeeId,
    irdNumber: record.irdNumber,
    employeeName: record.employeeName,
    employeeEmail: record.employeeEmail,
    taxCode: record.taxCode,
    dateOfBirth: record.dateOfBirth,
    
    // Regular Earnings
    regularHours: record.earnings.regular.hours,
    regularRate: record.earnings.regular.rate,
    regularPay: record.earnings.regular.pay,
    
    // Overtime Earnings
    overtimeHours: record.earnings.overtime.hours,
    overtimeRate: record.earnings.overtime.rate,
    overtimeMultiplier: record.earnings.overtime.multiplier,
    overtimePay: record.earnings.overtime.pay,
    overtimeReason: record.earnings.overtime.reason,
    
    // Public Holiday Premium
    publicHolidayHours: record.earnings.publicHoliday.hours,
    publicHolidayRate: record.earnings.publicHoliday.rate,
    publicHolidayMultiplier: record.earnings.publicHoliday.multiplier,
    publicHolidayPay: record.earnings.publicHoliday.pay,
    publicHolidayName: record.earnings.publicHoliday.holidayName,
    alternativeDayGranted: record.earnings.publicHoliday.alternativeDayGranted,
    
    // Other Earnings
    allowances: record.earnings.other.allowances,
    bonuses: record.earnings.other.bonuses,
    commission: record.earnings.other.commission,
    reimbursements: record.earnings.other.reimbursements,
    
    // PAYE Deductions
    payeTax: record.deductions.paye.tax,
    accLevyDeduction: record.deductions.paye.accLevy,
    
    // Student Loan
    studentLoanDeduction: record.deductions.studentLoan.deduction,
    studentLoanBalance: record.deductions.studentLoan.balance,
    
    // KiwiSaver
    kiwiSaverEmployee: record.deductions.kiwiSaver.employee,
    kiwiSaverEmployeeRate: record.deductions.kiwiSaver.employeeRate,
    kiwiSaverEmployer: record.deductions.kiwiSaver.employer,
    kiwiSaverEmployerRate: record.deductions.kiwiSaver.employerRate,
    esctDeduction: record.deductions.kiwiSaver.esct,
    kiwiSaverOptedOut: record.deductions.kiwiSaver.optedOut,
    
    // Other Deductions
    unionFees: record.deductions.other.unionFees,
    insuranceDeductions: record.deductions.other.insurance,
    childcareLevy: record.deductions.other.childcareLevy,
    otherDeductions: record.deductions.other.other,
    
    // Leave Balances
    annualLeaveAccrued: record.leaveBalances.annualLeave.accrued,
    annualLeaveTaken: record.leaveBalances.annualLeave.taken,
    annualLeaveBalance: record.leaveBalances.annualLeave.balance,
    sickLeaveAccrued: record.leaveBalances.sickLeave.accrued,
    sickLeaveTaken: record.leaveBalances.sickLeave.taken,
    sickLeaveBalance: record.leaveBalances.sickLeave.balance,
    alternativeDaysBalance: record.leaveBalances.alternativeDays.balance,
    
    // Totals
    totalHours: record.totals.totalHours,
    grossPay: record.totals.grossPay,
    totalDeductions: record.totals.totalDeductions,
    netPay: record.totals.netPay,
    employerCost: record.totals.employerCost,
    
    // Pay Period
    payPeriodStart: record.payPeriodStart,
    payPeriodEnd: record.payPeriodEnd,
    paymentDate: record.paymentDate,
    payFrequency: record.payFrequency,
    
    // Company
    companyId: record.companyId,
    companyName: record.companyName,
    companyIrdNumber: record.companyIrdNumber,
    
    // Metadata
    department: record.metadata.department,
    location: record.metadata.location,
    jobRole: record.metadata.jobRole,
    bankAccount: record.metadata.bankAccount,
    employmentType: record.metadata.employmentType,
    contractType: record.metadata.contractType,
    
    // Audit
    exportedAt: record.metadata.exportedAt,
    exportedBy: record.metadata.exportedBy,
    exportVersion: record.metadata.exportVersion,
    timesheetIds: record.metadata.timesheetIds.join(','),
    warnings: record.metadata.warnings?.join('; '),
  };
}
