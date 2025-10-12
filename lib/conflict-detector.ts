import { differenceInHours, areIntervalsOverlapping } from 'date-fns';

export interface Shift {
  id: string;
  employeeId: string | null;
  startTime: Date;
  endTime: Date;
  requiredSkills: string[];
}

export interface AvailabilityPattern {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface AvailabilityException {
  date: Date;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
}

export interface Conflict {
  type: 'DOUBLE_BOOKING' | 'REST_PERIOD' | 'OVERTIME' | 'UNAVAILABLE' | 'SKILL_MISMATCH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  shift1Id?: string;
  shift2Id?: string;
  employeeId: string;
}

/**
 * Detect scheduling conflicts for shifts
 */
export function detectScheduleConflicts(
  shifts: Shift[],
  availabilityPatterns: Map<string, AvailabilityPattern[]>,
  availabilityExceptions: Map<string, AvailabilityException[]>,
  employeeSkills: Map<string, string[]>,
  settings: {
    minimumRestHours: number;
    maxHoursPerWeek: number;
  }
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Group shifts by employee
  const shiftsByEmployee = new Map<string, Shift[]>();
  for (const shift of shifts) {
    if (!shift.employeeId) continue;
    
    const employeeShifts = shiftsByEmployee.get(shift.employeeId) || [];
    employeeShifts.push(shift);
    shiftsByEmployee.set(shift.employeeId, employeeShifts);
  }

  // Check each employee's shifts
  for (const [employeeId, employeeShifts] of shiftsByEmployee) {
    // Sort shifts by start time
    const sortedShifts = [...employeeShifts].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    // Check for double bookings
    for (let i = 0; i < sortedShifts.length; i++) {
      for (let j = i + 1; j < sortedShifts.length; j++) {
        const shift1 = sortedShifts[i];
        const shift2 = sortedShifts[j];

        if (
          areIntervalsOverlapping(
            { start: shift1.startTime, end: shift1.endTime },
            { start: shift2.startTime, end: shift2.endTime }
          )
        ) {
          conflicts.push({
            type: 'DOUBLE_BOOKING',
            severity: 'CRITICAL',
            description: 'Employee has overlapping shifts',
            shift1Id: shift1.id,
            shift2Id: shift2.id,
            employeeId,
          });
        }
      }
    }

    // Check rest periods between consecutive shifts
    for (let i = 0; i < sortedShifts.length - 1; i++) {
      const currentShift = sortedShifts[i];
      const nextShift = sortedShifts[i + 1];

      const restHours = differenceInHours(nextShift.startTime, currentShift.endTime);

      if (restHours < settings.minimumRestHours) {
        conflicts.push({
          type: 'REST_PERIOD',
          severity: 'HIGH',
          description: `Only ${restHours} hours rest between shifts (minimum ${settings.minimumRestHours} required)`,
          shift1Id: currentShift.id,
          shift2Id: nextShift.id,
          employeeId,
        });
      }
    }

    // Check total hours per week
    const weekStart = new Date(sortedShifts[0].startTime);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekShifts = sortedShifts.filter(
      (s) => s.startTime >= weekStart && s.startTime < weekEnd
    );

    const totalWeekHours = weekShifts.reduce((sum, shift) => {
      return sum + differenceInHours(shift.endTime, shift.startTime);
    }, 0);

    if (totalWeekHours > settings.maxHoursPerWeek) {
      conflicts.push({
        type: 'OVERTIME',
        severity: 'MEDIUM',
        description: `Total hours (${totalWeekHours}) exceeds maximum (${settings.maxHoursPerWeek})`,
        employeeId,
      });
    }

    // Check availability patterns
    const patterns = availabilityPatterns.get(employeeId) || [];
    const exceptions = availabilityExceptions.get(employeeId) || [];

    for (const shift of sortedShifts) {
      if (!isEmployeeAvailable(shift, patterns, exceptions)) {
        conflicts.push({
          type: 'UNAVAILABLE',
          severity: 'HIGH',
          description: 'Employee marked as unavailable for this time',
          shift1Id: shift.id,
          employeeId,
        });
      }
    }

    // Check skill requirements
    const skills = employeeSkills.get(employeeId) || [];
    for (const shift of sortedShifts) {
      if (shift.requiredSkills.length > 0) {
        const missingSkills = shift.requiredSkills.filter(
          (skill) => !skills.includes(skill)
        );

        if (missingSkills.length > 0) {
          conflicts.push({
            type: 'SKILL_MISMATCH',
            severity: 'MEDIUM',
            description: `Employee missing required skills: ${missingSkills.join(', ')}`,
            shift1Id: shift.id,
            employeeId,
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Check if employee is available for a shift
 */
function isEmployeeAvailable(
  shift: Shift,
  patterns: AvailabilityPattern[],
  exceptions: AvailabilityException[]
): boolean {
  const shiftDate = shift.startTime;
  const dayOfWeek = shiftDate.getDay();

  // Check exceptions first (they override patterns)
  const exception = exceptions.find((e) => {
    const exceptionDate = new Date(e.date);
    return (
      exceptionDate.getFullYear() === shiftDate.getFullYear() &&
      exceptionDate.getMonth() === shiftDate.getMonth() &&
      exceptionDate.getDate() === shiftDate.getDate()
    );
  });

  if (exception) {
    return exception.isAvailable;
  }

  // Check recurring pattern
  const pattern = patterns.find((p) => p.dayOfWeek === dayOfWeek);
  
  if (!pattern) {
    return true; // No pattern = available by default
  }

  return pattern.isAvailable;
}

/**
 * Get conflict summary for display
 */
export function getConflictSummary(conflicts: Conflict[]): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<string, number>;
} {
  const summary = {
    total: conflicts.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byType: {} as Record<string, number>,
  };

  for (const conflict of conflicts) {
    // Count by severity
    summary[conflict.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low']++;

    // Count by type
    summary.byType[conflict.type] = (summary.byType[conflict.type] || 0) + 1;
  }

  return summary;
}
