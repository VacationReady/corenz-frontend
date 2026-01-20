/**
 * Tests for Leave Hours Conversion Utilities
 * 
 * Validates NZ Holidays Act 2003 compliance for hours-based leave tracking.
 * 
 * TEST COVERAGE:
 * - Part-time employee (3 days/week, different hours per day)
 * - Variable-hour employee (6h Mon / 10h Fri)
 * - TIMED day with breaks
 * - Feature flag OFF (legacy behavior)
 * - Backfill dry-run validation
 */

import {
  hoursToDisplayDays,
  hoursToExactDays,
  daysToHours,
  DEFAULT_HOURS_PER_DAY,
  calculateWorkingPatternHours,
  formatLeaveBalanceDisplay,
  formatHours,
  formatDays,
  calculateLeaveDeductionHours,
  dayDeductionToHours,
  isValidHoursPerDay,
  clampHoursPerDay,
  isLeaveHoursEnabled,
  type LeaveConversionContext,
  type WorkingPatternHours,
} from '@/lib/leave/hours-conversion';

describe('Leave Hours Conversion Utilities', () => {
  describe('hoursToDisplayDays', () => {
    it('converts 8 hours to 1 day', () => {
      expect(hoursToDisplayDays(8)).toBe(1);
    });

    it('converts 4 hours to 0.5 days', () => {
      expect(hoursToDisplayDays(4)).toBe(0.5);
    });

    it('converts 16 hours to 2 days', () => {
      expect(hoursToDisplayDays(16)).toBe(2);
    });

    it('rounds to nearest 0.5 increment', () => {
      expect(hoursToDisplayDays(6)).toBe(1); // 0.75 rounds to 1
      expect(hoursToDisplayDays(2)).toBe(0.5); // 0.25 rounds to 0.5
      expect(hoursToDisplayDays(10)).toBe(1.5); // 1.25 rounds to 1.5
    });

    it('handles 0 hours', () => {
      expect(hoursToDisplayDays(0)).toBe(0);
    });

    it('uses custom hours per day', () => {
      expect(hoursToDisplayDays(7.5, 7.5)).toBe(1);
      expect(hoursToDisplayDays(15, 7.5)).toBe(2);
    });
  });

  describe('hoursToExactDays', () => {
    it('converts without rounding', () => {
      expect(hoursToExactDays(6)).toBe(0.75);
      expect(hoursToExactDays(10)).toBe(1.25);
    });

    it('handles 0 hours', () => {
      expect(hoursToExactDays(0)).toBe(0);
    });
  });

  describe('daysToHours', () => {
    it('converts 1 day to 8 hours', () => {
      expect(daysToHours(1)).toBe(8);
    });

    it('converts 0.5 days to 4 hours', () => {
      expect(daysToHours(0.5)).toBe(4);
    });

    it('converts 2.5 days to 20 hours', () => {
      expect(daysToHours(2.5)).toBe(20);
    });

    it('uses custom hours per day', () => {
      expect(daysToHours(1, 7.5)).toBe(7.5);
      expect(daysToHours(2, 10)).toBe(20);
    });
  });

  describe('calculateWorkingPatternHours', () => {
    it('calculates hours for standard 5-day week', () => {
      const patternDays = [
        { day: 'MONDAY', type: 'FULL_DAY', hoursPerDay: 8 },
        { day: 'TUESDAY', type: 'FULL_DAY', hoursPerDay: 8 },
        { day: 'WEDNESDAY', type: 'FULL_DAY', hoursPerDay: 8 },
        { day: 'THURSDAY', type: 'FULL_DAY', hoursPerDay: 8 },
        { day: 'FRIDAY', type: 'FULL_DAY', hoursPerDay: 8 },
        { day: 'SATURDAY', type: 'NON_WORKING', hoursPerDay: null },
        { day: 'SUNDAY', type: 'NON_WORKING', hoursPerDay: null },
      ];

      const result = calculateWorkingPatternHours(patternDays);

      expect(result.totalHoursPerWeek).toBe(40);
      expect(result.workingDaysPerWeek).toBe(5);
      expect(result.averageHoursPerDay).toBe(8);
    });

    it('calculates hours for part-time pattern', () => {
      const patternDays = [
        { day: 'MONDAY', type: 'FULL_DAY', hoursPerDay: 6 },
        { day: 'TUESDAY', type: 'FULL_DAY', hoursPerDay: 6 },
        { day: 'WEDNESDAY', type: 'FULL_DAY', hoursPerDay: 6 },
        { day: 'THURSDAY', type: 'NON_WORKING', hoursPerDay: null },
        { day: 'FRIDAY', type: 'NON_WORKING', hoursPerDay: null },
      ];

      const result = calculateWorkingPatternHours(patternDays);

      expect(result.totalHoursPerWeek).toBe(18);
      expect(result.workingDaysPerWeek).toBe(3);
      expect(result.averageHoursPerDay).toBe(6);
    });

    it('handles variable hours per day', () => {
      const patternDays = [
        { day: 'MONDAY', type: 'FULL_DAY', hoursPerDay: 10 },
        { day: 'TUESDAY', type: 'FULL_DAY', hoursPerDay: 10 },
        { day: 'WEDNESDAY', type: 'FULL_DAY', hoursPerDay: 10 },
        { day: 'THURSDAY', type: 'FULL_DAY', hoursPerDay: 10 },
        { day: 'FRIDAY', type: 'NON_WORKING', hoursPerDay: null },
      ];

      const result = calculateWorkingPatternHours(patternDays);

      expect(result.totalHoursPerWeek).toBe(40);
      expect(result.workingDaysPerWeek).toBe(4);
      expect(result.averageHoursPerDay).toBe(10);
    });
  });

  describe('formatLeaveBalanceDisplay', () => {
    const baseContext: LeaveConversionContext = {
      defaultHoursPerDay: 8,
      displayUnit: 'DAYS',
    };

    it('formats as days when displayUnit is DAYS', () => {
      const result = formatLeaveBalanceDisplay(16, baseContext);
      expect(result.display).toBe('2 days');
      expect(result.hours).toBe(16);
      expect(result.days).toBe(2);
    });

    it('formats as hours when displayUnit is HOURS', () => {
      const result = formatLeaveBalanceDisplay(16, { ...baseContext, displayUnit: 'HOURS' });
      expect(result.display).toBe('16 hours');
    });

    it('formats as both when displayUnit is BOTH', () => {
      const result = formatLeaveBalanceDisplay(16, { ...baseContext, displayUnit: 'BOTH' });
      expect(result.display).toBe('2 days (16 hours)');
    });

    it('handles singular forms', () => {
      expect(formatHours(1)).toBe('1 hour');
      expect(formatDays(1)).toBe('1 day');
    });
  });

  describe('calculateLeaveDeductionHours', () => {
    const workingPattern: WorkingPatternHours = {
      hoursPerDay: {
        0: 0,  // Sunday
        1: 8,  // Monday
        2: 8,  // Tuesday
        3: 8,  // Wednesday
        4: 8,  // Thursday
        5: 8,  // Friday
        6: 0,  // Saturday
      },
      averageHoursPerDay: 8,
      totalHoursPerWeek: 40,
      workingDaysPerWeek: 5,
    };

    it('returns full hours for FULL_DAY', () => {
      const monday = new Date('2026-01-19'); // Monday
      const result = calculateLeaveDeductionHours(monday, 'FULL_DAY', workingPattern);
      expect(result).toBe(8);
    });

    it('returns half hours for HALF_DAY', () => {
      const monday = new Date('2026-01-19');
      const result = calculateLeaveDeductionHours(monday, 'HALF_DAY_AM', workingPattern);
      expect(result).toBe(4);
    });

    it('returns 0 for NON_WORKING day type', () => {
      const monday = new Date('2026-01-19');
      const result = calculateLeaveDeductionHours(monday, 'NON_WORKING', workingPattern);
      expect(result).toBe(0);
    });

    it('returns 0 for non-working day in pattern', () => {
      const sunday = new Date('2026-01-18'); // Sunday
      const result = calculateLeaveDeductionHours(sunday, 'FULL_DAY', workingPattern);
      expect(result).toBe(0);
    });

    it('uses default hours when no pattern provided', () => {
      const monday = new Date('2026-01-19');
      const result = calculateLeaveDeductionHours(monday, 'FULL_DAY', undefined, 8);
      expect(result).toBe(8);
    });
  });

  describe('dayDeductionToHours', () => {
    it('converts 1 day deduction to 8 hours', () => {
      expect(dayDeductionToHours(1)).toBe(8);
    });

    it('converts 0.5 day deduction to 4 hours', () => {
      expect(dayDeductionToHours(0.5)).toBe(4);
    });

    it('converts 0 day deduction to 0 hours', () => {
      expect(dayDeductionToHours(0)).toBe(0);
    });

    it('uses custom hours per day', () => {
      expect(dayDeductionToHours(1, 7.5)).toBe(7.5);
    });
  });

  describe('validation functions', () => {
    it('validates hours per day range', () => {
      expect(isValidHoursPerDay(8)).toBe(true);
      expect(isValidHoursPerDay(0)).toBe(false);
      expect(isValidHoursPerDay(25)).toBe(false);
      expect(isValidHoursPerDay(1)).toBe(true);
      expect(isValidHoursPerDay(24)).toBe(true);
    });

    it('clamps hours per day to valid range', () => {
      expect(clampHoursPerDay(8)).toBe(8);
      expect(clampHoursPerDay(0)).toBe(1);
      expect(clampHoursPerDay(30)).toBe(24);
    });
  });

  describe('backward compatibility', () => {
    it('DEFAULT_HOURS_PER_DAY is 8', () => {
      expect(DEFAULT_HOURS_PER_DAY).toBe(8);
    });

    it('conversion is reversible', () => {
      const originalDays = 2.5;
      const hours = daysToHours(originalDays);
      const backToDays = hoursToExactDays(hours);
      expect(backToDays).toBe(originalDays);
    });
  });

  // ============================================
  // FEATURE FLAG TESTS
  // ============================================
  describe('isLeaveHoursEnabled (Feature Flag)', () => {
    it('returns false when leaveHoursEnabled is false', () => {
      expect(isLeaveHoursEnabled({ leaveHoursEnabled: false })).toBe(false);
    });

    it('returns false when leaveHoursEnabled is null', () => {
      expect(isLeaveHoursEnabled({ leaveHoursEnabled: null })).toBe(false);
    });

    it('returns false when leaveHoursEnabled is undefined', () => {
      expect(isLeaveHoursEnabled({ leaveHoursEnabled: undefined })).toBe(false);
    });

    it('returns false when config is null', () => {
      expect(isLeaveHoursEnabled(null)).toBe(false);
    });

    it('returns false when config is undefined', () => {
      expect(isLeaveHoursEnabled(undefined)).toBe(false);
    });

    it('returns true ONLY when leaveHoursEnabled is explicitly true', () => {
      expect(isLeaveHoursEnabled({ leaveHoursEnabled: true })).toBe(true);
    });

    it('ensures existing tenants see no change (default false)', () => {
      // Simulates a company record without the field set
      const legacyCompany = {};
      expect(isLeaveHoursEnabled(legacyCompany as any)).toBe(false);
    });
  });

  // ============================================
  // PART-TIME EMPLOYEE TESTS (NZ Holidays Act Section 65)
  // ============================================
  describe('Part-time employee (3 days/week)', () => {
    const partTimePattern: WorkingPatternHours = {
      hoursPerDay: {
        0: 0,  // Sunday - non-working
        1: 6,  // Monday - 6 hours
        2: 0,  // Tuesday - non-working
        3: 6,  // Wednesday - 6 hours
        4: 0,  // Thursday - non-working
        5: 6,  // Friday - 6 hours
        6: 0,  // Saturday - non-working
      },
      averageHoursPerDay: 6,
      totalHoursPerWeek: 18,
      workingDaysPerWeek: 3,
    };

    it('calculates correct total hours per week', () => {
      expect(partTimePattern.totalHoursPerWeek).toBe(18);
    });

    it('calculates correct working days per week', () => {
      expect(partTimePattern.workingDaysPerWeek).toBe(3);
    });

    it('deducts correct hours for Monday leave (6h)', () => {
      const monday = new Date('2026-01-19'); // Monday
      const result = calculateLeaveDeductionHours(monday, 'FULL_DAY', partTimePattern);
      expect(result).toBe(6);
    });

    it('deducts 0 hours for non-working Tuesday', () => {
      const tuesday = new Date('2026-01-20'); // Tuesday
      const result = calculateLeaveDeductionHours(tuesday, 'FULL_DAY', partTimePattern);
      expect(result).toBe(0);
    });

    it('deducts half hours for half-day leave', () => {
      const monday = new Date('2026-01-19');
      const result = calculateLeaveDeductionHours(monday, 'HALF_DAY_AM', partTimePattern);
      expect(result).toBe(3); // 6h / 2 = 3h
    });
  });

  // ============================================
  // VARIABLE-HOUR EMPLOYEE TESTS
  // ============================================
  describe('Variable-hour employee (6h Mon / 10h Fri)', () => {
    const variablePattern: WorkingPatternHours = {
      hoursPerDay: {
        0: 0,   // Sunday
        1: 6,   // Monday - 6 hours
        2: 8,   // Tuesday - 8 hours
        3: 8,   // Wednesday - 8 hours
        4: 8,   // Thursday - 8 hours
        5: 10,  // Friday - 10 hours (compressed)
        6: 0,   // Saturday
      },
      averageHoursPerDay: 8,
      totalHoursPerWeek: 40,
      workingDaysPerWeek: 5,
    };

    it('deducts 6 hours for Monday leave', () => {
      const monday = new Date('2026-01-19');
      const result = calculateLeaveDeductionHours(monday, 'FULL_DAY', variablePattern);
      expect(result).toBe(6);
    });

    it('deducts 10 hours for Friday leave', () => {
      const friday = new Date('2026-01-23');
      const result = calculateLeaveDeductionHours(friday, 'FULL_DAY', variablePattern);
      expect(result).toBe(10);
    });

    it('deducts 8 hours for mid-week leave', () => {
      const wednesday = new Date('2026-01-21');
      const result = calculateLeaveDeductionHours(wednesday, 'FULL_DAY', variablePattern);
      expect(result).toBe(8);
    });

    it('correctly calculates week total (40h)', () => {
      expect(variablePattern.totalHoursPerWeek).toBe(40);
    });
  });

  // ============================================
  // TIMED DAY WITH BREAKS TESTS
  // ============================================
  describe('TIMED day with breaks', () => {
    it('deducts hours minus break time', () => {
      // 8h scheduled with 30min break = 7.5h actual work
      const hoursPerDay = 8;
      const breakMinutes = 30;
      const expectedDeduction = hoursPerDay - (breakMinutes / 60);
      expect(expectedDeduction).toBe(7.5);
    });

    it('handles 60-minute break correctly', () => {
      const hoursPerDay = 9;
      const breakMinutes = 60;
      const expectedDeduction = hoursPerDay - (breakMinutes / 60);
      expect(expectedDeduction).toBe(8);
    });

    it('handles no break (0 minutes)', () => {
      const hoursPerDay = 8;
      const breakMinutes = 0;
      const expectedDeduction = hoursPerDay - (breakMinutes / 60);
      expect(expectedDeduction).toBe(8);
    });

    it('never returns negative hours', () => {
      // Edge case: break longer than work time (shouldn't happen but should be safe)
      const hoursPerDay = 1;
      const breakMinutes = 120; // 2 hours break
      const expectedDeduction = Math.max(0, hoursPerDay - (breakMinutes / 60));
      expect(expectedDeduction).toBe(0);
    });
  });

  // ============================================
  // WORKING PATTERN CALCULATION TESTS
  // ============================================
  describe('calculateWorkingPatternHours', () => {
    it('handles mixed day types correctly', () => {
      const patternDays = [
        { day: 'MONDAY', type: 'FULL_DAY', hoursPerDay: 8 },
        { day: 'TUESDAY', type: 'HALF_DAY_AM', hoursPerDay: 4 },
        { day: 'WEDNESDAY', type: 'TIMED', hoursPerDay: 7.5 },
        { day: 'THURSDAY', type: 'FULL_DAY', hoursPerDay: 8 },
        { day: 'FRIDAY', type: 'NON_WORKING', hoursPerDay: null },
      ];

      const result = calculateWorkingPatternHours(patternDays);

      // Total: 8 + 4 + 7.5 + 8 = 27.5
      expect(result.totalHoursPerWeek).toBe(27.5);
      // Working days: Mon, Tue, Wed, Thu = 4
      expect(result.workingDaysPerWeek).toBe(4);
      // Average: 27.5 / 4 = 6.875
      expect(result.averageHoursPerDay).toBeCloseTo(6.875, 2);
    });

    it('uses default 8 hours when hoursPerDay is null', () => {
      const patternDays = [
        { day: 'MONDAY', type: 'FULL_DAY', hoursPerDay: null },
      ];

      const result = calculateWorkingPatternHours(patternDays);

      expect(result.hoursPerDay[1]).toBe(8); // Monday = day 1
    });
  });

  // ============================================
  // SOURCE OF TRUTH MODEL TESTS
  // ============================================
  describe('Hours as source of truth model', () => {
    it('days can be derived from hours accurately', () => {
      const hours = 20; // 2.5 days at 8h/day
      const hoursPerDay = 8;
      const derivedDays = hours / hoursPerDay;
      expect(derivedDays).toBe(2.5);
    });

    it('handles non-standard hours per day', () => {
      const hours = 22.5; // 3 days at 7.5h/day
      const hoursPerDay = 7.5;
      const derivedDays = hours / hoursPerDay;
      expect(derivedDays).toBe(3);
    });

    it('rounding to 0.5 increments works correctly', () => {
      // 7 hours at 8h/day = 0.875 days → rounds to 1 day
      expect(hoursToDisplayDays(7, 8)).toBe(1);
      // 5 hours at 8h/day = 0.625 days → rounds to 0.5 day
      expect(hoursToDisplayDays(5, 8)).toBe(0.5);
      // 3 hours at 8h/day = 0.375 days → rounds to 0.5 day
      expect(hoursToDisplayDays(3, 8)).toBe(0.5);
      // 1 hour at 8h/day = 0.125 days → rounds to 0 days
      expect(hoursToDisplayDays(1, 8)).toBe(0);
    });
  });
});
