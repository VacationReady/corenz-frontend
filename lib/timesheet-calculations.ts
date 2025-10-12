import { differenceInMinutes, parseISO, addHours } from 'date-fns';

/**
 * Calculate hours worked from clock in/out times
 */
export function calculateHours(
  clockInTime: Date,
  clockOutTime: Date,
  breakMinutes: number = 0
): number {
  const totalMinutes = differenceInMinutes(clockOutTime, clockInTime);
  const workMinutes = totalMinutes - breakMinutes;
  return Math.max(0, workMinutes / 60);
}

/**
 * Calculate overtime hours based on threshold
 */
export function calculateOvertime(
  totalHours: number,
  overtimeThreshold: number = 40
): { regularHours: number; overtimeHours: number } {
  if (totalHours <= overtimeThreshold) {
    return {
      regularHours: totalHours,
      overtimeHours: 0,
    };
  }

  return {
    regularHours: overtimeThreshold,
    overtimeHours: totalHours - overtimeThreshold,
  };
}

/**
 * Round clock time to nearest interval
 */
export function roundClockTime(
  time: Date,
  roundingMode: 'NONE' | '15MIN' | '30MIN'
): Date {
  if (roundingMode === 'NONE') return time;

  const minutes = time.getMinutes();
  const interval = roundingMode === '15MIN' ? 15 : 30;
  
  const roundedMinutes = Math.round(minutes / interval) * interval;
  const newTime = new Date(time);
  newTime.setMinutes(roundedMinutes);
  newTime.setSeconds(0);
  newTime.setMilliseconds(0);

  return newTime;
}

/**
 * Validate GPS coordinates against geofence
 */
export function isWithinGeofence(
  location: { lat: number; lng: number },
  geofence: { lat: number; lng: number; radius: number }
): boolean {
  // Haversine formula to calculate distance
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(geofence.lat - location.lat);
  const dLon = toRad(geofence.lng - location.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(location.lat)) *
      Math.cos(toRad(geofence.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= geofence.radius;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate pay based on hours and rate
 */
export function calculatePay(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number,
  overtimeMultiplier: number = 1.5
): { regularPay: number; overtimePay: number; totalPay: number } {
  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;

  return {
    regularPay,
    overtimePay,
    totalPay: regularPay + overtimePay,
  };
}

/**
 * Detect NZ compliance violations
 */
export function detectComplianceViolations(
  shifts: Array<{ startTime: Date; endTime: Date; breakMinutes: number }>,
  settings: {
    minimumRestHours: number;
    maxHoursPerWeek: number;
  }
): Array<{
  type: 'REST_PERIOD' | 'MEAL_BREAK' | 'REST_BREAK' | 'MAX_HOURS';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}> {
  const violations = [];

  // Sort shifts by start time
  const sortedShifts = [...shifts].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  // Check rest periods between shifts
  for (let i = 0; i < sortedShifts.length - 1; i++) {
    const currentShift = sortedShifts[i];
    const nextShift = sortedShifts[i + 1];

    const restHours = differenceInMinutes(nextShift.startTime, currentShift.endTime) / 60;

    if (restHours < settings.minimumRestHours) {
      violations.push({
        type: 'REST_PERIOD',
        description: `Only ${restHours.toFixed(1)} hours rest between shifts (minimum ${settings.minimumRestHours} required)`,
        severity: 'HIGH',
      });
    }
  }

  // Check meal breaks (NZ: 30 min after 5 hours)
  for (const shift of sortedShifts) {
    const shiftHours = differenceInMinutes(shift.endTime, shift.startTime) / 60;
    
    if (shiftHours > 5 && shift.breakMinutes < 30) {
      violations.push({
        type: 'MEAL_BREAK',
        description: 'Shift over 5 hours requires 30-minute meal break',
        severity: 'MEDIUM',
      });
    }
  }

  // Check total hours per week
  const totalWeekHours = sortedShifts.reduce((sum, shift) => {
    return sum + differenceInMinutes(shift.endTime, shift.startTime) / 60;
  }, 0);

  if (totalWeekHours > settings.maxHoursPerWeek) {
    violations.push({
      type: 'MAX_HOURS',
      description: `Total hours (${totalWeekHours.toFixed(1)}) exceeds maximum (${settings.maxHoursPerWeek})`,
      severity: 'HIGH',
    });
  }

  return violations;
}

/**
 * Generate timesheet period dates
 */
export function getTimesheetPeriod(
  date: Date,
  period: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
  startDay: 'MONDAY' | 'SUNDAY' | '1ST'
): { periodStart: Date; periodEnd: Date } {
  const periodStart = new Date(date);
  const periodEnd = new Date(date);

  if (period === 'WEEKLY') {
    // Set to start of week
    const dayOffset = startDay === 'MONDAY' ? 1 : 0;
    const currentDay = periodStart.getDay();
    const diff = currentDay - dayOffset;
    periodStart.setDate(periodStart.getDate() - (diff >= 0 ? diff : 7 + diff));
    periodStart.setHours(0, 0, 0, 0);

    // End is 6 days later
    periodEnd.setTime(periodStart.getTime());
    periodEnd.setDate(periodEnd.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);
  } else if (period === 'BIWEEKLY') {
    // Similar to weekly but 13 days
    const dayOffset = startDay === 'MONDAY' ? 1 : 0;
    const currentDay = periodStart.getDay();
    const diff = currentDay - dayOffset;
    periodStart.setDate(periodStart.getDate() - (diff >= 0 ? diff : 7 + diff));
    periodStart.setHours(0, 0, 0, 0);

    periodEnd.setTime(periodStart.getTime());
    periodEnd.setDate(periodEnd.getDate() + 13);
    periodEnd.setHours(23, 59, 59, 999);
  } else {
    // Monthly - 1st to last day of month
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0); // Last day of current month
    periodEnd.setHours(23, 59, 59, 999);
  }

  return { periodStart, periodEnd };
}

/**
 * Calculate shift cost based on employee rate
 */
export function calculateShiftCost(
  shiftHours: number,
  breakMinutes: number,
  hourlyRate: number,
  overtimeThreshold: number = 8,
  overtimeMultiplier: number = 1.5
): number {
  const workHours = shiftHours - breakMinutes / 60;
  
  if (workHours <= overtimeThreshold) {
    return workHours * hourlyRate;
  }

  const regularHours = overtimeThreshold;
  const overtimeHours = workHours - overtimeThreshold;
  
  return (regularHours * hourlyRate) + (overtimeHours * hourlyRate * overtimeMultiplier);
}
