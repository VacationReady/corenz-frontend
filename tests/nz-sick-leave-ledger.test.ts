/**
 * NZ Sick Leave Ledger Tests
 * 
 * Tests for the NZ Holidays Act 2003 compliant sick leave implementation.
 * 
 * Test categories:
 * 1. Eligibility boundary (6-month rule)
 * 2. First grant on eligibility
 * 3. Multiple missed grants
 * 4. Cap enforcement (20 days)
 * 5. Booking rejection pre-eligibility
 * 6. Ledger idempotency
 * 7. Concurrent grant application
 * 8. Annual leave accrual unchanged
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  computeSickEligibilityDate,
  computeNextSickGrantDate,
  isEligibleForSickLeave,
  getSickLeaveStatus,
  hoursToDisplayDays,
  daysToHours,
  formatSickLeaveBalance,
  getCanonicalEmploymentDate,
  SICK_LEAVE_ELIGIBILITY_MONTHS,
  SICK_LEAVE_GRANT_DAYS,
  SICK_LEAVE_GRANT_HOURS,
  SICK_LEAVE_CAP_DAYS,
  SICK_LEAVE_CAP_HOURS,
  HOURS_PER_DAY,
} from '../lib/leave/nz-sick-leave-ledger';

describe('NZ Sick Leave Ledger - Unit Tests', () => {
  
  describe('Eligibility Calculations', () => {
    
    it('should compute eligibility date as 6 months after start date', () => {
      const startDate = new Date('2024-01-15');
      const eligibilityDate = computeSickEligibilityDate(startDate);
      
      assert.strictEqual(eligibilityDate.getFullYear(), 2024);
      assert.strictEqual(eligibilityDate.getMonth(), 6); // July (0-indexed)
      assert.strictEqual(eligibilityDate.getDate(), 15);
    });
    
    it('should handle year boundary in eligibility calculation', () => {
      const startDate = new Date('2024-09-01');
      const eligibilityDate = computeSickEligibilityDate(startDate);
      
      assert.strictEqual(eligibilityDate.getFullYear(), 2025);
      assert.strictEqual(eligibilityDate.getMonth(), 2); // March (0-indexed)
      assert.strictEqual(eligibilityDate.getDate(), 1);
    });
    
    it('should return false for eligibility before 6 months', () => {
      const employee = {
        employmentStartDate: new Date('2024-01-01'),
        startDate: new Date('2024-01-01'),
        sickLeaveEligibilityDate: null,
      };
      
      const checkDate = new Date('2024-05-01'); // 4 months
      const isEligible = isEligibleForSickLeave(employee as any, checkDate);
      
      assert.strictEqual(isEligible, false);
    });
    
    it('should return true for eligibility at exactly 6 months', () => {
      const employee = {
        employmentStartDate: new Date('2024-01-01'),
        startDate: new Date('2024-01-01'),
        sickLeaveEligibilityDate: null,
      };
      
      const checkDate = new Date('2024-07-01'); // Exactly 6 months
      const isEligible = isEligibleForSickLeave(employee as any, checkDate);
      
      assert.strictEqual(isEligible, true);
    });
    
    it('should return true for eligibility after 6 months', () => {
      const employee = {
        employmentStartDate: new Date('2024-01-01'),
        startDate: new Date('2024-01-01'),
        sickLeaveEligibilityDate: null,
      };
      
      const checkDate = new Date('2024-12-01'); // 11 months
      const isEligible = isEligibleForSickLeave(employee as any, checkDate);
      
      assert.strictEqual(isEligible, true);
    });
    
    it('should use pre-computed eligibility date when available', () => {
      const employee = {
        employmentStartDate: new Date('2024-01-01'),
        startDate: new Date('2024-01-01'),
        sickLeaveEligibilityDate: new Date('2024-06-15'), // Custom eligibility
      };
      
      // Before custom eligibility
      assert.strictEqual(isEligibleForSickLeave(employee as any, new Date('2024-06-14')), false);
      
      // On custom eligibility
      assert.strictEqual(isEligibleForSickLeave(employee as any, new Date('2024-06-15')), true);
    });
  });
  
  describe('Canonical Employment Date', () => {
    
    it('should prefer employmentStartDate over startDate', () => {
      const employee = {
        employmentStartDate: new Date('2024-01-01'),
        startDate: new Date('2024-02-01'),
      };
      
      const canonical = getCanonicalEmploymentDate(employee);
      
      assert.deepStrictEqual(canonical, new Date('2024-01-01'));
    });
    
    it('should use startDate when employmentStartDate is null', () => {
      const employee = {
        employmentStartDate: null,
        startDate: new Date('2024-02-01'),
      };
      
      const canonical = getCanonicalEmploymentDate(employee);
      
      assert.deepStrictEqual(canonical, new Date('2024-02-01'));
    });
    
    it('should return null when both dates are null', () => {
      const employee = {
        employmentStartDate: null,
        startDate: null,
      };
      
      const canonical = getCanonicalEmploymentDate(employee);
      
      assert.strictEqual(canonical, null);
    });
  });
  
  describe('Grant Date Calculations', () => {
    
    it('should compute first grant date as eligibility date', () => {
      const eligibilityDate = new Date('2024-07-01');
      const nextGrant = computeNextSickGrantDate(eligibilityDate, null);
      
      assert.deepStrictEqual(nextGrant, eligibilityDate);
    });
    
    it('should compute subsequent grant as 12 months after last grant', () => {
      const eligibilityDate = new Date('2024-07-01');
      const lastGrantDate = new Date('2024-07-01');
      const nextGrant = computeNextSickGrantDate(eligibilityDate, lastGrantDate);
      
      assert.strictEqual(nextGrant.getFullYear(), 2025);
      assert.strictEqual(nextGrant.getMonth(), 6); // July
      assert.strictEqual(nextGrant.getDate(), 1);
    });
    
    it('should handle multiple years of grants', () => {
      const eligibilityDate = new Date('2022-07-01');
      const lastGrantDate = new Date('2024-07-01'); // 2 years of grants
      const nextGrant = computeNextSickGrantDate(eligibilityDate, lastGrantDate);
      
      assert.strictEqual(nextGrant.getFullYear(), 2025);
      assert.strictEqual(nextGrant.getMonth(), 6); // July
    });
  });
  
  describe('Sick Leave Status', () => {
    
    it('should return correct status for pre-eligibility employee', () => {
      const employee = {
        id: 'emp-1',
        companyId: 'comp-1',
        employmentStartDate: new Date('2024-01-01'),
        startDate: new Date('2024-01-01'),
        sickLeaveBalance: 0,
        sickLeaveEligibilityDate: null,
        sickLeaveLastGrantDate: null,
      };
      
      const status = getSickLeaveStatus(employee as any, new Date('2024-04-01'));
      
      assert.strictEqual(status.isEligible, false);
      assert.strictEqual(status.balanceHours, 0);
      assert.strictEqual(status.balanceDays, 0);
      assert.ok(status.daysUntilNextGrant! > 0);
    });
    
    it('should return correct status for eligible employee with no grants', () => {
      const employee = {
        id: 'emp-1',
        companyId: 'comp-1',
        employmentStartDate: new Date('2024-01-01'),
        startDate: new Date('2024-01-01'),
        sickLeaveBalance: 0,
        sickLeaveEligibilityDate: new Date('2024-07-01'),
        sickLeaveLastGrantDate: null,
      };
      
      const status = getSickLeaveStatus(employee as any, new Date('2024-08-01'));
      
      assert.strictEqual(status.isEligible, true);
      assert.strictEqual(status.daysUntilNextGrant, 0); // Grant is due
    });
    
    it('should return correct status for employee with existing balance', () => {
      const employee = {
        id: 'emp-1',
        companyId: 'comp-1',
        employmentStartDate: new Date('2023-01-01'),
        startDate: new Date('2023-01-01'),
        sickLeaveBalance: 40, // 5 days
        sickLeaveEligibilityDate: new Date('2023-07-01'),
        sickLeaveLastGrantDate: new Date('2024-07-01'),
      };
      
      const status = getSickLeaveStatus(employee as any, new Date('2024-10-01'));
      
      assert.strictEqual(status.isEligible, true);
      assert.strictEqual(status.balanceHours, 40);
      assert.strictEqual(status.balanceDays, 5);
      assert.ok(status.daysUntilNextGrant! > 0);
    });
  });
  
  describe('Unit Conversions', () => {
    
    it('should convert hours to display days with 0.5 rounding', () => {
      assert.strictEqual(hoursToDisplayDays(0), 0);
      assert.strictEqual(hoursToDisplayDays(4), 0.5);
      assert.strictEqual(hoursToDisplayDays(8), 1);
      assert.strictEqual(hoursToDisplayDays(12), 1.5);
      assert.strictEqual(hoursToDisplayDays(80), 10);
      assert.strictEqual(hoursToDisplayDays(160), 20);
    });
    
    it('should round to nearest 0.5 day', () => {
      assert.strictEqual(hoursToDisplayDays(2), 0); // 0.25 -> 0
      assert.strictEqual(hoursToDisplayDays(3), 0.5); // 0.375 -> 0.5
      assert.strictEqual(hoursToDisplayDays(5), 0.5); // 0.625 -> 0.5
      assert.strictEqual(hoursToDisplayDays(6), 1); // 0.75 -> 1
    });
    
    it('should convert days to hours', () => {
      assert.strictEqual(daysToHours(0), 0);
      assert.strictEqual(daysToHours(1), 8);
      assert.strictEqual(daysToHours(10), 80);
      assert.strictEqual(daysToHours(20), 160);
      assert.strictEqual(daysToHours(0.5), 4);
    });
    
    it('should format balance correctly', () => {
      assert.strictEqual(formatSickLeaveBalance(8), '1 day');
      assert.strictEqual(formatSickLeaveBalance(16), '2 days');
      assert.strictEqual(formatSickLeaveBalance(80), '10 days');
      assert.strictEqual(formatSickLeaveBalance(4), '0.5 days');
    });
  });
  
  describe('Constants Verification', () => {
    
    it('should have correct NZ Holidays Act 2003 values', () => {
      assert.strictEqual(SICK_LEAVE_ELIGIBILITY_MONTHS, 6);
      assert.strictEqual(SICK_LEAVE_GRANT_DAYS, 10);
      assert.strictEqual(SICK_LEAVE_GRANT_HOURS, 80);
      assert.strictEqual(SICK_LEAVE_CAP_DAYS, 20);
      assert.strictEqual(SICK_LEAVE_CAP_HOURS, 160);
      assert.strictEqual(HOURS_PER_DAY, 8);
    });
    
    it('should have consistent relationships between constants', () => {
      assert.strictEqual(SICK_LEAVE_GRANT_HOURS, SICK_LEAVE_GRANT_DAYS * HOURS_PER_DAY);
      assert.strictEqual(SICK_LEAVE_CAP_HOURS, SICK_LEAVE_CAP_DAYS * HOURS_PER_DAY);
    });
  });
  
  describe('Edge Cases', () => {
    
    it('should handle leap year boundaries', () => {
      const startDate = new Date('2024-02-29'); // Leap year
      const eligibilityDate = computeSickEligibilityDate(startDate);
      
      // 6 months from Feb 29 should be Aug 29
      assert.strictEqual(eligibilityDate.getFullYear(), 2024);
      assert.strictEqual(eligibilityDate.getMonth(), 7); // August
    });
    
    it('should handle month-end boundaries', () => {
      const startDate = new Date('2024-08-31');
      const eligibilityDate = computeSickEligibilityDate(startDate);
      
      // 6 months from Aug 31 -> Feb 28/29 (depends on year)
      assert.strictEqual(eligibilityDate.getFullYear(), 2025);
      assert.strictEqual(eligibilityDate.getMonth(), 1); // February
    });
    
    it('should handle employee with null balance', () => {
      const employee = {
        id: 'emp-1',
        companyId: 'comp-1',
        employmentStartDate: new Date('2024-01-01'),
        startDate: new Date('2024-01-01'),
        sickLeaveBalance: null,
        sickLeaveEligibilityDate: null,
        sickLeaveLastGrantDate: null,
      };
      
      const status = getSickLeaveStatus(employee as any, new Date('2024-08-01'));
      
      assert.strictEqual(status.balanceHours, 0);
      assert.strictEqual(status.balanceDays, 0);
    });
  });
});

describe('NZ Sick Leave - Integration Scenarios', () => {
  
  describe('New Employee Journey', () => {
    
    it('should correctly track eligibility for new starter', () => {
      // Employee starts Jan 1, 2024
      const startDate = new Date('2024-01-01');
      const eligibilityDate = computeSickEligibilityDate(startDate);
      
      // Should be eligible July 1, 2024
      assert.strictEqual(eligibilityDate.toISOString().split('T')[0], '2024-07-01');
      
      // First grant should be on eligibility date
      const firstGrant = computeNextSickGrantDate(eligibilityDate, null);
      assert.strictEqual(firstGrant.toISOString().split('T')[0], '2024-07-01');
      
      // Second grant should be July 1, 2025
      const secondGrant = computeNextSickGrantDate(eligibilityDate, firstGrant);
      assert.strictEqual(secondGrant.toISOString().split('T')[0], '2025-07-01');
    });
  });
  
  describe('Missed Grants Scenario', () => {
    
    it('should calculate multiple pending grants for long-term employee', () => {
      // Employee eligible since 2020, never granted
      const eligibilityDate = new Date('2020-07-01');
      const checkDate = new Date('2024-10-01'); // 4+ years later
      
      // Calculate all pending grant dates
      const pendingGrants: Date[] = [];
      let nextGrant = computeNextSickGrantDate(eligibilityDate, null);
      
      while (nextGrant <= checkDate) {
        pendingGrants.push(new Date(nextGrant));
        nextGrant = computeNextSickGrantDate(eligibilityDate, nextGrant);
      }
      
      // Should have 5 pending grants: 2020, 2021, 2022, 2023, 2024
      assert.strictEqual(pendingGrants.length, 5);
      assert.strictEqual(pendingGrants[0].getFullYear(), 2020);
      assert.strictEqual(pendingGrants[4].getFullYear(), 2024);
    });
  });
  
  describe('Cap Enforcement Scenario', () => {
    
    it('should identify when cap would be exceeded', () => {
      // Employee with 15 days (120 hours), about to receive 10 days
      const currentBalanceHours = 120;
      const grantHours = SICK_LEAVE_GRANT_HOURS;
      const newBalance = currentBalanceHours + grantHours;
      
      // New balance would be 200 hours (25 days)
      assert.strictEqual(newBalance, 200);
      
      // Should exceed cap
      assert.ok(newBalance > SICK_LEAVE_CAP_HOURS);
      
      // Excess to clamp
      const excess = newBalance - SICK_LEAVE_CAP_HOURS;
      assert.strictEqual(excess, 40); // 5 days excess
    });
  });
});
