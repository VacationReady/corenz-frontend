/**
 * Property-based tests for Anniversary Calculation
 * Feature: employee-settings-key-dates
 * Property 2: Anniversary Calculation
 * Validates: Requirements 5.1, 5.2, 5.3
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { 
  calculateNextAnniversary, 
  buildKeyDates,
  EmployeeKeyDatesInput 
} from "../lib/employee/key-dates";
import { startOfDay, addYears, differenceInDays } from "date-fns";

/**
 * Property 2: Anniversary Calculation
 * For any employee with a startDate, the buildKeyDates function SHALL calculate 
 * and include the next work anniversary with the correct year count.
 * 
 * Feature: employee-settings-key-dates, Property 2: Anniversary Calculation
 * Validates: Requirements 5.1, 5.2, 5.3
 */
test("Property 2: Anniversary Calculation", async (t) => {
  // Arbitrary for generating valid dates within a reasonable range
  // Using integer-based date generation to avoid NaN dates
  const dateArbitrary = fc.integer({ 
    min: new Date(2000, 0, 1).getTime(), 
    max: new Date(2030, 11, 31).getTime() 
  }).map(timestamp => new Date(timestamp));

  await t.test("calculateNextAnniversary returns future or today anniversary", () => {
    // Property: For any start date and reference date, the calculated anniversary
    // should be >= reference date (in the future or today)
    fc.assert(
      fc.property(
        dateArbitrary,
        dateArbitrary,
        (startDate, referenceDate) => {
          const result = calculateNextAnniversary(startDate, referenceDate);
          const normalizedReference = startOfDay(referenceDate);
          const normalizedResult = startOfDay(result.date);
          
          // Anniversary should be on or after reference date
          return normalizedResult >= normalizedReference;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("calculateNextAnniversary returns correct year count", () => {
    // Property: For any start date and reference date, the year count should be
    // the number of complete years from start date to the anniversary
    fc.assert(
      fc.property(
        dateArbitrary,
        dateArbitrary,
        (startDate, referenceDate) => {
          const result = calculateNextAnniversary(startDate, referenceDate);
          
          // The anniversary date should be exactly 'years' years after start date
          const expectedAnniversary = addYears(startOfDay(startDate), result.years);
          const actualAnniversary = startOfDay(result.date);
          
          return expectedAnniversary.getTime() === actualAnniversary.getTime();
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("calculateNextAnniversary year count is positive when reference > start", () => {
    // Property: When reference date is after start date, years should be >= 1
    fc.assert(
      fc.property(
        dateArbitrary,
        fc.integer({ min: 1, max: 30 }), // years to add
        (startDate, yearsToAdd) => {
          const referenceDate = addYears(startDate, yearsToAdd);
          const result = calculateNextAnniversary(startDate, referenceDate);
          
          return result.years >= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("buildKeyDates includes anniversary with correct label format", () => {
    // Property: For any employee with a start date in the past, buildKeyDates
    // should include an anniversary item with label "{N} Year Anniversary"
    fc.assert(
      fc.property(
        fc.uuid(),
        dateArbitrary,
        fc.integer({ min: 1, max: 20 }), // years since start
        (employeeId, startDate, yearsSinceStart) => {
          const referenceDate = addYears(startDate, yearsSinceStart);
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            startDate: startDate,
          };
          
          const keyDates = buildKeyDates(employee, referenceDate);
          const anniversaryItem = keyDates.find(item => item.type === 'anniversary');
          
          if (!anniversaryItem) {
            // Anniversary should be included
            return false;
          }
          
          // Label should match pattern "{N} Year Anniversary"
          const labelPattern = /^\d+ Year Anniversary$/;
          return labelPattern.test(anniversaryItem.label);
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("buildKeyDates anniversary has correct year count in label", () => {
    // Property: The year count in the anniversary label should match the calculated years
    fc.assert(
      fc.property(
        fc.uuid(),
        dateArbitrary,
        fc.integer({ min: 1, max: 20 }),
        (employeeId, startDate, yearsSinceStart) => {
          const referenceDate = addYears(startDate, yearsSinceStart);
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            startDate: startDate,
          };
          
          const keyDates = buildKeyDates(employee, referenceDate);
          const anniversaryItem = keyDates.find(item => item.type === 'anniversary');
          
          if (!anniversaryItem) {
            return false;
          }
          
          // Extract year count from label
          const match = anniversaryItem.label.match(/^(\d+) Year Anniversary$/);
          if (!match) {
            return false;
          }
          
          const labelYears = parseInt(match[1], 10);
          const { years: calculatedYears } = calculateNextAnniversary(startDate, referenceDate);
          
          return labelYears === calculatedYears;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("buildKeyDates anniversary has formatted date in MMM d, yyyy format", () => {
    // Property: The formattedDate should match the "MMM d, yyyy" pattern
    fc.assert(
      fc.property(
        fc.uuid(),
        dateArbitrary,
        fc.integer({ min: 1, max: 20 }),
        (employeeId, startDate, yearsSinceStart) => {
          const referenceDate = addYears(startDate, yearsSinceStart);
          
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            startDate: startDate,
          };
          
          const keyDates = buildKeyDates(employee, referenceDate);
          const anniversaryItem = keyDates.find(item => item.type === 'anniversary');
          
          if (!anniversaryItem) {
            return false;
          }
          
          // Pattern: "Jan 5, 2026" - Month (3 letters), day, comma, 4-digit year
          const datePattern = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
          return datePattern.test(anniversaryItem.formattedDate);
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("No anniversary when employee has no start date", () => {
    // Property: When employee has no startDate, no anniversary should be included
    fc.assert(
      fc.property(
        fc.uuid(),
        dateArbitrary,
        (employeeId, referenceDate) => {
          const employee: EmployeeKeyDatesInput = {
            id: employeeId,
            startDate: null,
          };
          
          const keyDates = buildKeyDates(employee, referenceDate);
          const anniversaryItem = keyDates.find(item => item.type === 'anniversary');
          
          return anniversaryItem === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Anniversary date matches the same month and day as start date", () => {
    // Property: The anniversary date should have the same month and day as the start date
    fc.assert(
      fc.property(
        dateArbitrary,
        dateArbitrary,
        (startDate, referenceDate) => {
          const result = calculateNextAnniversary(startDate, referenceDate);
          const normalizedStart = startOfDay(startDate);
          const anniversaryDate = startOfDay(result.date);
          
          // Month and day should match (accounting for leap year edge cases)
          // For Feb 29 start dates, the anniversary might be Feb 28 in non-leap years
          const startMonth = normalizedStart.getMonth();
          const startDay = normalizedStart.getDate();
          const annivMonth = anniversaryDate.getMonth();
          const annivDay = anniversaryDate.getDate();
          
          // Handle leap year case: Feb 29 -> Feb 28 in non-leap years
          if (startMonth === 1 && startDay === 29) {
            // February 29th - allow Feb 28 or Feb 29
            return annivMonth === 1 && (annivDay === 28 || annivDay === 29);
          }
          
          return startMonth === annivMonth && startDay === annivDay;
        }
      ),
      { numRuns: 100 }
    );
  });
});
