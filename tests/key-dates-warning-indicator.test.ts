/**
 * Property-based tests for Warning Indicator Assignment
 * Feature: employee-settings-key-dates
 * Property 3: Warning Indicator Assignment
 * Validates: Requirements 2.4, 3.4, 4.4, 5.4
 */
import "./setupEnv";
import test from "node:test";
import * as fc from "fast-check";
import { 
  buildKeyDates,
  WARNING_THRESHOLDS,
  EmployeeKeyDatesInput 
} from "../lib/employee/key-dates";
import { addDays, startOfDay } from "date-fns";

/**
 * Property 3: Warning Indicator Assignment
 * For any key date within its type-specific warning threshold 
 * (contract: 30 days, visa: 90 days, trial: 14 days, anniversary: 30 days), 
 * the indicator field SHALL be set to the appropriate value ('warning' or 'celebration').
 * 
 * Feature: employee-settings-key-dates, Property 3: Warning Indicator Assignment
 * Validates: Requirements 2.4, 3.4, 4.4, 5.4
 */
test("Property 3: Warning Indicator Assignment", async (t) => {
  const today = startOfDay(new Date());

  await t.test("Contract end date within 30 days has warning indicator", () => {
    // Property: For any contract end date within 30 days, indicator should be 'warning'
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: WARNING_THRESHOLDS.contract }),
        (employeeId, daysUntilContract) => {
          const contractEndDate = addDays(today, daysUntilContract);
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            contractEndDate,
          };
          
          const keyDates = buildKeyDates(employee, today);
          const contractItem = keyDates.find(item => item.type === 'contract');
          
          if (!contractItem) return false;
          
          return contractItem.indicator === 'warning';
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Contract end date beyond 30 days has no indicator", () => {
    // Property: For any contract end date beyond 30 days, indicator should be null
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: WARNING_THRESHOLDS.contract + 1, max: 365 }),
        (employeeId, daysUntilContract) => {
          const contractEndDate = addDays(today, daysUntilContract);
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            contractEndDate,
          };
          
          const keyDates = buildKeyDates(employee, today);
          const contractItem = keyDates.find(item => item.type === 'contract');
          
          if (!contractItem) return false;
          
          return contractItem.indicator === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Visa expiry date within 90 days has warning indicator", () => {
    // Property: For any visa expiry date within 90 days, indicator should be 'warning'
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: WARNING_THRESHOLDS.visa }),
        (employeeId, daysUntilVisa) => {
          const visaExpiryDate = addDays(today, daysUntilVisa);
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            visaExpiryDate,
          };
          
          const keyDates = buildKeyDates(employee, today);
          const visaItem = keyDates.find(item => item.type === 'visa');
          
          if (!visaItem) return false;
          
          return visaItem.indicator === 'warning';
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Visa expiry date beyond 90 days has no indicator", () => {
    // Property: For any visa expiry date beyond 90 days, indicator should be null
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: WARNING_THRESHOLDS.visa + 1, max: 365 }),
        (employeeId, daysUntilVisa) => {
          const visaExpiryDate = addDays(today, daysUntilVisa);
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            visaExpiryDate,
          };
          
          const keyDates = buildKeyDates(employee, today);
          const visaItem = keyDates.find(item => item.type === 'visa');
          
          if (!visaItem) return false;
          
          return visaItem.indicator === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Trial period end date within 14 days has warning indicator", () => {
    // Property: For any trial period end date within 14 days, indicator should be 'warning'
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: WARNING_THRESHOLDS.trial }),
        (employeeId, daysUntilTrial) => {
          const trialPeriodEndDate = addDays(today, daysUntilTrial);
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            ninetyDayTrialPeriod: true,
            trialPeriodEndDate,
          };
          
          const keyDates = buildKeyDates(employee, today);
          const trialItem = keyDates.find(item => item.type === 'trial');
          
          if (!trialItem) return false;
          
          return trialItem.indicator === 'warning';
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Trial period end date beyond 14 days has no indicator", () => {
    // Property: For any trial period end date beyond 14 days, indicator should be null
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: WARNING_THRESHOLDS.trial + 1, max: 365 }),
        (employeeId, daysUntilTrial) => {
          const trialPeriodEndDate = addDays(today, daysUntilTrial);
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            ninetyDayTrialPeriod: true,
            trialPeriodEndDate,
          };
          
          const keyDates = buildKeyDates(employee, today);
          const trialItem = keyDates.find(item => item.type === 'trial');
          
          if (!trialItem) return false;
          
          return trialItem.indicator === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Anniversary within 30 days has celebration indicator", () => {
    // Property: For any anniversary within 30 days, indicator should be 'celebration'
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: WARNING_THRESHOLDS.anniversary }),
        fc.integer({ min: 1, max: 20 }),
        (employeeId, daysUntilAnniversary, yearsAgo) => {
          // Calculate a start date that results in an anniversary within the threshold
          const anniversaryDate = addDays(today, daysUntilAnniversary);
          const startDate = new Date(
            anniversaryDate.getFullYear() - yearsAgo,
            anniversaryDate.getMonth(),
            anniversaryDate.getDate()
          );
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            startDate,
          };
          
          const keyDates = buildKeyDates(employee, today);
          const anniversaryItem = keyDates.find(item => item.type === 'anniversary');
          
          if (!anniversaryItem) return false;
          
          return anniversaryItem.indicator === 'celebration';
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Anniversary beyond 30 days has no indicator", () => {
    // Property: For any anniversary beyond 30 days, indicator should be null
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: WARNING_THRESHOLDS.anniversary + 1, max: 300 }),
        fc.integer({ min: 1, max: 20 }),
        (employeeId, daysUntilAnniversary, yearsAgo) => {
          // Calculate a start date that results in an anniversary beyond the threshold
          const anniversaryDate = addDays(today, daysUntilAnniversary);
          const startDate = new Date(
            anniversaryDate.getFullYear() - yearsAgo,
            anniversaryDate.getMonth(),
            anniversaryDate.getDate()
          );
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            startDate,
          };
          
          const keyDates = buildKeyDates(employee, today);
          const anniversaryItem = keyDates.find(item => item.type === 'anniversary');
          
          if (!anniversaryItem) return false;
          
          return anniversaryItem.indicator === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Indicator assignment is consistent with threshold boundaries", () => {
    // Property: For any date type, dates at exactly the threshold should have indicator,
    // dates at threshold+1 should not
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom('contract', 'visa', 'trial') as fc.Arbitrary<'contract' | 'visa' | 'trial'>,
        (employeeId, dateType) => {
          const threshold = WARNING_THRESHOLDS[dateType];
          
          // Test at exactly threshold
          const dateAtThreshold = addDays(today, threshold);
          const employeeAtThreshold: EmployeeKeyDatesInput = {
            id: employeeId,
            ...(dateType === 'contract' && { contractEndDate: dateAtThreshold }),
            ...(dateType === 'visa' && { visaExpiryDate: dateAtThreshold }),
            ...(dateType === 'trial' && { ninetyDayTrialPeriod: true, trialPeriodEndDate: dateAtThreshold }),
          };
          
          const keyDatesAtThreshold = buildKeyDates(employeeAtThreshold, today);
          const itemAtThreshold = keyDatesAtThreshold.find(item => item.type === dateType);
          
          // Test at threshold + 1
          const dateBeyondThreshold = addDays(today, threshold + 1);
          const employeeBeyondThreshold: EmployeeKeyDatesInput = {
            id: employeeId,
            ...(dateType === 'contract' && { contractEndDate: dateBeyondThreshold }),
            ...(dateType === 'visa' && { visaExpiryDate: dateBeyondThreshold }),
            ...(dateType === 'trial' && { ninetyDayTrialPeriod: true, trialPeriodEndDate: dateBeyondThreshold }),
          };
          
          const keyDatesBeyondThreshold = buildKeyDates(employeeBeyondThreshold, today);
          const itemBeyondThreshold = keyDatesBeyondThreshold.find(item => item.type === dateType);
          
          if (!itemAtThreshold || !itemBeyondThreshold) return false;
          
          // At threshold should have warning, beyond should not
          return itemAtThreshold.indicator === 'warning' && itemBeyondThreshold.indicator === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});
