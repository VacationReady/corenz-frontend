import { format } from 'date-fns';

const LONDON_TIMEZONE = 'Europe/London';

/**
 * Convert a date and time from Europe/London to UTC
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:mm format
 * @returns UTC Date object
 */
export function toUTCFromLondon(date: string, time: string): Date {
  const dateTimeString = `${date}T${time}`;
  // Create a date in London timezone and convert to UTC
  const londonDate = new Date(dateTimeString + 'T00:00:00.000Z');
  const [hours, minutes] = time.split(':').map(Number);
  londonDate.setUTCHours(londonDate.getUTCHours() + hours, minutes);
  return londonDate;
}

/**
 * Format a UTC date/time to Europe/London timezone for display
 * @param utcDate - UTC Date object or string
 * @param formatString - Date-fns format string (default: 'dd/MM/yyyy HH:mm')
 * @returns Formatted string in London timezone
 */
export function formatLondon(
  utcDate: string | Date, 
  formatString: string = 'dd/MM/yyyy HH:mm'
): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return format(date, formatString);
}

/**
 * Format a UTC date/time to Europe/London timezone for display with time only
 * @param utcDate - UTC Date object or string
 * @returns Time string in HH:mm format
 */
export function formatLondonTime(utcDate: string | Date): string {
  return formatLondon(utcDate, 'HH:mm');
}

/**
 * Format a UTC date/time to Europe/London timezone for display with date only
 * @param utcDate - UTC Date object or string
 * @returns Date string in dd/MM/yyyy format
 */
export function formatLondonDate(utcDate: string | Date): string {
  return formatLondon(utcDate, 'dd/MM/yyyy');
}

/**
 * Get current time in London timezone
 * @returns Current time in London as Date object
 */
export function getCurrentLondonTime(): Date {
  return new Date();
}

/**
 * Check if a date is today in London timezone
 * @param utcDate - UTC Date object or string
 * @returns boolean
 */
export function isTodayInLondon(utcDate: string | Date): boolean {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const now = new Date();
  
  return format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
}

/**
 * Add minutes to a UTC date and return in London timezone
 * @param utcDate - UTC Date object or string
 * @param minutes - Number of minutes to add
 * @returns New Date object in London timezone
 */
export function addMinutesInLondon(utcDate: string | Date, minutes: number): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.getTime() + minutes * 60 * 1000);
}
