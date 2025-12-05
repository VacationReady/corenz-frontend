/**
 * Working Pattern Utilities
 * 
 * Helper functions for calculating hours from working pattern configurations.
 */

/**
 * Parses a time string in "HH:MM" format to minutes since midnight
 * @param time - Time string in 24-hour format (e.g., "09:00", "17:30")
 * @returns Minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM`);
  }
  return hours * 60 + minutes;
}

/**
 * Calculates working hours from start/end times minus break
 * 
 * @param startTime - Start time in "HH:MM" format (e.g., "09:00")
 * @param endTime - End time in "HH:MM" format (e.g., "17:00")
 * @param breakMinutes - Break duration in minutes (default: 0)
 * @returns Decimal hours worked (e.g., 8.0, 7.5)
 * 
 * @example
 * calculateDayHours("09:00", "17:00", 30) // Returns 7.5 (8 hours - 30 min break)
 * calculateDayHours("08:00", "16:30", 0)  // Returns 8.5
 */
export function calculateDayHours(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0
): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  // Handle overnight shifts (end time is next day)
  let totalMinutes = endMinutes - startMinutes;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // Add 24 hours worth of minutes
  }
  
  // Subtract break time
  const workingMinutes = Math.max(0, totalMinutes - breakMinutes);
  
  // Convert to decimal hours, rounded to 2 decimal places
  return Math.round((workingMinutes / 60) * 100) / 100;
}

/**
 * Formats decimal hours to a human-readable string
 * @param hours - Decimal hours (e.g., 7.5)
 * @returns Formatted string (e.g., "7h 30m")
 */
export function formatHoursDisplay(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${minutes}m`;
}

/**
 * Gets default hours for legacy day types
 * @param dayType - The day type (FULL_DAY, HALF_DAY_AM, HALF_DAY_PM)
 * @param defaultFullDayHours - Default hours for a full day (default: 8)
 * @returns Hours for the day type
 */
export function getDefaultHoursForDayType(
  dayType: string,
  defaultFullDayHours: number = 8
): number {
  switch (dayType) {
    case 'FULL_DAY':
      return defaultFullDayHours;
    case 'HALF_DAY_AM':
    case 'HALF_DAY_PM':
      return defaultFullDayHours / 2;
    case 'TIMED':
      // TIMED requires explicit hours calculation
      return 0;
    default:
      return 0;
  }
}

/**
 * Validates time format (HH:MM)
 * @param time - Time string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimeFormat(time: string): boolean {
  if (!time || typeof time !== 'string') return false;
  
  const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return regex.test(time);
}

/**
 * Calculates hours for a working pattern day based on its type
 * @param day - Working pattern day object
 * @param defaultBreakMinutes - Default break minutes from pattern (default: 30)
 * @returns Calculated hours for the day
 */
export function calculateHoursForDay(
  day: {
    type: string;
    hoursPerDay?: number | null;
    startTime?: string | null;
    endTime?: string | null;
    breakMinutes?: number | null;
  },
  defaultBreakMinutes: number = 30
): number {
  // If hoursPerDay is explicitly set, use it
  if (day.hoursPerDay != null && day.hoursPerDay > 0) {
    return Number(day.hoursPerDay);
  }
  
  // For TIMED type, calculate from start/end times
  if (day.type === 'TIMED' && day.startTime && day.endTime) {
    const breakMins = day.breakMinutes ?? defaultBreakMinutes;
    return calculateDayHours(day.startTime, day.endTime, breakMins);
  }
  
  // Fall back to default hours for legacy types
  return getDefaultHoursForDayType(day.type);
}

