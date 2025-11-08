/**
 * NZ KiwiSaver Calculator
 * 
 * Calculates KiwiSaver employee and employer contributions,
 * plus ESCT (Employer Superannuation Contribution Tax)
 * 
 * References:
 * - https://www.kiwisaver.govt.nz/
 * - https://www.ird.govt.nz/kiwisaver
 * - https://www.ird.govt.nz/employing-staff/withholding-taxes-from-employees/esct
 * 
 * @version 1.0
 * @date 2024-11-08
 */

// ============================================
// KIWISAVER CONSTANTS
// ============================================

/**
 * Valid employee KiwiSaver contribution rates
 * Employees can choose 3%, 4%, 6%, 8%, or 10%
 */
export const VALID_EMPLOYEE_RATES = [0.03, 0.04, 0.06, 0.08, 0.10] as const;

/**
 * Minimum employer contribution rate
 * Employers must contribute at least 3%
 */
export const MINIMUM_EMPLOYER_RATE = 0.03;

/**
 * Valid ESCT rates (based on employee's previous year's income)
 * ESCT is tax on the employer contribution
 */
export const VALID_ESCT_RATES = [0.105, 0.175, 0.28, 0.33] as const;

/**
 * ESCT thresholds (previous year's salary + KiwiSaver)
 */
export const ESCT_THRESHOLDS = [
  { threshold: 16800, rate: 0.105, description: 'Up to $16,800' },
  { threshold: 57600, rate: 0.175, description: '$16,801 to $57,600' },
  { threshold: 84000, rate: 0.28, description: '$57,601 to $84,000' },
  { threshold: Infinity, rate: 0.33, description: 'Over $84,000' },
] as const;

// ============================================
// TYPES
// ============================================

export type EmployeeRate = typeof VALID_EMPLOYEE_RATES[number];
export type ESCTRate = typeof VALID_ESCT_RATES[number];

export interface KiwiSaverCalculationParams {
  /** Gross earnings for this pay period (before tax) */
  grossEarnings: number;
  
  /** Employee contribution rate (0.03, 0.04, 0.06, 0.08, 0.10) */
  employeeRate: number;
  
  /** Employer contribution rate (minimum 0.03) */
  employerRate: number;
  
  /** ESCT rate on employer contribution */
  esctRate: number;
  
  /** Whether employee has opted out of KiwiSaver */
  optedOut?: boolean;
  
  /** Previous year's income (for ESCT validation) */
  previousYearIncome?: number;
}

export interface KiwiSaverCalculationResult {
  /** Employee contribution (deducted from gross pay) */
  employeeContribution: number;
  
  /** Employer contribution (not deducted from employee) */
  employerContribution: number;
  
  /** ESCT on employer contribution */
  esct: number;
  
  /** Total employer cost (employer contribution + ESCT) */
  totalEmployerCost: number;
  
  /** Employee rate used */
  employeeRate: number;
  
  /** Employer rate used */
  employerRate: number;
  
  /** ESCT rate used */
  esctRate: number;
  
  /** Whether employee is opted out */
  optedOut: boolean;
  
  /** Description */
  description: string;
  
  /** Warnings (if any) */
  warnings: string[];
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate KiwiSaver contributions and ESCT
 * 
 * @param params Calculation parameters
 * @returns KiwiSaver calculation result
 */
export function calculateKiwiSaver(
  params: KiwiSaverCalculationParams
): KiwiSaverCalculationResult {
  const {
    grossEarnings,
    employeeRate,
    employerRate,
    esctRate,
    optedOut = false,
    previousYearIncome,
  } = params;
  
  const warnings: string[] = [];
  
  // Validate inputs
  if (grossEarnings < 0) {
    throw new Error('Gross earnings cannot be negative');
  }
  
  // Validate rates
  if (!VALID_EMPLOYEE_RATES.includes(employeeRate as EmployeeRate)) {
    warnings.push(`Invalid employee rate ${employeeRate}. Must be 3%, 4%, 6%, 8%, or 10%`);
  }
  
  if (employerRate < MINIMUM_EMPLOYER_RATE) {
    warnings.push(`Employer rate ${employerRate} is below minimum ${MINIMUM_EMPLOYER_RATE}`);
  }
  
  if (!VALID_ESCT_RATES.includes(esctRate as ESCTRate)) {
    warnings.push(`Invalid ESCT rate ${esctRate}. Must be 10.5%, 17.5%, 28%, or 33%`);
  }
  
  // Validate ESCT rate against previous year income
  if (previousYearIncome !== undefined) {
    const recommendedESCT = getRecommendedESCTRate(previousYearIncome);
    if (Math.abs(recommendedESCT - esctRate) > 0.001) {
      warnings.push(
        `ESCT rate ${(esctRate * 100).toFixed(1)}% may be incorrect for income $${previousYearIncome}. ` +
        `Recommended rate: ${(recommendedESCT * 100).toFixed(1)}%`
      );
    }
  }
  
  // If opted out or no earnings, return zero contributions
  if (optedOut || grossEarnings === 0) {
    return {
      employeeContribution: 0,
      employerContribution: 0,
      esct: 0,
      totalEmployerCost: 0,
      employeeRate,
      employerRate,
      esctRate,
      optedOut: true,
      description: optedOut ? 'Employee opted out of KiwiSaver' : 'No earnings',
      warnings,
    };
  }
  
  // Calculate contributions
  const employeeContribution = Math.round(grossEarnings * employeeRate * 100) / 100;
  const employerContribution = Math.round(grossEarnings * employerRate * 100) / 100;
  const esct = Math.round(employerContribution * esctRate * 100) / 100;
  const totalEmployerCost = employerContribution + esct;
  
  return {
    employeeContribution,
    employerContribution,
    esct,
    totalEmployerCost,
    employeeRate,
    employerRate,
    esctRate,
    optedOut: false,
    description: `KiwiSaver: Employee ${(employeeRate * 100).toFixed(0)}%, Employer ${(employerRate * 100).toFixed(0)}%`,
    warnings,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get recommended ESCT rate based on previous year's income
 */
export function getRecommendedESCTRate(previousYearIncome: number): ESCTRate {
  for (const threshold of ESCT_THRESHOLDS) {
    if (previousYearIncome <= threshold.threshold) {
      return threshold.rate as ESCTRate;
    }
  }
  return 0.33; // Default to highest
}

/**
 * Get ESCT rate description
 */
export function getESCTRateDescription(rate: ESCTRate): string {
  const threshold = ESCT_THRESHOLDS.find(t => Math.abs(t.rate - rate) < 0.001);
  return threshold ? threshold.description : 'Unknown threshold';
}

/**
 * Validate employee KiwiSaver rate
 */
export function isValidEmployeeRate(rate: number): boolean {
  return VALID_EMPLOYEE_RATES.includes(rate as EmployeeRate);
}

/**
 * Validate employer KiwiSaver rate
 */
export function isValidEmployerRate(rate: number): boolean {
  return rate >= MINIMUM_EMPLOYER_RATE && rate <= 0.20; // Max 20% is reasonable
}

/**
 * Validate ESCT rate
 */
export function isValidESCTRate(rate: number): boolean {
  return VALID_ESCT_RATES.includes(rate as ESCTRate);
}

/**
 * Calculate annual KiwiSaver contributions
 */
export function calculateAnnualKiwiSaver(
  annualGross: number,
  employeeRate: number,
  employerRate: number,
  esctRate: number
): {
  employeeContribution: number;
  employerContribution: number;
  esct: number;
  totalEmployerCost: number;
} {
  const employeeContribution = Math.round(annualGross * employeeRate * 100) / 100;
  const employerContribution = Math.round(annualGross * employerRate * 100) / 100;
  const esct = Math.round(employerContribution * esctRate * 100) / 100;
  const totalEmployerCost = employerContribution + esct;
  
  return {
    employeeContribution,
    employerContribution,
    esct,
    totalEmployerCost,
  };
}

/**
 * Calculate KiwiSaver balance projection
 */
export function projectKiwiSaverBalance(
  currentBalance: number,
  annualGross: number,
  employeeRate: number,
  employerRate: number,
  years: number,
  annualReturn: number = 0.05 // 5% default return
): {
  finalBalance: number;
  totalContributions: number;
  totalReturns: number;
  yearByYear: Array<{
    year: number;
    contributions: number;
    returns: number;
    balance: number;
  }>;
} {
  const annualContributions = annualGross * (employeeRate + employerRate);
  let balance = currentBalance;
  const yearByYear = [];
  
  for (let year = 1; year <= years; year++) {
    const yearReturns = balance * annualReturn;
    balance = balance + annualContributions + yearReturns;
    
    yearByYear.push({
      year,
      contributions: annualContributions,
      returns: yearReturns,
      balance: Math.round(balance * 100) / 100,
    });
  }
  
  const totalContributions = annualContributions * years;
  const totalReturns = balance - currentBalance - totalContributions;
  
  return {
    finalBalance: Math.round(balance * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    totalReturns: Math.round(totalReturns * 100) / 100,
    yearByYear,
  };
}

/**
 * Get KiwiSaver rate options for UI
 */
export function getEmployeeRateOptions(): Array<{
  value: number;
  label: string;
  description: string;
}> {
  return VALID_EMPLOYEE_RATES.map(rate => ({
    value: rate,
    label: `${(rate * 100).toFixed(0)}%`,
    description: `${(rate * 100).toFixed(0)}% of gross earnings`,
  }));
}

/**
 * Get ESCT rate options for UI
 */
export function getESCTRateOptions(): Array<{
  value: number;
  label: string;
  description: string;
}> {
  return ESCT_THRESHOLDS.map(threshold => ({
    value: threshold.rate,
    label: `${(threshold.rate * 100).toFixed(1)}%`,
    description: threshold.description,
  }));
}

/**
 * Calculate total KiwiSaver cost to employer
 */
export function calculateEmployerKiwiSaverCost(
  grossEarnings: number,
  employerRate: number,
  esctRate: number
): number {
  const employerContribution = grossEarnings * employerRate;
  const esct = employerContribution * esctRate;
  return Math.round((employerContribution + esct) * 100) / 100;
}

/**
 * Format KiwiSaver amount for display
 */
export function formatKiwiSaverAmount(amount: number): string {
  return `$${amount.toLocaleString('en-NZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Get KiwiSaver information
 */
export function getKiwiSaverInfo() {
  return {
    validEmployeeRates: VALID_EMPLOYEE_RATES,
    minimumEmployerRate: MINIMUM_EMPLOYER_RATE,
    validESCTRates: VALID_ESCT_RATES,
    esctThresholds: ESCT_THRESHOLDS,
    description: 'KiwiSaver is NZ voluntary retirement savings scheme',
    employeeRateChoices: '3%, 4%, 6%, 8%, or 10%',
    employerMinimum: 'Minimum 3% employer contribution',
    optOut: 'Employees can opt out after 2-8 weeks',
  };
}
