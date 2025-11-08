/**
 * NZ Leave Accrual Calculator
 * 
 * Calculates annual leave and sick leave accruals
 * in compliance with NZ Holidays Act 2003
 * 
 * References:
 * - Holidays Act 2003
 * - https://www.employment.govt.nz/leave-and-holidays/annual-holidays/
 * - https://www.employment.govt.nz/leave-and-holidays/sick-leave/
 * 
 * @version 1.0
 * @date 2024-11-08
 */

// ============================================
// LEAVE CONSTANTS (Holidays Act 2003)
// ============================================

/**
 * Annual Leave Entitlement
 * Minimum 4 weeks (160 hours for 40hr/week employee) per year
 */
export const ANNUAL_LEAVE_WEEKS = 4;
export const ANNUAL_LEAVE_RATE = 0.08; // 8% of gross earnings (alternative calculation)

/**
 * Sick Leave Entitlement
 * 10 days (80 hours) per year after 6 months employment
 */
export const SICK_LEAVE_DAYS = 10;
export const SICK_LEAVE_HOURS = 80; // 10 days × 8 hours
export const SICK_LEAVE_QUALIFICATION_MONTHS = 6;

/**
 * Alternative Day Entitlement
 * For working on a public holiday, employee gets an alternative day off
 */
export const ALTERNATIVE_DAY_HOURS = 8; // Usually 1 day = 8 hours

// ============================================
// TYPES
// ============================================

export type AnnualLeaveMethod = 'EIGHT_PERCENT' | 'WEEKS_METHOD';

export interface LeaveAccrualParams {
  /** Gross earnings for this pay period */
  grossEarnings: number;
  
  /** Hours worked in this pay period */
  hoursWorked: number;
  
  /** Employee's employment start date */
  employmentStartDate: Date;
  
  /** Current date (for calculating employment duration) */
  currentDate: Date;
  
  /** Annual leave calculation method */
  annualLeaveMethod: AnnualLeaveMethod;
  
  /** Employee's contracted weekly hours */
  contractedWeeklyHours?: number;
  
  /** Current annual leave balance */
  currentAnnualLeaveBalance?: number;
  
  /** Current sick leave balance */
  currentSickLeaveBalance?: number;
}

export interface LeaveAccrualResult {
  /** Annual leave accrued this period (hours) */
  annualLeaveAccrued: number;
  
  /** Sick leave accrued this period (hours) */
  sickLeaveAccrued: number;
  
  /** Annual leave rate used */
  annualLeaveRate: number;
  
  /** Updated annual leave balance */
  updatedAnnualLeaveBalance: number;
  
  /** Updated sick leave balance */
  updatedSickLeaveBalance: number;
  
  /** Employment duration in months */
  employmentDurationMonths: number;
  
  /** Whether employee qualifies for sick leave */
  qualifiesForSickLeave: boolean;
  
  /** Description */
  description: string;
  
  /** Warnings */
  warnings: string[];
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate leave accruals for a pay period
 * 
 * @param params Calculation parameters
 * @returns Leave accrual result
 */
export function calculateLeaveAccrual(
  params: LeaveAccrualParams
): LeaveAccrualResult {
  const {
    grossEarnings,
    hoursWorked,
    employmentStartDate,
    currentDate,
    annualLeaveMethod,
    contractedWeeklyHours = 40,
    currentAnnualLeaveBalance = 0,
    currentSickLeaveBalance = 0,
  } = params;
  
  const warnings: string[] = [];
  
  // Validate inputs
  if (grossEarnings < 0 || hoursWorked < 0) {
    throw new Error('Earnings and hours cannot be negative');
  }
  
  if (employmentStartDate > currentDate) {
    throw new Error('Employment start date cannot be in the future');
  }
  
  // Calculate employment duration
  const employmentDurationMonths = getEmploymentDurationMonths(
    employmentStartDate,
    currentDate
  );
  
  // Check if employee qualifies for sick leave (after 6 months)
  const qualifiesForSickLeave = employmentDurationMonths >= SICK_LEAVE_QUALIFICATION_MONTHS;
  
  // Calculate annual leave accrual
  const annualLeaveAccrued = calculateAnnualLeaveAccrual(
    grossEarnings,
    hoursWorked,
    annualLeaveMethod,
    contractedWeeklyHours
  );
  
  // Calculate sick leave accrual (if qualified)
  const sickLeaveAccrued = qualifiesForSickLeave
    ? calculateSickLeaveAccrual(hoursWorked, contractedWeeklyHours)
    : 0;
  
  // Update balances
  const updatedAnnualLeaveBalance = currentAnnualLeaveBalance + annualLeaveAccrued;
  const updatedSickLeaveBalance = currentSickLeaveBalance + sickLeaveAccrued;
  
  // Add warnings
  if (!qualifiesForSickLeave) {
    warnings.push(`Employee needs ${SICK_LEAVE_QUALIFICATION_MONTHS} months employment to qualify for sick leave`);
  }
  
  if (updatedAnnualLeaveBalance > 160) {
    warnings.push('Annual leave balance is high - consider encouraging leave usage');
  }
  
  return {
    annualLeaveAccrued,
    sickLeaveAccrued,
    annualLeaveRate: annualLeaveMethod === 'EIGHT_PERCENT' ? ANNUAL_LEAVE_RATE : 0,
    updatedAnnualLeaveBalance,
    updatedSickLeaveBalance,
    employmentDurationMonths,
    qualifiesForSickLeave,
    description: `Accrued ${annualLeaveAccrued.toFixed(2)}h annual, ${sickLeaveAccrued.toFixed(2)}h sick`,
    warnings,
  };
}

// ============================================
// ACCRUAL CALCULATION METHODS
// ============================================

/**
 * Calculate annual leave accrual
 */
function calculateAnnualLeaveAccrual(
  grossEarnings: number,
  hoursWorked: number,
  method: AnnualLeaveMethod,
  contractedWeeklyHours: number
): number {
  if (method === 'EIGHT_PERCENT') {
    // 8% method: Calculate based on earnings
    // Assumes hourly rate can be derived
    // This is simpler but less accurate for variable hours
    const estimatedHourlyRate = hoursWorked > 0 ? grossEarnings / hoursWorked : 0;
    const accrualInDollars = grossEarnings * ANNUAL_LEAVE_RATE;
    const accrualInHours = estimatedHourlyRate > 0 ? accrualInDollars / estimatedHourlyRate : 0;
    return Math.round(accrualInHours * 100) / 100;
  } else {
    // Weeks method: 4 weeks per 52 weeks worked
    // Annual entitlement: contractedWeeklyHours × 4
    // Accrual per hour worked: (contractedWeeklyHours × 4) / (52 × contractedWeeklyHours)
    const accrualRatePerHour = (contractedWeeklyHours * ANNUAL_LEAVE_WEEKS) / (52 * contractedWeeklyHours);
    const accrualInHours = hoursWorked * accrualRatePerHour;
    return Math.round(accrualInHours * 100) / 100;
  }
}

/**
 * Calculate sick leave accrual
 */
function calculateSickLeaveAccrual(
  hoursWorked: number,
  contractedWeeklyHours: number
): number {
  // Sick leave accrues at: 10 days / 52 weeks = 0.1923 days per week
  // Or: 80 hours / (52 × contractedWeeklyHours)
  const accrualRatePerHour = SICK_LEAVE_HOURS / (52 * contractedWeeklyHours);
  const accrualInHours = hoursWorked * accrualRatePerHour;
  
  // Cap sick leave balance at 80 hours (10 days)
  return Math.round(accrualInHours * 100) / 100;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate employment duration in months
 */
export function getEmploymentDurationMonths(
  startDate: Date,
  currentDate: Date
): number {
  const months =
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
    (currentDate.getMonth() - startDate.getMonth());
  return Math.max(0, months);
}

/**
 * Calculate employment duration in years
 */
export function getEmploymentDurationYears(
  startDate: Date,
  currentDate: Date
): number {
  const months = getEmploymentDurationMonths(startDate, currentDate);
  return Math.round((months / 12) * 100) / 100;
}

/**
 * Calculate expected annual leave balance
 */
export function calculateExpectedAnnualLeaveBalance(
  contractedWeeklyHours: number,
  employmentYears: number
): number {
  // 4 weeks per year
  const annualEntitlement = contractedWeeklyHours * ANNUAL_LEAVE_WEEKS;
  return Math.round(annualEntitlement * employmentYears * 100) / 100;
}

/**
 * Check if employee qualifies for sick leave
 */
export function qualifiesForSickLeave(employmentStartDate: Date, currentDate: Date): boolean {
  const months = getEmploymentDurationMonths(employmentStartDate, currentDate);
  return months >= SICK_LEAVE_QUALIFICATION_MONTHS;
}

/**
 * Calculate alternative day entitlement for public holiday worked
 */
export function calculateAlternativeDayEntitlement(
  publicHolidayHours: number
): number {
  // Typically 1 alternative day = 8 hours
  // If employee works less, still gets full day
  return ALTERNATIVE_DAY_HOURS;
}

/**
 * Calculate leave payout value
 */
export function calculateLeavePayout(
  leaveBalance: number,
  hourlyRate: number
): number {
  return Math.round(leaveBalance * hourlyRate * 100) / 100;
}

/**
 * Convert days to hours (assumes 8-hour days)
 */
export function daysToHours(days: number): number {
  return days * 8;
}

/**
 * Convert hours to days (assumes 8-hour days)
 */
export function hoursToDays(hours: number): number {
  return Math.round((hours / 8) * 100) / 100;
}

/**
 * Format leave balance for display
 */
export function formatLeaveBalance(hours: number): string {
  const days = hoursToDays(hours);
  return `${days.toFixed(1)} days (${hours.toFixed(1)} hours)`;
}

/**
 * Calculate annual leave entitlement for full year
 */
export function calculateAnnualLeaveEntitlement(
  contractedWeeklyHours: number
): {
  weeks: number;
  hours: number;
  days: number;
} {
  const hours = contractedWeeklyHours * ANNUAL_LEAVE_WEEKS;
  const days = hoursToDays(hours);
  
  return {
    weeks: ANNUAL_LEAVE_WEEKS,
    hours,
    days,
  };
}

/**
 * Validate leave balance
 */
export function validateLeaveBalance(
  balance: number,
  maxBalance: number = 320 // 8 weeks (reasonable max)
): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  if (balance < 0) {
    warnings.push('Leave balance is negative - employee has taken more leave than accrued');
  }
  
  if (balance > maxBalance) {
    warnings.push(`Leave balance ${balance}h exceeds recommended maximum ${maxBalance}h`);
  }
  
  return {
    isValid: balance >= 0,
    warnings,
  };
}

/**
 * Get leave information
 */
export function getLeaveInfo() {
  return {
    annualLeave: {
      entitlement: `${ANNUAL_LEAVE_WEEKS} weeks per year`,
      rate: `${(ANNUAL_LEAVE_RATE * 100).toFixed(0)}% of gross earnings`,
      hours: `${ANNUAL_LEAVE_WEEKS * 40} hours for 40hr/week employee`,
    },
    sickLeave: {
      entitlement: `${SICK_LEAVE_DAYS} days per year`,
      hours: `${SICK_LEAVE_HOURS} hours per year`,
      qualificationPeriod: `${SICK_LEAVE_QUALIFICATION_MONTHS} months`,
    },
    alternativeDays: {
      entitlement: '1 day for working public holiday',
      hours: `${ALTERNATIVE_DAY_HOURS} hours`,
    },
    references: [
      'Holidays Act 2003',
      'https://www.employment.govt.nz/leave-and-holidays/',
    ],
  };
}
