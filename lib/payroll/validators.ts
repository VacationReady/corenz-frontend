/**
 * NZ Payroll Validation Functions
 * 
 * Validates payroll data for IRD compliance before export
 * 
 * @version 1.0
 * @date 2024-11-08
 */

import { NZTaxCode } from '../../types/nz-payroll-export';

// ============================================
// VALIDATION RESULT TYPES
// ============================================

export interface ValidationError {
  field: string;
  message: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING';
  employeeId?: string;
  employeeName?: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  criticalErrors: ValidationError[];
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalEmployees: number;
    validEmployees: number;
    missingIRDNumbers: number;
    invalidTaxCodes: number;
    invalidIRDChecksums: number;
    negativeAmounts: number;
    excessiveOvertimeCount: number;
    missingKiwiSaverRates: number;
  };
}

export interface EmployeePayrollData {
  employeeId: string;
  employeeName: string;
  irdNumber?: string | null;
  taxCode?: NZTaxCode | null;
  grossPay: number;
  netPay: number;
  paye: number;
  totalDeductions: number;
  overtimeHours?: number;
  kiwiSaverEmployeeRate?: number | null;
  kiwiSaverEmployer?: number | null;
  hasStudentLoan?: boolean;
}

// ============================================
// IRD NUMBER VALIDATION
// ============================================

/**
 * Validate IRD number format and checksum
 * IRD numbers are 8 or 9 digits with a weighted checksum
 */
export function validateIRDNumber(irdNumber: string | undefined | null): {
  isValid: boolean;
  formatted?: string;
  error?: string;
} {
  if (!irdNumber) {
    return { isValid: false, error: 'IRD number is required' };
  }
  
  // Remove spaces and dashes
  const cleaned = irdNumber.replace(/[\s-]/g, '');
  
  // Check if numeric
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: 'IRD number must contain only digits' };
  }
  
  // Check length (8 or 9 digits)
  if (cleaned.length < 8 || cleaned.length > 9) {
    return { isValid: false, error: 'IRD number must be 8 or 9 digits' };
  }
  
  // Pad to 9 digits for checksum calculation
  const padded = cleaned.padStart(9, '0');
  
  // Validate checksum
  if (!validateIRDChecksum(padded)) {
    return { isValid: false, error: 'Invalid IRD number checksum' };
  }
  
  // Format: XXX-XXX-XXX
  const formatted = `${padded.slice(0, 3)}-${padded.slice(3, 6)}-${padded.slice(6, 9)}`;
  
  return { isValid: true, formatted };
}

/**
 * Validate IRD number checksum using weighted algorithm
 */
export function validateIRDChecksum(irdNumber: string): boolean {
  // IRD uses a weighted checksum algorithm
  // Weights: 3, 2, 7, 6, 5, 4, 3, 2
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const digits = irdNumber.split('').map(Number);
  
  // Calculate weighted sum
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * weights[i];
  }
  
  // Calculate check digit
  const remainder = sum % 11;
  let checkDigit: number;
  
  if (remainder === 0) {
    checkDigit = 0;
  } else {
    checkDigit = 11 - remainder;
  }
  
  // If check digit is 10, the IRD number is invalid
  if (checkDigit === 10) {
    return false;
  }
  
  // Compare with actual check digit (9th digit)
  return checkDigit === digits[8];
}

// ============================================
// TAX CODE VALIDATION
// ============================================

/**
 * Validate NZ tax code
 */
export function validateTaxCode(taxCode: string | undefined | null): {
  isValid: boolean;
  normalized?: NZTaxCode;
  error?: string;
  warnings?: string[];
} {
  if (!taxCode) {
    return { isValid: false, error: 'Tax code is required' };
  }
  
  const warnings: string[] = [];
  
  // Normalize (uppercase, trim)
  const normalized = taxCode.toUpperCase().trim();
  
  // Valid tax codes
  const validCodes: NZTaxCode[] = [
    'M', 'ME', 'M SL', 'ME SL',
    'SB', 'SB SL', 'S', 'S SL',
    'SH', 'SH SL', 'ST', 'ST SL',
    'SA', 'SA SL', 'SL',
    'CAE', 'EDW', 'ND', 'NS', 'STC', 'WT', 'P',
  ];
  
  if (!validCodes.includes(normalized as NZTaxCode)) {
    return { isValid: false, error: `Invalid tax code: ${taxCode}` };
  }
  
  // Check for common warnings
  if (normalized === 'ND') {
    warnings.push('ND (Non-declaration) tax code - ensure employee provides correct code');
  }
  
  if (normalized === 'ME' || normalized === 'ME SL') {
    warnings.push('ME tax code is for low earners (<$14,000/year)');
  }
  
  if (normalized.startsWith('S')) {
    warnings.push('Secondary tax code - ensure this is not primary employment');
  }
  
  return { isValid: true, normalized: normalized as NZTaxCode, warnings };
}

// ============================================
// PAYROLL CALCULATION VALIDATION
// ============================================

/**
 * Validate that Net Pay = Gross Pay - Deductions
 */
export function validateNetPayCalculation(
  grossPay: number,
  totalDeductions: number,
  netPay: number,
  tolerance: number = 0.02 // 2 cents tolerance for rounding
): {
  isValid: boolean;
  expected: number;
  actual: number;
  difference: number;
  error?: string;
} {
  const expected = grossPay - totalDeductions;
  const difference = Math.abs(netPay - expected);
  
  if (difference > tolerance) {
    return {
      isValid: false,
      expected: Math.round(expected * 100) / 100,
      actual: Math.round(netPay * 100) / 100,
      difference: Math.round(difference * 100) / 100,
      error: `Net pay mismatch: expected $${expected.toFixed(2)}, got $${netPay.toFixed(2)}`,
    };
  }
  
  return {
    isValid: true,
    expected: Math.round(expected * 100) / 100,
    actual: Math.round(netPay * 100) / 100,
    difference: Math.round(difference * 100) / 100,
  };
}

/**
 * Validate no negative amounts
 */
export function validateNoNegativeAmounts(amounts: Record<string, number>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const [field, amount] of Object.entries(amounts)) {
    if (amount < 0) {
      errors.push({
        field,
        message: `${field} cannot be negative: $${amount.toFixed(2)}`,
        severity: 'CRITICAL',
        value: amount,
      });
    }
  }
  
  return errors;
}

/**
 * Validate PAYE tax is reasonable for tax code
 */
export function validatePAYETax(
  grossPay: number,
  paye: number,
  taxCode: NZTaxCode
): {
  isValid: boolean;
  effectiveRate: number;
  expectedRange: { min: number; max: number };
  warning?: string;
} {
  const effectiveRate = grossPay > 0 ? paye / grossPay : 0;
  
  // Expected ranges by tax code
  const expectedRanges: Record<string, { min: number; max: number }> = {
    M: { min: 0.10, max: 0.40 },
    ME: { min: 0.10, max: 0.12 },
    'M SL': { min: 0.10, max: 0.40 },
    'ME SL': { min: 0.10, max: 0.12 },
    SB: { min: 0.10, max: 0.12 },
    S: { min: 0.17, max: 0.20 },
    SH: { min: 0.29, max: 0.32 },
    ND: { min: 0.44, max: 0.46 },
    WT: { min: 0.44, max: 0.46 },
  };
  
  const baseCode = taxCode.replace(' SL', '');
  const range = expectedRanges[baseCode] || { min: 0.05, max: 0.45 };
  
  if (effectiveRate < range.min || effectiveRate > range.max) {
    return {
      isValid: false,
      effectiveRate,
      expectedRange: range,
      warning: `PAYE rate ${(effectiveRate * 100).toFixed(1)}% outside expected range ${(range.min * 100).toFixed(0)}-${(range.max * 100).toFixed(0)}% for tax code ${taxCode}`,
    };
  }
  
  return {
    isValid: true,
    effectiveRate,
    expectedRange: range,
  };
}

/**
 * Validate overtime is not excessive (>20 hours/week)
 */
export function validateOvertimeHours(
  overtimeHours: number,
  regularHours: number
): {
  isValid: boolean;
  warning?: string;
} {
  if (overtimeHours > 20) {
    return {
      isValid: false,
      warning: `Excessive overtime: ${overtimeHours.toFixed(1)} hours (>20 hours/week may violate health & safety)`,
    };
  }
  
  if (overtimeHours > regularHours) {
    return {
      isValid: false,
      warning: `Overtime hours (${overtimeHours.toFixed(1)}) exceed regular hours (${regularHours.toFixed(1)})`,
    };
  }
  
  return { isValid: true };
}

// ============================================
// BATCH VALIDATION
// ============================================

/**
 * Validate payroll export for multiple employees
 */
export function validatePayrollExport(
  employees: EmployeePayrollData[]
): ValidationResult {
  const criticalErrors: ValidationError[] = [];
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  const summary = {
    totalEmployees: employees.length,
    validEmployees: 0,
    missingIRDNumbers: 0,
    invalidTaxCodes: 0,
    invalidIRDChecksums: 0,
    negativeAmounts: 0,
    excessiveOvertimeCount: 0,
    missingKiwiSaverRates: 0,
  };
  
  for (const employee of employees) {
    let employeeValid = true;
    
    // Validate IRD number
    const irdValidation = validateIRDNumber(employee.irdNumber);
    if (!irdValidation.isValid) {
      criticalErrors.push({
        field: 'irdNumber',
        message: irdValidation.error || 'Invalid IRD number',
        severity: 'CRITICAL',
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
      });
      summary.missingIRDNumbers++;
      employeeValid = false;
    }
    
    // Validate tax code
    const taxValidation = validateTaxCode(employee.taxCode);
    if (!taxValidation.isValid) {
      criticalErrors.push({
        field: 'taxCode',
        message: taxValidation.error || 'Invalid tax code',
        severity: 'CRITICAL',
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
      });
      summary.invalidTaxCodes++;
      employeeValid = false;
    } else if (taxValidation.warnings) {
      taxValidation.warnings.forEach(warning => {
        warnings.push({
          field: 'taxCode',
          message: warning,
          severity: 'WARNING',
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
        });
      });
    }
    
    // Validate net pay calculation
    const netPayValidation = validateNetPayCalculation(
      employee.grossPay,
      employee.totalDeductions,
      employee.netPay
    );
    if (!netPayValidation.isValid) {
      errors.push({
        field: 'netPay',
        message: netPayValidation.error || 'Net pay calculation error',
        severity: 'ERROR',
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
      });
      employeeValid = false;
    }
    
    // Validate no negative amounts
    const negativeValidation = validateNoNegativeAmounts({
      grossPay: employee.grossPay,
      netPay: employee.netPay,
      paye: employee.paye,
    });
    if (negativeValidation.length > 0) {
      negativeValidation.forEach(error => {
        criticalErrors.push({
          ...error,
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
        });
      });
      summary.negativeAmounts++;
      employeeValid = false;
    }
    
    // Validate PAYE tax
    if (employee.taxCode && taxValidation.isValid) {
      const payeValidation = validatePAYETax(
        employee.grossPay,
        employee.paye,
        taxValidation.normalized!
      );
      if (!payeValidation.isValid && payeValidation.warning) {
        warnings.push({
          field: 'paye',
          message: payeValidation.warning,
          severity: 'WARNING',
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
        });
      }
    }
    
    // Validate overtime hours
    if (employee.overtimeHours && employee.overtimeHours > 0) {
      const overtimeValidation = validateOvertimeHours(
        employee.overtimeHours,
        40 // Assume 40 regular hours per week
      );
      if (!overtimeValidation.isValid && overtimeValidation.warning) {
        warnings.push({
          field: 'overtimeHours',
          message: overtimeValidation.warning,
          severity: 'WARNING',
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
        });
        summary.excessiveOvertimeCount++;
      }
    }
    
    // Validate KiwiSaver rates
    if (employee.kiwiSaverEmployer && employee.kiwiSaverEmployer > 0) {
      if (!employee.kiwiSaverEmployeeRate) {
        warnings.push({
          field: 'kiwiSaverEmployeeRate',
          message: 'KiwiSaver employer contribution present but employee rate missing',
          severity: 'WARNING',
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
        });
        summary.missingKiwiSaverRates++;
      }
    }
    
    if (employeeValid) {
      summary.validEmployees++;
    }
  }
  
  return {
    isValid: criticalErrors.length === 0 && errors.length === 0,
    criticalErrors,
    errors,
    warnings,
    summary,
  };
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push('=== PAYROLL VALIDATION REPORT ===\n');
  lines.push(`Total Employees: ${result.summary.totalEmployees}`);
  lines.push(`Valid Employees: ${result.summary.validEmployees}`);
  lines.push(`Overall Status: ${result.isValid ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  if (result.criticalErrors.length > 0) {
    lines.push(`🔴 CRITICAL ERRORS (${result.criticalErrors.length}):`);
    result.criticalErrors.forEach((error, i) => {
      lines.push(`  ${i + 1}. ${error.employeeName} - ${error.field}: ${error.message}`);
    });
    lines.push('');
  }
  
  if (result.errors.length > 0) {
    lines.push(`🟠 ERRORS (${result.errors.length}):`);
    result.errors.forEach((error, i) => {
      lines.push(`  ${i + 1}. ${error.employeeName} - ${error.field}: ${error.message}`);
    });
    lines.push('');
  }
  
  if (result.warnings.length > 0) {
    lines.push(`⚠️  WARNINGS (${result.warnings.length}):`);
    result.warnings.forEach((warning, i) => {
      lines.push(`  ${i + 1}. ${warning.employeeName} - ${warning.field}: ${warning.message}`);
    });
    lines.push('');
  }
  
  lines.push('=== SUMMARY ===');
  lines.push(`Missing IRD Numbers: ${result.summary.missingIRDNumbers}`);
  lines.push(`Invalid Tax Codes: ${result.summary.invalidTaxCodes}`);
  lines.push(`Negative Amounts: ${result.summary.negativeAmounts}`);
  lines.push(`Excessive Overtime: ${result.summary.excessiveOvertimeCount}`);
  
  return lines.join('\n');
}
