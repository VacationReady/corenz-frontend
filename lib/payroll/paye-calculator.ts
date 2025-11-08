/**
 * NZ PAYE Tax Calculator
 * 
 * Implements PAYE (Pay As You Earn) tax calculations for New Zealand
 * Based on IRD tax tables for 2024/25 tax year
 * 
 * References:
 * - Tax Administration Act 1994
 * - https://www.ird.govt.nz/employing-staff/payday-filing/paye-tax-rates-and-thresholds
 * 
 * @version 1.0
 * @date 2024-11-08
 */

import { NZTaxCode } from '../../types/nz-payroll-export';

// ============================================
// TAX TABLES 2024/25
// ============================================

/**
 * NZ Tax Brackets for 2024/25 Tax Year
 * Effective from 31 July 2024
 */
export const TAX_BRACKETS_2024_25 = [
  { threshold: 14000, rate: 0.105, description: '10.5% up to $14,000' },
  { threshold: 48000, rate: 0.175, description: '17.5% from $14,001 to $48,000' },
  { threshold: 70000, rate: 0.30, description: '30% from $48,001 to $70,000' },
  { threshold: 180000, rate: 0.33, description: '33% from $70,001 to $180,000' },
  { threshold: Infinity, rate: 0.39, description: '39% over $180,000' },
] as const;

/**
 * Special tax code rates
 */
export const SPECIAL_TAX_RATES: Record<string, number> = {
  ND: 0.45, // Non-declaration (no tax code provided)
  EDW: 0.105, // Election day worker
  CAE: 0.105, // Casual agricultural employee
  SB: 0.105, // Secondary employment basic
  S: 0.175, // Secondary employment standard
  SH: 0.30, // Secondary employment high
  ST: 0.33, // Special tax rate
  SA: 0.0, // Special exempt (no tax)
  SL: 0.0, // Student loan only (no PAYE)
  WT: 0.45, // Withholding tax
} as const;

/**
 * Low earner (ME) threshold
 * If annual income is below this, ME tax code applies 10.5% flat rate
 */
export const LOW_EARNER_THRESHOLD = 14000;

/**
 * Pay frequency conversion factors to annual
 */
export const PAY_FREQUENCY_MULTIPLIERS = {
  WEEKLY: 52,
  FORTNIGHTLY: 26,
  FOUR_WEEKLY: 13,
  MONTHLY: 12,
} as const;

// ============================================
// TYPES
// ============================================

export type PayFrequency = keyof typeof PAY_FREQUENCY_MULTIPLIERS;

export interface PAYECalculationParams {
  /** Gross earnings for this pay period */
  grossEarnings: number;
  
  /** NZ tax code */
  taxCode: NZTaxCode;
  
  /** Pay frequency */
  payFrequency: PayFrequency;
  
  /** Which pay period in the year (1-52 for weekly, etc.) */
  periodNumber?: number;
  
  /** Year-to-date gross earnings (for more accurate calculation) */
  ytdGross?: number;
}

export interface PAYECalculationResult {
  /** PAYE tax to deduct this period */
  paye: number;
  
  /** Effective tax rate applied */
  effectiveRate: number;
  
  /** Tax bracket or special rate description */
  description: string;
  
  /** Annual gross estimate */
  annualGrossEstimate: number;
  
  /** Tax year */
  taxYear: string;
  
  /** Calculation method used */
  calculationMethod: 'PROGRESSIVE' | 'FLAT_RATE' | 'SPECIAL_CODE';
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate PAYE tax for a pay period
 * 
 * @param params Calculation parameters
 * @returns PAYE calculation result
 */
export function calculatePAYE(params: PAYECalculationParams): PAYECalculationResult {
  const {
    grossEarnings,
    taxCode,
    payFrequency,
    periodNumber = 1,
    ytdGross = 0,
  } = params;
  
  // Validate inputs
  if (grossEarnings < 0) {
    throw new Error('Gross earnings cannot be negative');
  }
  
  if (grossEarnings === 0) {
    return {
      paye: 0,
      effectiveRate: 0,
      description: 'No earnings',
      annualGrossEstimate: 0,
      taxYear: getCurrentTaxYear(),
      calculationMethod: 'PROGRESSIVE',
    };
  }
  
  // Calculate annual gross estimate
  const multiplier = PAY_FREQUENCY_MULTIPLIERS[payFrequency];
  const annualGrossEstimate = ytdGross > 0
    ? ytdGross + (grossEarnings * (multiplier - periodNumber + 1))
    : grossEarnings * multiplier;
  
  // Check for special tax codes
  if (taxCode in SPECIAL_TAX_RATES) {
    return calculateSpecialRatePAYE(
      grossEarnings,
      taxCode,
      annualGrossEstimate
    );
  }
  
  // Check for ME (low earner) tax code
  if (taxCode === 'ME' || taxCode === 'ME SL') {
    return calculateLowEarnerPAYE(
      grossEarnings,
      taxCode,
      annualGrossEstimate
    );
  }
  
  // Calculate progressive tax for primary employment (M, M SL)
  if (taxCode === 'M' || taxCode === 'M SL') {
    return calculateProgressivePAYE(
      grossEarnings,
      taxCode,
      payFrequency,
      annualGrossEstimate
    );
  }
  
  // Default to progressive calculation for other codes
  return calculateProgressivePAYE(
    grossEarnings,
    taxCode,
    payFrequency,
    annualGrossEstimate
  );
}

// ============================================
// CALCULATION METHODS
// ============================================

/**
 * Calculate PAYE using progressive tax brackets (for M tax code)
 */
function calculateProgressivePAYE(
  grossEarnings: number,
  taxCode: NZTaxCode,
  payFrequency: PayFrequency,
  annualGrossEstimate: number
): PAYECalculationResult {
  // Calculate annual tax liability using progressive brackets
  let annualTax = 0;
  let previousThreshold = 0;
  
  for (const bracket of TAX_BRACKETS_2024_25) {
    const taxableInBracket = Math.min(
      annualGrossEstimate - previousThreshold,
      bracket.threshold - previousThreshold
    );
    
    if (taxableInBracket > 0) {
      annualTax += taxableInBracket * bracket.rate;
    }
    
    if (annualGrossEstimate <= bracket.threshold) {
      break;
    }
    
    previousThreshold = bracket.threshold;
  }
  
  // Convert to period tax
  const multiplier = PAY_FREQUENCY_MULTIPLIERS[payFrequency];
  const periodTax = annualTax / multiplier;
  const effectiveRate = annualTax / annualGrossEstimate;
  
  // Determine bracket description
  const bracket = TAX_BRACKETS_2024_25.find(
    b => annualGrossEstimate <= b.threshold
  );
  
  return {
    paye: Math.round(periodTax * 100) / 100, // Round to 2 decimal places
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    description: bracket?.description || 'Top tax bracket',
    annualGrossEstimate,
    taxYear: getCurrentTaxYear(),
    calculationMethod: 'PROGRESSIVE',
  };
}

/**
 * Calculate PAYE for low earner (ME tax code)
 */
function calculateLowEarnerPAYE(
  grossEarnings: number,
  taxCode: NZTaxCode,
  annualGrossEstimate: number
): PAYECalculationResult {
  // ME tax code: Flat 10.5% if annual income < $14,000
  // Otherwise, use progressive rates
  
  if (annualGrossEstimate <= LOW_EARNER_THRESHOLD) {
    const paye = grossEarnings * 0.105;
    
    return {
      paye: Math.round(paye * 100) / 100,
      effectiveRate: 0.105,
      description: 'Low earner flat rate 10.5%',
      annualGrossEstimate,
      taxYear: getCurrentTaxYear(),
      calculationMethod: 'FLAT_RATE',
    };
  }
  
  // Exceeds threshold, use progressive (treat as M code)
  const normalCode = taxCode.includes('SL') ? 'M SL' : 'M';
  return calculateProgressivePAYE(
    grossEarnings,
    normalCode as NZTaxCode,
    'WEEKLY', // Use weekly as default for conversion
    annualGrossEstimate
  );
}

/**
 * Calculate PAYE for special tax codes (ND, EDW, SB, S, SH, etc.)
 */
function calculateSpecialRatePAYE(
  grossEarnings: number,
  taxCode: NZTaxCode,
  annualGrossEstimate: number
): PAYECalculationResult {
  // Extract base code (remove SL suffix if present)
  const baseCode = taxCode.replace(' SL', '');
  const rate = SPECIAL_TAX_RATES[baseCode] || 0;
  const paye = grossEarnings * rate;
  
  const descriptions: Record<string, string> = {
    ND: 'Non-declaration rate 45%',
    EDW: 'Election day worker 10.5%',
    CAE: 'Casual agricultural 10.5%',
    SB: 'Secondary basic 10.5%',
    S: 'Secondary standard 17.5%',
    SH: 'Secondary high 30%',
    ST: 'Special rate 33%',
    SA: 'Special exempt 0%',
    SL: 'Student loan only 0%',
    WT: 'Withholding tax 45%',
  };
  
  return {
    paye: Math.round(paye * 100) / 100,
    effectiveRate: rate,
    description: descriptions[baseCode] || `Special rate ${rate * 100}%`,
    annualGrossEstimate,
    taxYear: getCurrentTaxYear(),
    calculationMethod: 'FLAT_RATE',
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current NZ tax year (starts 1 April)
 */
export function getCurrentTaxYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  
  // Tax year starts 1 April
  if (month >= 3) {
    // April onwards: current year / next year
    return `${year}/${(year + 1).toString().slice(-2)}`;
  } else {
    // Jan-March: previous year / current year
    return `${year - 1}/${year.toString().slice(-2)}`;
  }
}

/**
 * Validate NZ tax code
 */
export function isValidTaxCode(taxCode: string): boolean {
  const validCodes: NZTaxCode[] = [
    'M', 'ME', 'M SL', 'ME SL',
    'SB', 'SB SL', 'S', 'S SL',
    'SH', 'SH SL', 'ST', 'ST SL',
    'SA', 'SA SL', 'SL',
    'CAE', 'EDW', 'ND', 'NS', 'STC', 'WT', 'P',
  ];
  
  return validCodes.includes(taxCode as NZTaxCode);
}

/**
 * Get tax rate description for a tax code
 */
export function getTaxCodeDescription(taxCode: NZTaxCode): string {
  const descriptions: Record<NZTaxCode, string> = {
    M: 'Primary employment, no student loan',
    ME: 'Primary employment, low earner (<$14k), no student loan',
    'M SL': 'Primary employment with student loan',
    'ME SL': 'Primary employment, low earner with student loan',
    SB: 'Secondary employment basic rate',
    'SB SL': 'Secondary employment basic with student loan',
    S: 'Secondary employment standard rate',
    'S SL': 'Secondary employment standard with student loan',
    SH: 'Secondary employment high rate',
    'SH SL': 'Secondary employment high with student loan',
    ST: 'Special tax rate',
    'ST SL': 'Special tax rate with student loan',
    SA: 'Special exempt rate',
    'SA SL': 'Special exempt with student loan',
    SL: 'Student loan only (no PAYE)',
    CAE: 'Casual agricultural employee',
    EDW: 'Election day worker',
    ND: 'Non-declaration (no tax code provided)',
    NS: 'Non-resident seasonal worker',
    STC: 'Special tax code certificate',
    WT: 'Withholding tax',
    P: 'Provisional tax',
  };
  
  return descriptions[taxCode] || 'Unknown tax code';
}

/**
 * Calculate estimated annual PAYE tax
 */
export function calculateAnnualPAYE(annualGross: number, taxCode: NZTaxCode): number {
  // For primary employment, use progressive brackets
  if (taxCode === 'M' || taxCode === 'M SL') {
    let annualTax = 0;
    let previousThreshold = 0;
    
    for (const bracket of TAX_BRACKETS_2024_25) {
      const taxableInBracket = Math.min(
        annualGross - previousThreshold,
        bracket.threshold - previousThreshold
      );
      
      if (taxableInBracket > 0) {
        annualTax += taxableInBracket * bracket.rate;
      }
      
      if (annualGross <= bracket.threshold) {
        break;
      }
      
      previousThreshold = bracket.threshold;
    }
    
    return Math.round(annualTax * 100) / 100;
  }
  
  // For special codes, use flat rate
  const baseCode = taxCode.replace(' SL', '');
  const rate = SPECIAL_TAX_RATES[baseCode] || 0.175;
  return Math.round(annualGross * rate * 100) / 100;
}
