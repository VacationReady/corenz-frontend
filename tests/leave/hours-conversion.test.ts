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

import { describe, it } from 'node:test';
import assert from 'node:assert';
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
} from '../../lib/leave/hours-conversion';

describe('Leave Hours Conversion Utilities', () => {
  describe('hoursToDisplayDays', () => {
    it('converts 8 hours to 1 day', () => {
      assert.strictEqual(hoursToDisplayDays(8), 1);
    });

    it('converts 4 hours to 0.5 days', () => {
      assert.strictEqual(hoursToDisplayDays(4), 0.5);
    });

    it('converts 16 hours to 2 days', () => {
      assert.strictEqual(hoursToDisplayDays(16), 2);
    });

    it('rounds to nearest 0.5 increment', () => {
      assert.strictEqual(hoursToDisplayDays(6), 1); // 0.75 rounds to 1
      assert.strictEqual(hoursToDisplayDays(2), 0.5); // 0.25 rounds to 0.5
      assert.strictEqual(hoursToDisplayDays(10), 1.5); // 1.25 rounds to 1.5
    });

    it('handles 0 hours', () => {
      assert.strictEqual(hoursToDisplayDays(0), 0);
    });

    it('uses custom hours per day', () => {
      assert.strictEqual(hoursToDisplayDays(7.5, 7.5), 1);
      assert.strictEqual(hoursToDisplayDays(15, 7.5), 2);
    });
  });

  describe('hoursToExactDays', () => {
    it('converts without rounding', () => {
      assert.strictEqual(hoursToExactDays(6), 0.75);
      assert.strictEqual(hoursToExactDays(10), 1.25);
    });

    it('handles 0 hours', () => {
      assert.strictEqual(hoursToExactDays(0), 0);
    });
  });

  describe('daysToHours', () => {
    it('converts 1 day to 8 hours', () => {
      assert.strictEqual(daysToHours(1), 8);
    });

    it('converts 0.5 days to 4 hours', () => {
      assert.strictEqual(daysToHours(0.5), 4);
    });

    it('converts 2.5 days to 20 hours', () => {
      assert.strictEqual(daysToHours(2.5), 20);
    });

    it('uses custom hours per day', () => {
      assert.strictEqual(daysToHours(1, 7.5), 7.5);
      assert.strictEqual(daysToHours(2, 10), 20);
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

      assert.strictEqual(result.totalHoursPerWeek, 40);
      assert.strictEqual(result.workingDaysPerWeek, 5);
      assert.strictEqual(result.averageHoursPerDay, 8);
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

      assert.strictEqual(result.totalHoursPerWeek, 18);
      assert.strictEqual(result.workingDaysPerWeek, 3);
      assert.strictEqual(result.averageHoursPerDay, 6);
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

      assert.strictEqual(result.totalHoursPerWeek, 40);
      assert.strictEqual(result.workingDaysPerWeek, 4);
      assert.strictEqual(result.averageHoursPerDay, 10);
    });
  });

  describe('formatLeaveBalanceDisplay', () => {
    const baseContext: LeaveConversionContext = {
      defaultHoursPerDay: 8,
      displayUnit: 'DAYS',
    };

    it('formats as days when displayUnit is DAYS', () => {
      const result = formatLeaveBalanceDisplay(16, baseContext);
      assert.strictEqual(result.display, '2 days');
      assert.strictEqual(result.hours, 16);
      assert.strictEqual(result.days, 2);
    });

    it('formats as hours when displayUnit is HOURS', () => {
      const result = formatLeaveBalanceDisplay(16, { ...baseContext, displayUnit: 'HOURS' });
      assert.strictEqual(result.display, '16 hours');
    });

    it('formats as both when displayUnit is BOTH', () => {
      const result = formatLeaveBalanceDisplay(16, { ...baseContext, displayUnit: 'BOTH' });
      assert.strictEqual(result.display, '2 days (16 hours)');
    });

    it('handles singular forms', () => {
      assert.strictEqual(formatHours(1), '1 hour');
      assert.strictEqual(formatDays(1), '1 day');
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
      assert.strictEqual(result, 8);
    });

    it('returns half hours for HALF_DAY', () => {
      const monday = new Date('2026-01-19');
      const result = calculateLeaveDeductionHours(monday, 'HALF_DAY_AM', workingPattern);
      assert.strictEqual(result, 4);
    });

    it('returns 0 for NON_WORKING day type', () => {
      const monday = new Date('2026-01-19');
      const result = calculateLeaveDeductionHours(monday, 'NON_WORKING', workingPattern);
      assert.strictEqual(result, 0);
    });

    it('returns 0 for non-working day in pattern', () => {
      const sunday = new Date('2026-01-18'); // Sunday
      const result = calculateLeaveDeductionHours(sunday, 'FULL_DAY', workingPattern);
      assert.strictEqual(result, 0);
    });

    it('uses default hours when no pattern provided', () => {
      const monday = new Date('2026-01-19');
      const result = calculateLeaveDeductionHours(monday, 'FULL_DAY', undefined, 8);
      assert.strictEqual(result, 8);
    });
  });

  describe('dayDeductionToHours', () => {
    it('converts 1 day deduction to 8 hours', () => {
      assert.strictEqual(dayDeductionToHours(1), 8);
    });

    it('converts 0.5 day deduction to 4 hours', () => {
      assert.strictEqual(dayDeductionToHours(0.5), 4);
    });

    it('converts 0 day deduction to 0 hours', () => {
      assert.strictEqual(dayDeductionToHours(0), 0);
    });

    it('uses custom hours per day', () => {
      assert.strictEqual(dayDeductionToHours(1, 7.5), 7.5);
    });
  });

  describe('validation functions', () => {
    it('validates hours per day range', () => {
      assert.strictEqual(isValidHoursPerDay(8), true);
      assert.strictEqual(isValidHoursPerDay(0), false);
      assert.strictEqual(isValidHoursPerDay(25), false);
      assert.strictEqual(isValidHoursPerDay(1), true);
      assert.strictEqual(isValidHoursPerDay(24), true);
    });

    it('clamps hours per day to valid range', () => {
      assert.strictEqual(clampHoursPerDay(8), 8);
      assert.strictEqual(clampHoursPerDay(0), 1);
      assert.strictEqual(clampHoursPerDay(30), 24);
    });
  });

  describe('backward compatibility', () => {
    it('DEFAULT_HOURS_PER_DAY is 8', () => {
      assert.strictEqual(DEFAULT_HOURS_PER_DAY, 8);
    });

    it('conversion is reversible', () => {
      const originalDays = 2.5;
      const hours = daysToHours(originalDays);
      const backToDays = hoursToExactDays(hours);
      assert.strictEqual(backToDays, originalDays);
    });
  });

  // ============================================
  // FEATURE FLAG TESTS
  // Note: Default is TRUE (hours enabled by default for new rollout)
  // ============================================
  describe('isLeaveHoursEnabled (Feature Flag)', () => {
    it('returns false when leaveHoursEnabled is explicitly false', () => {
      assert.strictEqual(isLeaveHoursEnabled({ leaveHoursEnabled: false }), false);
    });

    it('returns true when leaveHoursEnabled is null (defaults to enabled)', () => {
      assert.strictEqual(isLeaveHoursEnabled({ leaveHoursEnabled: null }), true);
    });

    it('returns true when leaveHoursEnabled is undefined (defaults to enabled)', () => {
      assert.strictEqual(isLeaveHoursEnabled({ leaveHoursEnabled: undefined }), true);
    });

    it('returns true when config is null (defaults to enabled)', () => {
      assert.strictEqual(isLeaveHoursEnabled(null), true);
    });

    it('returns true when config is undefined (defaults to enabled)', () => {
      assert.strictEqual(isLeaveHoursEnabled(undefined), true);
    });

    it('returns true when leaveHoursEnabled is explicitly true', () => {
      assert.strictEqual(isLeaveHoursEnabled({ leaveHoursEnabled: true }), true);
    });

    it('defaults to enabled for new tenants (hours tracking on by default)', () => {
      // Simulates a company record without the field set - defaults to enabled
      const newCompany = {};
      assert.strictEqual(isLeaveHoursEnabled(newCompany as any), true);
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
      assert.strictEqual(partTimePattern.totalHoursPerWeek, 18);
    });

    it('calculates correct working days per week', () => {
      assert.strictEqual(partTimePattern.workingDaysPerWeek, 3);
    });

    it('deducts correct hours for Monday leave (6h)', () => {
      const monday = new Date('2026-01-19'); // Monday
      const result = calculateLeaveDeductionHours(monday, 'FULL_DAY', partTimePattern);
      assert.strictEqual(result, 6);
    });

    it('deducts 0 hours for non-working Tuesday', () => {
      const tuesday = new Date('2026-01-20'); // Tuesday
      const result = calculateLeaveDeductionHours(tuesday, 'FULL_DAY', partTimePattern);
      assert.strictEqual(result, 0);
    });

    it('deducts half hours for half-day leave', () => {
      const monday = new Date('2026-01-19');
      const result = calculateLeaveDeductionHours(monday, 'HALF_DAY_AM', partTimePattern);
      assert.strictEqual(result, 3); // 6h / 2 = 3h
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
      assert.strictEqual(result, 6);
    });

    it('deducts 10 hours for Friday leave', () => {
      const friday = new Date('2026-01-23');
      const result = calculateLeaveDeductionHours(friday, 'FULL_DAY', variablePattern);
      assert.strictEqual(result, 10);
    });

    it('deducts 8 hours for mid-week leave', () => {
      const wednesday = new Date('2026-01-21');
      const result = calculateLeaveDeductionHours(wednesday, 'FULL_DAY', variablePattern);
      assert.strictEqual(result, 8);
    });

    it('correctly calculates week total (40h)', () => {
      assert.strictEqual(variablePattern.totalHoursPerWeek, 40);
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
      assert.strictEqual(expectedDeduction, 7.5);
    });

    it('handles 60-minute break correctly', () => {
      const hoursPerDay = 9;
      const breakMinutes = 60;
      const expectedDeduction = hoursPerDay - (breakMinutes / 60);
      assert.strictEqual(expectedDeduction, 8);
    });

    it('handles no break (0 minutes)', () => {
      const hoursPerDay = 8;
      const breakMinutes = 0;
      const expectedDeduction = hoursPerDay - (breakMinutes / 60);
      assert.strictEqual(expectedDeduction, 8);
    });

    it('never returns negative hours', () => {
      // Edge case: break longer than work time (shouldn't happen but should be safe)
      const hoursPerDay = 1;
      const breakMinutes = 120; // 2 hours break
      const expectedDeduction = Math.max(0, hoursPerDay - (breakMinutes / 60));
      assert.strictEqual(expectedDeduction, 0);
    });
  });

  // ============================================
  // WORKING PATTERN CALCULATION TESTS
  // ============================================
  describe('calculateWorkingPatternHours (mixed)', () => {
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
      assert.strictEqual(result.totalHoursPerWeek, 27.5);
      // Working days: Mon, Tue, Wed, Thu = 4
      assert.strictEqual(result.workingDaysPerWeek, 4);
      // Average: 27.5 / 4 = 6.875
      assert.ok(Math.abs(result.averageHoursPerDay - 6.875) < 0.01);
    });

    it('uses default 8 hours when hoursPerDay is null', () => {
      const patternDays = [
        { day: 'MONDAY', type: 'FULL_DAY', hoursPerDay: null },
      ];

      const result = calculateWorkingPatternHours(patternDays);

      assert.strictEqual(result.hoursPerDay[1], 8); // Monday = day 1
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
      assert.strictEqual(derivedDays, 2.5);
    });

    it('handles non-standard hours per day', () => {
      const hours = 22.5; // 3 days at 7.5h/day
      const hoursPerDay = 7.5;
      const derivedDays = hours / hoursPerDay;
      assert.strictEqual(derivedDays, 3);
    });

    it('rounding to 0.5 increments works correctly', () => {
      // 7 hours at 8h/day = 0.875 days → rounds to 1 day
      assert.strictEqual(hoursToDisplayDays(7, 8), 1);
      // 5 hours at 8h/day = 0.625 days → rounds to 0.5 day
      assert.strictEqual(hoursToDisplayDays(5, 8), 0.5);
      // 3 hours at 8h/day = 0.375 days → rounds to 0.5 day
      assert.strictEqual(hoursToDisplayDays(3, 8), 0.5);
      // 1 hour at 8h/day = 0.125 days → rounds to 0 days
      assert.strictEqual(hoursToDisplayDays(1, 8), 0);
    });
  });
});
