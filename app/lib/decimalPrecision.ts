/**
 * Utility functions for ensuring consistent decimal precision
 * across leave entitlements and related calculations.
 * 
 * NZ HRIS Requirement: All leave entitlements must be limited to 2 decimal places.
 */

/**
 * Rounds a number to exactly 2 decimal places.
 * Uses banker's rounding (round half to even) for financial accuracy.
 * 
 * @param value - The number to round
 * @returns The number rounded to 2 decimal places
 * 
 * @example
 * roundToTwoDecimals(10.12345) // 10.12
 * roundToTwoDecimals(10.125) // 10.13 (rounds up)
 * roundToTwoDecimals(10.1) // 10.1
 * roundToTwoDecimals(10) // 10
 */
export function roundToTwoDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Parses a value to a number and rounds to 2 decimal places.
 * Returns 0 for invalid inputs.
 * 
 * @param value - The value to parse and round
 * @returns The parsed number rounded to 2 decimal places
 */
export function parseAndRoundToTwoDecimals(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  const num = typeof value === 'number' ? value : Number(value);
  
  if (!Number.isFinite(num)) {
    return 0;
  }
  
  return roundToTwoDecimals(num);
}

/**
 * Validates that a number has at most 2 decimal places.
 * 
 * @param value - The number to validate
 * @returns true if the number has 2 or fewer decimal places
 */
export function hasMaxTwoDecimals(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const rounded = roundToTwoDecimals(value);
  return value === rounded;
}

/**
 * Formats a number for display with exactly 2 decimal places.
 * 
 * @param value - The number to format
 * @returns Formatted string with 2 decimal places
 */
export function formatTwoDecimals(value: number): string {
  return roundToTwoDecimals(value).toFixed(2);
}

/**
 * Adds two numbers and rounds the result to 2 decimal places.
 * Prevents floating-point precision issues.
 * 
 * @param a - First number
 * @param b - Second number
 * @returns Sum rounded to 2 decimal places
 */
export function addWithPrecision(a: number, b: number): number {
  return roundToTwoDecimals(a + b);
}

/**
 * Subtracts two numbers and rounds the result to 2 decimal places.
 * Prevents floating-point precision issues.
 * 
 * @param a - First number
 * @param b - Number to subtract
 * @returns Difference rounded to 2 decimal places
 */
export function subtractWithPrecision(a: number, b: number): number {
  return roundToTwoDecimals(a - b);
}

/**
 * Rounds a leave balance value to the nearest 0.25 increment with max 2 decimal places.
 * This ensures leave values are always in quarter-day increments (0, 0.25, 0.5, 0.75, 1, etc.)
 * 
 * @param value - The leave balance value to round
 * @returns The value rounded to nearest 0.25 increment
 * 
 * @example
 * roundLeaveBalance(3.6999999) // 3.75
 * roundLeaveBalance(3.1) // 3.0
 * roundLeaveBalance(3.13) // 3.25
 * roundLeaveBalance(3.37) // 3.25
 * roundLeaveBalance(3.38) // 3.5
 */
export function roundLeaveBalance(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 4) / 4;
}

/**
 * Formats a leave balance for display - rounds to 2 decimal places max.
 * Use this for displaying leave values in the UI.
 * 
 * @param value - The leave balance value to format
 * @returns The value rounded to 2 decimal places
 * 
 * @example
 * formatLeaveBalance(3.6999999) // 3.7
 * formatLeaveBalance(12.5) // 12.5
 * formatLeaveBalance(10.123) // 10.12
 */
export function formatLeaveBalance(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return roundToTwoDecimals(value);
}

