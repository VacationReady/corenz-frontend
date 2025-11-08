/**
 * NZ Student Loan Deduction Calculator
 * 
 * Calculates student loan repayment deductions for employees
 * with student loans in New Zealand
 * 
 * References:
 * - https://www.ird.govt.nz/student-loans/student-loan-repayments
 * - https://www.studylink.govt.nz/starting-study/student-loans/student-loan-repayment.html
 * 
 * @version 1.0
 * @date 2024-11-08
 */

import { NZTaxCode } from '../../types/nz-payroll-export';
import { PayFrequency, PAY_FREQUENCY_MULTIPLIERS } from './paye-calculator';

// ============================================
// STUDENT LOAN CONSTANTS 2024/25
// ============================================

/**
 * Student Loan Deduction Rate
 * 12% of earnings above the threshold
 */
export const SL_DEDUCTION_RATE = 0.12; // 12%

/**
 * Annual repayment threshold for 2024/25 tax year
 * Effective from 1 April 2024
 */
export const SL_ANNUAL_THRESHOLD_2024_25 = 24128;

/**
 * Period-based thresholds (derived from annual)
 */
export const SL_WEEKLY_THRESHOLD = Math.round(SL_ANNUAL_THRESHOLD_2024_25 / 52); // $464
export const SL_FORTNIGHTLY_THRESHOLD = Math.round(SL_ANNUAL_THRESHOLD_2024_25 / 26); // $928
export const SL_FOUR_WEEKLY_THRESHOLD = Math.round(SL_ANNUAL_THRESHOLD_2024_25 / 13); // $1,856
export const SL_MONTHLY_THRESHOLD = Math.round(SL_ANNUAL_THRESHOLD_2024_25 / 12); // $2,011

// ============================================
// TYPES
// ============================================

export interface StudentLoanCalculationParams {
  /** Gross earnings for this pay period */
  grossEarnings: number;
  
  /** NZ tax code (must contain "SL" suffix) */
  taxCode: NZTaxCode;
  
  /** Pay frequency */
  payFrequency: PayFrequency;
  
  /** Current student loan balance (optional, for tracking) */
  loanBalance?: number;
}

export interface StudentLoanCalculationResult {
  /** Student loan deduction for this period */
  deduction: number;
  
  /** Deduction rate (always 12%) */
  rate: number;
  
  /** Threshold for this pay period */
  threshold: number;
  
  /** Earnings above threshold (taxable for student loan) */
  applicableEarnings: number;
  
  /** Whether tax code includes SL */
  hasStudentLoan: boolean;
  
  /** Updated loan balance (if provided) */
  remainingBalance?: number;
  
  /** Description */
  description: string;
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate student loan deduction for a pay period
 * 
 * @param params Calculation parameters
 * @returns Student loan calculation result
 */
export function calculateStudentLoanDeduction(
  params: StudentLoanCalculationParams
): StudentLoanCalculationResult {
  const {
    grossEarnings,
    taxCode,
    payFrequency,
    loanBalance,
  } = params;
  
  // Check if tax code includes SL suffix
  const hasStudentLoan = taxCode.includes('SL');
  
  // Validate inputs
  if (grossEarnings < 0) {
    throw new Error('Gross earnings cannot be negative');
  }
  
  if (!hasStudentLoan) {
    return {
      deduction: 0,
      rate: 0,
      threshold: 0,
      applicableEarnings: 0,
      hasStudentLoan: false,
      description: 'No student loan - tax code does not include SL',
    };
  }
  
  if (grossEarnings === 0) {
    return {
      deduction: 0,
      rate: SL_DEDUCTION_RATE,
      threshold: getPeriodThreshold(payFrequency),
      applicableEarnings: 0,
      hasStudentLoan: true,
      remainingBalance: loanBalance,
      description: 'No earnings',
    };
  }
  
  // Get period threshold
  const threshold = getPeriodThreshold(payFrequency);
  
  // Calculate applicable earnings (above threshold)
  const applicableEarnings = Math.max(0, grossEarnings - threshold);
  
  if (applicableEarnings === 0) {
    return {
      deduction: 0,
      rate: SL_DEDUCTION_RATE,
      threshold,
      applicableEarnings: 0,
      hasStudentLoan: true,
      remainingBalance: loanBalance,
      description: `Earnings below threshold ($${threshold})`,
    };
  }
  
  // Calculate deduction (12% of earnings above threshold)
  const deduction = Math.round(applicableEarnings * SL_DEDUCTION_RATE * 100) / 100;
  
  // Update loan balance if provided
  const remainingBalance = loanBalance !== undefined
    ? Math.max(0, loanBalance - deduction)
    : undefined;
  
  return {
    deduction,
    rate: SL_DEDUCTION_RATE,
    threshold,
    applicableEarnings,
    hasStudentLoan: true,
    remainingBalance,
    description: `12% of earnings above $${threshold} threshold`,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get threshold for pay period
 */
function getPeriodThreshold(payFrequency: PayFrequency): number {
  const thresholds: Record<PayFrequency, number> = {
    WEEKLY: SL_WEEKLY_THRESHOLD,
    FORTNIGHTLY: SL_FORTNIGHTLY_THRESHOLD,
    FOUR_WEEKLY: SL_FOUR_WEEKLY_THRESHOLD,
    MONTHLY: SL_MONTHLY_THRESHOLD,
  };
  
  return thresholds[payFrequency];
}

/**
 * Check if tax code includes student loan
 */
export function hasStudentLoanCode(taxCode: NZTaxCode): boolean {
  return taxCode.includes('SL');
}

/**
 * Calculate annual student loan deductions
 */
export function calculateAnnualStudentLoanDeduction(
  annualGross: number
): number {
  const applicableEarnings = Math.max(0, annualGross - SL_ANNUAL_THRESHOLD_2024_25);
  return Math.round(applicableEarnings * SL_DEDUCTION_RATE * 100) / 100;
}

/**
 * Estimate time to repay student loan
 */
export function estimateRepaymentPeriod(
  loanBalance: number,
  annualGross: number
): {
  years: number;
  months: number;
  annualDeduction: number;
} {
  if (annualGross <= SL_ANNUAL_THRESHOLD_2024_25) {
    return {
      years: Infinity,
      months: Infinity,
      annualDeduction: 0,
    };
  }
  
  const annualDeduction = calculateAnnualStudentLoanDeduction(annualGross);
  
  if (annualDeduction === 0) {
    return {
      years: Infinity,
      months: Infinity,
      annualDeduction: 0,
    };
  }
  
  const years = loanBalance / annualDeduction;
  const months = Math.ceil(years * 12);
  
  return {
    years: Math.ceil(years),
    months,
    annualDeduction,
  };
}

/**
 * Get student loan threshold information
 */
export function getStudentLoanThresholdInfo() {
  return {
    annualThreshold: SL_ANNUAL_THRESHOLD_2024_25,
    weeklyThreshold: SL_WEEKLY_THRESHOLD,
    fortnightlyThreshold: SL_FORTNIGHTLY_THRESHOLD,
    fourWeeklyThreshold: SL_FOUR_WEEKLY_THRESHOLD,
    monthlyThreshold: SL_MONTHLY_THRESHOLD,
    deductionRate: SL_DEDUCTION_RATE,
    deductionRatePercentage: `${(SL_DEDUCTION_RATE * 100).toFixed(0)}%`,
    effectiveFrom: '1 April 2024',
    description: 'Student Loan Thresholds 2024/25',
  };
}

/**
 * Validate student loan tax code
 * 
 * Ensures tax code is valid and includes SL suffix
 */
export function validateStudentLoanTaxCode(taxCode: NZTaxCode): {
  isValid: boolean;
  hasStudentLoan: boolean;
  message: string;
} {
  const hasStudentLoan = taxCode.includes('SL');
  
  if (!hasStudentLoan) {
    return {
      isValid: true,
      hasStudentLoan: false,
      message: 'Tax code does not include student loan',
    };
  }
  
  // Check if base tax code is valid
  const validBaseCodes = ['M', 'ME', 'SB', 'S', 'SH', 'ST', 'SA'];
  const baseCode = taxCode.replace(' SL', '');
  
  if (!validBaseCodes.includes(baseCode)) {
    return {
      isValid: false,
      hasStudentLoan: true,
      message: `Invalid tax code base: ${baseCode}`,
    };
  }
  
  return {
    isValid: true,
    hasStudentLoan: true,
    message: 'Valid student loan tax code',
  };
}

/**
 * Calculate weekly student loan deduction (for estimates)
 */
export function calculateWeeklyStudentLoanDeduction(
  weeklyGross: number
): number {
  if (weeklyGross <= SL_WEEKLY_THRESHOLD) {
    return 0;
  }
  
  const applicableEarnings = weeklyGross - SL_WEEKLY_THRESHOLD;
  return Math.round(applicableEarnings * SL_DEDUCTION_RATE * 100) / 100;
}

/**
 * Format student loan balance for display
 */
export function formatLoanBalance(balance: number): string {
  if (balance <= 0) {
    return 'Paid off';
  }
  
  return `$${balance.toLocaleString('en-NZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
