/**
 * Onboarding Reminder & SLA Configuration Types
 * 
 * Supporting multi-tenant scheduling rules, timezone awareness for NZ,
 * and escalation paths to managers or HR admins.
 */

export interface ReminderConfig {
  enabled: boolean;
  daysBefore: number;
  time: string; // HH:MM format in tenant timezone
  escalation: ReminderEscalationConfig;
}

export interface ReminderEscalationConfig {
  enabled: boolean;
  days: number;
  role: 'manager' | 'hr_admin' | 'custom';
  userId?: string; // For custom escalation
}

export interface SLAConfig {
  enabled: boolean;
  completionDays: number;
  warningDays: number;
  excludePublicHolidays: boolean;
  excludeWeekends: boolean;
}

export interface OnboardingStepWithReminder {
  id?: string;
  key?: string;
  type: string;
  title: string;
  description?: string;
  reminder?: ReminderConfig;
  sla?: SLAConfig;
}

export const NZ_TIMEZONE = 'Pacific/Auckland';

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: false,
  daysBefore: 1,
  time: '09:00',
  escalation: {
    enabled: false,
    days: 3,
    role: 'manager',
  },
};

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  enabled: false,
  completionDays: 7,
  warningDays: 2,
  excludePublicHolidays: true,
  excludeWeekends: false,
};

/**
 * Calculate the reminder send time in UTC given NZ timezone
 * 
 * @param startDate - The onboarding start date
 * @param daysBefore - Days before to send reminder
 * @param time - Time in HH:MM format (NZ timezone)
 * @returns UTC datetime for reminder
 */
export function calculateReminderTime(
  startDate: Date,
  daysBefore: number,
  time: string
): Date {
  const [hours, minutes] = time.split(':').map(Number);
  
  // Create date in NZ timezone
  const reminderDate = new Date(startDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);
  reminderDate.setHours(hours, minutes, 0, 0);
  
  return reminderDate;
}

/**
 * Calculate business days excluding weekends and public holidays
 * 
 * @param startDate - Start date
 * @param businessDays - Number of business days to add
 * @param excludeWeekends - Whether to exclude weekends
 * @param excludePublicHolidays - Whether to exclude NZ public holidays
 * @param publicHolidays - Array of public holiday dates
 * @returns End date
 */
export function calculateBusinessDays(
  startDate: Date,
  businessDays: number,
  excludeWeekends: boolean,
  excludePublicHolidays: boolean,
  publicHolidays: Date[] = []
): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    
    const dayOfWeek = result.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPublicHoliday = publicHolidays.some(
      (holiday) =>
        holiday.getFullYear() === result.getFullYear() &&
        holiday.getMonth() === result.getMonth() &&
        holiday.getDate() === result.getDate()
    );
    
    // Skip if it's a weekend or public holiday (if configured)
    if ((excludeWeekends && isWeekend) || (excludePublicHolidays && isPublicHoliday)) {
      continue;
    }
    
    daysAdded++;
  }
  
  return result;
}

/**
 * Get NZ public holidays for a given year
 * Reference: Employment New Zealand - Public Holidays
 */
export function getNZPublicHolidays(year: number): Date[] {
  return [
    new Date(year, 0, 1), // New Year's Day
    new Date(year, 0, 2), // Day after New Year's Day
    new Date(year, 1, 6), // Waitangi Day
    getEasterFriday(year), // Good Friday
    getEasterMonday(year), // Easter Monday
    new Date(year, 3, 25), // ANZAC Day
    getQueensBirthday(year), // Queen's Birthday (first Monday in June)
    getMatariki(year), // Matariki (varies, usually mid-June)
    new Date(year, 11, 25), // Christmas Day
    new Date(year, 11, 26), // Boxing Day
  ];
}

function getEasterFriday(year: number): Date {
  const easter = calculateEaster(year);
  const easterFriday = new Date(easter);
  easterFriday.setDate(easter.getDate() - 2);
  return easterFriday;
}

function getEasterMonday(year: number): Date {
  const easter = calculateEaster(year);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  return easterMonday;
}

function getQueensBirthday(year: number): Date {
  // First Monday in June
  const june = new Date(year, 5, 1);
  while (june.getDay() !== 1) {
    june.setDate(june.getDate() + 1);
  }
  return june;
}

function getMatariki(year: number): Date {
  // Matariki dates vary - these are approximations
  // In practice, fetch from a government API or database
  const matarikiDates: Record<number, Date> = {
    2024: new Date(2024, 5, 28),
    2025: new Date(2025, 5, 20),
    2026: new Date(2026, 6, 10),
    2027: new Date(2027, 5, 25),
  };
  return matarikiDates[year] || new Date(year, 5, 20);
}

function calculateEaster(year: number): Date {
  // Computus algorithm for Easter Sunday
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}
