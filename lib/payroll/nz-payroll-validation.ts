/**
 * NZ Payroll Validation Utilities
 * Complies with:
 * - Tax Administration Act 1994
 * - Employment Relations Act 2000
 * - KiwiSaver Act 2006
 * - Student Loan Scheme Act 2011
 */

import { TaxCode } from "@prisma/client";
import { isValidIrdNumber, normalizeIrdNumber } from "@/lib/utils";

// Valid KiwiSaver employee contribution rates
export const KIWISAVER_EMPLOYEE_RATES = [0, 0.03, 0.04, 0.06, 0.08, 0.10] as const;
export type KiwiSaverEmployeeRate = (typeof KIWISAVER_EMPLOYEE_RATES)[number];

// Minimum KiwiSaver employer contribution (3% required by law)
export const KIWISAVER_EMPLOYER_MIN_RATE = 0.03;

// Standard student loan deduction rate (as of 2024)
export const STUDENT_LOAN_STANDARD_RATE = 0.12;

// Student loan threshold (no deduction below this annual income)
export const STUDENT_LOAN_THRESHOLD = 24128; // $24,128 for 2024/2025 tax year

/**
 * Validates IRD number format and checksum
 */
export function validateIrdNumber(irdNumber: string | null | undefined): {
  valid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!irdNumber || irdNumber.trim() === "") {
    return { valid: false, error: "IRD number is required" };
  }

  const normalized = normalizeIrdNumber(irdNumber);
  
  if (normalized.length < 8 || normalized.length > 9) {
    return {
      valid: false,
      error: "IRD number must be 8 or 9 digits",
    };
  }

  if (!isValidIrdNumber(normalized)) {
    return {
      valid: false,
      error: "Invalid IRD number (checksum failed)",
    };
  }

  return { valid: true, normalized };
}

/**
 * Validates NZ tax code against approved list
 */
export function validateTaxCode(taxCode: string | null | undefined): {
  valid: boolean;
  error?: string;
  normalized?: TaxCode;
} {
  if (!taxCode || taxCode.trim() === "") {
    return { valid: false, error: "Tax code is required" };
  }

  const upperCode = taxCode.trim().toUpperCase().replace(/\s+/g, "_");
  
  if (!Object.values(TaxCode).includes(upperCode as TaxCode)) {
    return {
      valid: false,
      error: `Invalid tax code. Must be one of: ${Object.values(TaxCode).join(", ")}`,
    };
  }

  return { valid: true, normalized: upperCode as TaxCode };
}

/**
 * Validates KiwiSaver employee contribution rate
 */
export function validateKiwiSaverEmployeeRate(
  rate: number | null | undefined,
  isEnrolled: boolean
): {
  valid: boolean;
  error?: string;
} {
  if (!isEnrolled) {
    // If not enrolled, rate should be null or 0
    if (rate && rate !== 0) {
      return {
        valid: false,
        error: "KiwiSaver rate must be 0 or null when not enrolled",
      };
    }
    return { valid: true };
  }

  // If enrolled, rate is required
  if (rate === null || rate === undefined) {
    return {
      valid: false,
      error: "KiwiSaver rate is required when enrolled",
    };
  }

  // Must be one of the valid rates
  if (!KIWISAVER_EMPLOYEE_RATES.includes(rate as KiwiSaverEmployeeRate)) {
    return {
      valid: false,
      error: `KiwiSaver employee rate must be one of: ${KIWISAVER_EMPLOYEE_RATES.map(r => `${r * 100}%`).join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validates KiwiSaver employer contribution rate
 */
export function validateKiwiSaverEmployerRate(
  rate: number | null | undefined,
  isEnrolled: boolean
): {
  valid: boolean;
  error?: string;
} {
  if (!isEnrolled) {
    // If not enrolled, rate should be null or 0
    if (rate && rate !== 0) {
      return {
        valid: false,
        error: "KiwiSaver employer rate must be 0 or null when employee not enrolled",
      };
    }
    return { valid: true };
  }

  // If enrolled, rate is required and must be at least 3%
  if (rate === null || rate === undefined) {
    return {
      valid: false,
      error: "KiwiSaver employer rate is required when employee is enrolled",
    };
  }

  if (rate < KIWISAVER_EMPLOYER_MIN_RATE) {
    return {
      valid: false,
      error: `KiwiSaver employer rate must be at least ${KIWISAVER_EMPLOYER_MIN_RATE * 100}% (minimum required by law)`,
    };
  }

  if (rate > 1.0) {
    return {
      valid: false,
      error: "KiwiSaver employer rate cannot exceed 100%",
    };
  }

  return { valid: true };
}

/**
 * Validates student loan rate
 */
export function validateStudentLoanRate(
  rate: number | null | undefined,
  hasLoan: boolean
): {
  valid: boolean;
  error?: string;
  defaultRate?: number;
} {
  if (!hasLoan) {
    // If no loan, rate should be null or 0
    if (rate && rate !== 0) {
      return {
        valid: false,
        error: "Student loan rate must be 0 or null when employee has no student loan",
      };
    }
    return { valid: true };
  }

  // If has loan and no rate specified, use standard rate
  if (rate === null || rate === undefined) {
    return {
      valid: true,
      defaultRate: STUDENT_LOAN_STANDARD_RATE,
    };
  }

  // Validate range (0% to 20%, standard is 12%)
  if (rate < 0 || rate > 0.20) {
    return {
      valid: false,
      error: "Student loan rate must be between 0% and 20%",
    };
  }

  return { valid: true };
}

/**
 * Validates special tax rate
 */
export function validateSpecialTaxRate(
  rate: number | null | undefined,
  reason: string | null | undefined
): {
  valid: boolean;
  error?: string;
} {
  // Special tax rate is optional
  if (rate === null || rate === undefined) {
    return { valid: true };
  }

  // If special rate is set, must have a reason
  if (!reason || reason.trim() === "") {
    return {
      valid: false,
      error: "Tax exemption reason is required when using special tax rate",
    };
  }

  // Validate range (0% to 100%)
  if (rate < 0 || rate > 1.0) {
    return {
      valid: false,
      error: "Special tax rate must be between 0% and 100%",
    };
  }

  return { valid: true };
}

/**
 * Comprehensive validation for all NZ payroll data
 */
export interface NzPayrollData {
  irdNumber?: string | null;
  taxCode?: string | null;
  kiwiSaverEnrolled?: boolean;
  kiwiSaverEmployeeRate?: number | null;
  kiwiSaverEmployerRate?: number | null;
  hasStudentLoan?: boolean;
  studentLoanRate?: number | null;
  specialTaxRate?: number | null;
  taxExemptionReason?: string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  normalizedData?: Partial<NzPayrollData>;
}

export function validateNzPayrollData(data: NzPayrollData): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const normalizedData: Partial<NzPayrollData> = {};

  // Validate IRD number
  if (data.irdNumber) {
    const irdResult = validateIrdNumber(data.irdNumber);
    if (!irdResult.valid) {
      errors.irdNumber = irdResult.error!;
    } else {
      normalizedData.irdNumber = irdResult.normalized;
    }
  }

  // Validate tax code
  if (data.taxCode) {
    const taxCodeResult = validateTaxCode(data.taxCode);
    if (!taxCodeResult.valid) {
      errors.taxCode = taxCodeResult.error!;
    } else {
      normalizedData.taxCode = taxCodeResult.normalized;
    }
  }

  // Validate KiwiSaver
  const isKiwiSaverEnrolled = data.kiwiSaverEnrolled ?? false;
  const employeeRateResult = validateKiwiSaverEmployeeRate(
    data.kiwiSaverEmployeeRate,
    isKiwiSaverEnrolled
  );
  if (!employeeRateResult.valid) {
    errors.kiwiSaverEmployeeRate = employeeRateResult.error!;
  }

  const employerRateResult = validateKiwiSaverEmployerRate(
    data.kiwiSaverEmployerRate,
    isKiwiSaverEnrolled
  );
  if (!employerRateResult.valid) {
    errors.kiwiSaverEmployerRate = employerRateResult.error!;
  }

  // Validate student loan
  const hasLoan = data.hasStudentLoan ?? false;
  const loanRateResult = validateStudentLoanRate(data.studentLoanRate, hasLoan);
  if (!loanRateResult.valid) {
    errors.studentLoanRate = loanRateResult.error!;
  } else if (loanRateResult.defaultRate) {
    normalizedData.studentLoanRate = loanRateResult.defaultRate;
    warnings.studentLoanRate = `Using standard rate of ${loanRateResult.defaultRate * 100}%`;
  }

  // Validate special tax rate
  const specialTaxResult = validateSpecialTaxRate(
    data.specialTaxRate,
    data.taxExemptionReason
  );
  if (!specialTaxResult.valid) {
    errors.specialTaxRate = specialTaxResult.error!;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
    normalizedData,
  };
}

/**
 * Checks if payroll data is complete for export
 */
export function isPayrollDataComplete(data: NzPayrollData): {
  complete: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!data.irdNumber) {
    missing.push("IRD number");
  }
  if (!data.taxCode) {
    missing.push("Tax code");
  }

  // KiwiSaver enrollment status is optional, but if enrolled, need rate
  if (data.kiwiSaverEnrolled && !data.kiwiSaverEmployeeRate) {
    missing.push("KiwiSaver employee rate");
  }

  // Student loan status is optional, but if has loan, need rate
  if (data.hasStudentLoan && !data.studentLoanRate) {
    missing.push("Student loan rate");
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}
