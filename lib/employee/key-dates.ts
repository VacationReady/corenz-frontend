/**
 * Key Dates Helper Functions
 * 
 * Provides utilities for calculating and formatting key dates for employees
 * including contract end dates, visa expiry, trial period end, and work anniversaries.
 */

import { format, differenceInDays, addYears, isBefore, startOfDay } from 'date-fns';

/**
 * Represents a key date item to be displayed in the Key Dates Card
 */
export interface KeyDateItem {
  id: string;
  label: string;
  date: Date;
  formattedDate: string;
  relativeDays: number;
  relativeText: string;
  type: 'contract' | 'visa' | 'trial' | 'anniversary';
  indicator: 'warning' | 'celebration' | null;
}

/**
 * Employee data required for building key dates
 */
export interface EmployeeKeyDatesInput {
  id: string;
  startDate?: Date | null;
  contractEndDate?: Date | null;
  visaExpiryDate?: Date | null;
  ninetyDayTrialPeriod?: boolean;
  trialPeriodEndDate?: Date | null;
}

/**
 * Warning thresholds in days for each date type
 */
export const WARNING_THRESHOLDS = {
  contract: 30,
  visa: 90,
  trial: 14,
  anniversary: 30,
} as const;

/**
 * Maximum number of key dates to display
 */
const MAX_KEY_DATES = 4;

/**
 * Calculates the next work anniversary from a start date
 * 
 * @param startDate - The employee's start date
 * @param referenceDate - The reference date (typically today)
 * @returns Object containing the next anniversary date and the year count
 */
export function calculateNextAnniversary(
  startDate: Date,
  referenceDate: Date
): { date: Date; years: number } {
  const start = startOfDay(startDate);
  const reference = startOfDay(referenceDate);
  
  // Calculate years since start
  let years = reference.getFullYear() - start.getFullYear();
  
  // Get this year's anniversary
  let nextAnniversary = addYears(start, years);
  
  // If this year's anniversary has passed, use next year's
  if (isBefore(nextAnniversary, reference)) {
    years += 1;
    nextAnniversary = addYears(start, years);
  }
  
  return { date: nextAnniversary, years };
}

/**
 * Formats the relative time text based on days until the date
 * 
 * @param days - Number of days until the date (can be negative for past dates)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(days: number): string {
  if (days === 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Tomorrow';
  }
  if (days > 1) {
    return `in ${days} days`;
  }
  // Past dates (shouldn't normally be displayed but handle gracefully)
  if (days === -1) {
    return 'Yesterday';
  }
  return `${Math.abs(days)} days ago`;
}


/**
 * Determines the indicator type based on date type and days until the date
 * 
 * @param type - The type of key date
 * @param relativeDays - Number of days until the date
 * @returns The indicator type or null
 */
function getIndicator(
  type: KeyDateItem['type'],
  relativeDays: number
): KeyDateItem['indicator'] {
  const threshold = WARNING_THRESHOLDS[type];
  
  if (relativeDays <= threshold) {
    return type === 'anniversary' ? 'celebration' : 'warning';
  }
  
  return null;
}

/**
 * Creates a KeyDateItem from the given parameters
 */
function createKeyDateItem(
  id: string,
  label: string,
  date: Date,
  type: KeyDateItem['type'],
  referenceDate: Date
): KeyDateItem {
  const normalizedDate = startOfDay(date);
  const normalizedReference = startOfDay(referenceDate);
  const relativeDays = differenceInDays(normalizedDate, normalizedReference);
  
  return {
    id,
    label,
    date: normalizedDate,
    formattedDate: format(normalizedDate, 'MMM d, yyyy'),
    relativeDays,
    relativeText: formatRelativeTime(relativeDays),
    type,
    indicator: getIndicator(type, relativeDays),
  };
}

/**
 * Builds an array of key dates from employee data
 * 
 * Collects all relevant dates, filters to future/today dates only,
 * sorts by date ascending, and limits to MAX_KEY_DATES items.
 * 
 * @param employee - Employee data containing date fields
 * @param today - Reference date (typically today)
 * @returns Array of KeyDateItem sorted by date, limited to 4 items
 */
export function buildKeyDates(
  employee: EmployeeKeyDatesInput,
  today: Date
): KeyDateItem[] {
  const keyDates: KeyDateItem[] = [];
  const referenceDate = startOfDay(today);
  
  // Contract End Date
  if (employee.contractEndDate) {
    const contractDate = startOfDay(employee.contractEndDate);
    const relativeDays = differenceInDays(contractDate, referenceDate);
    
    // Only include future dates or today
    if (relativeDays >= 0) {
      keyDates.push(
        createKeyDateItem(
          `${employee.id}-contract`,
          'Contract Ends',
          contractDate,
          'contract',
          referenceDate
        )
      );
    }
  }
  
  // Visa Expiry Date
  if (employee.visaExpiryDate) {
    const visaDate = startOfDay(employee.visaExpiryDate);
    const relativeDays = differenceInDays(visaDate, referenceDate);
    
    if (relativeDays >= 0) {
      keyDates.push(
        createKeyDateItem(
          `${employee.id}-visa`,
          'Visa Expires',
          visaDate,
          'visa',
          referenceDate
        )
      );
    }
  }
  
  // Trial Period End Date (only if ninetyDayTrialPeriod is true)
  if (employee.ninetyDayTrialPeriod && employee.trialPeriodEndDate) {
    const trialDate = startOfDay(employee.trialPeriodEndDate);
    const relativeDays = differenceInDays(trialDate, referenceDate);
    
    if (relativeDays >= 0) {
      keyDates.push(
        createKeyDateItem(
          `${employee.id}-trial`,
          'Trial Period Ends',
          trialDate,
          'trial',
          referenceDate
        )
      );
    }
  }
  
  // Work Anniversary
  if (employee.startDate) {
    const { date: anniversaryDate, years } = calculateNextAnniversary(
      employee.startDate,
      referenceDate
    );
    
    // Only include if years > 0 (not the start date itself)
    if (years > 0) {
      const relativeDays = differenceInDays(anniversaryDate, referenceDate);
      
      // Anniversary should always be in the future or today based on calculation
      if (relativeDays >= 0) {
        keyDates.push(
          createKeyDateItem(
            `${employee.id}-anniversary`,
            `${years} Year Anniversary`,
            anniversaryDate,
            'anniversary',
            referenceDate
          )
        );
      }
    }
  }
  
  // Sort by date ascending (soonest first)
  keyDates.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Limit to MAX_KEY_DATES items
  return keyDates.slice(0, MAX_KEY_DATES);
}
