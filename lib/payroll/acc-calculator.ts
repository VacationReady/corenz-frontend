/**
 * NZ ACC Earner Levy Calculator
 * 
 * Calculates ACC (Accident Compensation Corporation) earner levy
 * for employees in New Zealand
 * 
 * References:
 * - https://www.acc.co.nz/for-business/work-levies/
 * - https://www.ird.govt.nz/employing-staff/payday-filing/paying-acc
 * 
 * @version 1.0
 * @date 2024-11-08
 */

import { PayFrequency, PAY_FREQUENCY_MULTIPLIERS } from './paye-calculator';

// ============================================
// ACC CONSTANTS 2024
// ============================================

/**
 * ACC Earner Levy Rate for 2024 tax year
 * Effective from 1 April 2024
 */
export const ACC_EARNER_LEVY_RATE_2024 = 0.0146; // 1.46%

/**
 * Maximum earnings subject to ACC levy
 * Capped at this annual amount
 */
export const ACC_EARNINGS_CAP_2024 = 142283;

/**
 * Maximum annual ACC levy
 */
export const MAX_ACC_ANNUAL_2024 = Math.round(ACC_EARNINGS_CAP_2024 * ACC_EARNER_LEVY_RATE_2024 * 100) / 100; // $2,077.33

// ============================================
// TYPES
// ============================================

export interface ACCCalculationParams {
  /** Gross earnings for this pay period */
  grossEarnings: number;
  
  /** Pay frequency */
  payFrequency: PayFrequency;
  
  /** Year-to-date gross earnings (for cap calculation) */
  ytdGross?: number;
  
  /** Which pay period in the year (1-52 for weekly, etc.) */
  periodNumber?: number;
}

export interface ACCCalculationResult {
  /** ACC levy to deduct this period */
  accLevy: number;
  
  /** Rate applied (normally 1.46%) */
  rate: number;
  
  /** Whether the levy is capped (earnings exceed $142,283) */
  capped: boolean;
  
  /** Remaining ACC liability for the year (if capped) */
  remainingLiability?: number;
  
  /** Year-to-date ACC levy */
  ytdAccLevy: number;
  
  /** Annual earnings estimate */
  annualGrossEstimate: number;
  
  /** Description */
  description: string;
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate ACC earner levy for a pay period
 * 
 * @param params Calculation parameters
 * @returns ACC calculation result
 */
export function calculateACCLevy(params: ACCCalculationParams): ACCCalculationResult {
  const {
    grossEarnings,
    payFrequency,
    ytdGross = 0,
    periodNumber = 1,
  } = params;
  
  // Validate inputs
  if (grossEarnings < 0) {
    throw new Error('Gross earnings cannot be negative');
  }
  
  if (grossEarnings === 0) {
    return {
      accLevy: 0,
      rate: ACC_EARNER_LEVY_RATE_2024,
      capped: false,
      ytdAccLevy: 0,
      annualGrossEstimate: 0,
      description: 'No earnings',
    };
  }
  
  // Calculate annual gross estimate
  const multiplier = PAY_FREQUENCY_MULTIPLIERS[payFrequency];
  const annualGrossEstimate = ytdGross > 0
    ? ytdGross + (grossEarnings * (multiplier - periodNumber + 1))
    : grossEarnings * multiplier;
  
  // Check if earnings exceed the cap
  if (annualGrossEstimate <= ACC_EARNINGS_CAP_2024) {
    // No capping - calculate normal levy
    const accLevy = Math.round(grossEarnings * ACC_EARNER_LEVY_RATE_2024 * 100) / 100;
    const ytdAccLevy = Math.round(ytdGross * ACC_EARNER_LEVY_RATE_2024 * 100) / 100;
    
    return {
      accLevy,
      rate: ACC_EARNER_LEVY_RATE_2024,
      capped: false,
      ytdAccLevy,
      annualGrossEstimate,
      description: `ACC levy at ${(ACC_EARNER_LEVY_RATE_2024 * 100).toFixed(2)}%`,
    };
  }
  
  // Earnings exceed cap - pro-rate the levy
  return calculateCappedACCLevy(
    grossEarnings,
    payFrequency,
    ytdGross,
    periodNumber,
    annualGrossEstimate
  );
}

/**
 * Calculate ACC levy when earnings exceed the cap
 */
function calculateCappedACCLevy(
  grossEarnings: number,
  payFrequency: PayFrequency,
  ytdGross: number,
  periodNumber: number,
  annualGrossEstimate: number
): ACCCalculationResult {
  const multiplier = PAY_FREQUENCY_MULTIPLIERS[payFrequency];
  
  // Calculate how much of the cap has been used
  const remainingCap = ACC_EARNINGS_CAP_2024 - ytdGross;
  
  if (remainingCap <= 0) {
    // Already exceeded cap - no ACC levy this period
    return {
      accLevy: 0,
      rate: 0,
      capped: true,
      remainingLiability: 0,
      ytdAccLevy: MAX_ACC_ANNUAL_2024,
      annualGrossEstimate,
      description: 'ACC cap reached - no levy this period',
    };
  }
  
  // Calculate levy on remaining cap only
  const applicableEarnings = Math.min(grossEarnings, remainingCap);
  const accLevy = Math.round(applicableEarnings * ACC_EARNER_LEVY_RATE_2024 * 100) / 100;
  const ytdAccLevy = Math.round((ytdGross + applicableEarnings) * ACC_EARNER_LEVY_RATE_2024 * 100) / 100;
  const remainingLiability = MAX_ACC_ANNUAL_2024 - ytdAccLevy;
  
  return {
    accLevy,
    rate: ACC_EARNER_LEVY_RATE_2024,
    capped: true,
    remainingLiability: Math.max(0, remainingLiability),
    ytdAccLevy,
    annualGrossEstimate,
    description: `ACC levy capped at $${ACC_EARNINGS_CAP_2024.toLocaleString()} annual earnings`,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate annual ACC levy for a given annual gross
 */
export function calculateAnnualACCLevy(annualGross: number): number {
  const cappedGross = Math.min(annualGross, ACC_EARNINGS_CAP_2024);
  return Math.round(cappedGross * ACC_EARNER_LEVY_RATE_2024 * 100) / 100;
}

/**
 * Check if earnings will exceed ACC cap
 */
export function willExceedACCCap(
  ytdGross: number,
  remainingPeriods: number,
  averageEarningsPerPeriod: number
): boolean {
  const projectedAnnualGross = ytdGross + (remainingPeriods * averageEarningsPerPeriod);
  return projectedAnnualGross > ACC_EARNINGS_CAP_2024;
}

/**
 * Get remaining ACC cap for the year
 */
export function getRemainingACCCap(ytdGross: number): number {
  return Math.max(0, ACC_EARNINGS_CAP_2024 - ytdGross);
}

/**
 * Calculate weekly ACC levy (useful for estimates)
 */
export function calculateWeeklyACCLevy(weeklyGross: number): number {
  const annualGross = weeklyGross * 52;
  const annualLevy = calculateAnnualACCLevy(annualGross);
  return Math.round(annualLevy / 52 * 100) / 100;
}

/**
 * Get ACC rate information
 */
export function getACCRateInfo() {
  return {
    rate: ACC_EARNER_LEVY_RATE_2024,
    ratePercentage: `${(ACC_EARNER_LEVY_RATE_2024 * 100).toFixed(2)}%`,
    earningsCap: ACC_EARNINGS_CAP_2024,
    maxAnnualLevy: MAX_ACC_ANNUAL_2024,
    effectiveFrom: '1 April 2024',
    description: 'ACC Earner Levy 2024',
  };
}
