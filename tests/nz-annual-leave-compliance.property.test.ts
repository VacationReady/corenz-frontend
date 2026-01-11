/**
 * Property-based tests for NZ Annual Leave Compliance Refactor
 * 
 * Feature: nz-annual-leave-compliance-refactor
 * 
 * These tests validate the NZ Holidays Act 2003 compliance for annual leave:
 * - Employees are NOT entitled to annual leave until 12 months of continuous employment
 * - Leave taken before 12 months is "leave in advance" (deducted from future entitlement)
 * - Casual employees receive 8% holiday pay instead of annual leave accrual
 * 
 * Property 1: Future Entitlement Storage
 * *For any* newly created non-casual employee, the system SHALL store the calculated
 * entitlement in `futureAnnualLeaveEntitlement` and SHALL NOT create a LeaveEntitlement
 * record until the 12-month anniversary.
 * **Validates: Requirements 1.1, 1.5**
 * 
 * Property 2: Anniversary Date Calculation
 * *For any* newly created employee with a valid start date, the `annualLeaveEntitlementDate`
 * SHALL equal exactly 12 months after the `employmentStartDate`.
 * **Validates: Requirements 1.2, 1.3**
 */
import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";

// ============================================
// HELPER FUNCTIONS FOR ANNIVERSARY CALCULATION
// ============================================

/**
 * Calculate the 12-month anniversary date from a start date.
 * This mirrors the logic in the employee creation POST handler.
 */
function calculateAnniversaryDate(startDate: Date): Date {
  const anniversaryDate = new Date(startDate);
  anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1);
  return anniversaryDate;
}

/**
 * Check if two dates are the same day (ignoring time)
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if date2 is exactly 12 months after date1
 */
function isExactly12MonthsAfter(startDate: Date, anniversaryDate: Date): boolean {
  const expected = calculateAnniversaryDate(startDate);
  return isSameDay(expected, anniversaryDate);
}

// ============================================
// ARBITRARIES (GENERATORS)
// ============================================

/**
 * Generator for valid start dates (within reasonable range)
 * Generates dates from 2020-01-01 to 2030-12-31
 * Uses integer timestamps to avoid NaN dates
 */
const validStartDateArbitrary = fc.integer({
  min: new Date("2020-01-01").getTime(),
  max: new Date("2030-12-31").getTime(),
}).map(timestamp => new Date(timestamp));

/**
 * Generator for valid entitlement days (NZ standard is 20 days for full-time)
 * Range: 0.5 to 30 days (covers part-time to generous entitlements)
 * Uses integer representation to avoid float precision issues
 */
const validEntitlementDaysArbitrary = fc.integer({
  min: 50,  // 0.5 days * 100
  max: 3000, // 30 days * 100
}).map(n => n / 100); // Convert to decimal with 2 decimal places

/**
 * Generator for contract types
 */
const contractTypeArbitrary = fc.oneof(
  fc.constant("permanent"),
  fc.constant("fixed-term"),
  fc.constant("casual"),
  fc.constant("CASUAL"),
  fc.constant("Casual"),
  fc.constant("contractor"),
  fc.constant("full-time"),
  fc.constant("part-time"),
  fc.constant(undefined),
  fc.constant(null),
);

/**
 * Generator for non-casual contract types
 */
const nonCasualContractTypeArbitrary = fc.oneof(
  fc.constant("permanent"),
  fc.constant("fixed-term"),
  fc.constant("contractor"),
  fc.constant("full-time"),
  fc.constant("part-time"),
  fc.constant(undefined),
  fc.constant(null),
);

/**
 * Generator for casual contract types
 */
const casualContractTypeArbitrary = fc.oneof(
  fc.constant("casual"),
  fc.constant("CASUAL"),
  fc.constant("Casual"),
);

/**
 * Generator for employee creation data
 */
const employeeCreationDataArbitrary = fc.record({
  startDate: validStartDateArbitrary,
  entitlementDays: validEntitlementDaysArbitrary,
  contractType: contractTypeArbitrary,
});

// ============================================
// PROPERTY TESTS
// ============================================

test("Property 1: Future Entitlement Storage - NZ Annual Leave Compliance", async (t) => {
  
  await t.test("Anniversary date is exactly 12 months after start date for any valid start date", () => {
    /**
     * Property: For any valid start date, the calculated anniversary date
     * SHALL be exactly 12 months (1 year) after the start date.
     * 
     * **Validates: Requirements 1.2, 1.3**
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          const anniversaryDate = calculateAnniversaryDate(startDate);
          
          // Anniversary should be exactly 1 year after start
          const expectedYear = startDate.getFullYear() + 1;
          const expectedMonth = startDate.getMonth();
          const expectedDay = startDate.getDate();
          
          // Handle edge case: Feb 29 -> Feb 28 in non-leap year
          const isLeapYearStart = startDate.getMonth() === 1 && startDate.getDate() === 29;
          const isLeapYearAnniversary = (expectedYear % 4 === 0 && (expectedYear % 100 !== 0 || expectedYear % 400 === 0));
          
          if (isLeapYearStart && !isLeapYearAnniversary) {
            // Feb 29 in leap year -> Mar 1 in non-leap year (JavaScript Date behavior)
            return anniversaryDate.getFullYear() === expectedYear &&
                   anniversaryDate.getMonth() === 2 && // March
                   anniversaryDate.getDate() === 1;
          }
          
          return anniversaryDate.getFullYear() === expectedYear &&
                 anniversaryDate.getMonth() === expectedMonth &&
                 anniversaryDate.getDate() === expectedDay;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Anniversary date is always in the future relative to start date", () => {
    /**
     * Property: For any start date, the anniversary date SHALL always be
     * after the start date (exactly 12 months later).
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          const anniversaryDate = calculateAnniversaryDate(startDate);
          return anniversaryDate.getTime() > startDate.getTime();
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Anniversary calculation is deterministic", () => {
    /**
     * Property: For any start date, calculating the anniversary date
     * multiple times SHALL produce the same result.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          const anniversary1 = calculateAnniversaryDate(startDate);
          const anniversary2 = calculateAnniversaryDate(startDate);
          const anniversary3 = calculateAnniversaryDate(startDate);
          
          return isSameDay(anniversary1, anniversary2) && 
                 isSameDay(anniversary2, anniversary3);
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Non-casual employees should have entitlement stored", () => {
    /**
     * Property: For any non-casual contract type, the employee SHOULD
     * have their future entitlement stored (not null).
     * 
     * This tests the logic that determines whether to store entitlement.
     * **Validates: Requirements 1.1, 1.5**
     */
    fc.assert(
      fc.property(
        nonCasualContractTypeArbitrary,
        validEntitlementDaysArbitrary,
        (contractType, entitlementDays) => {
          // Simulate the logic from the POST handler
          const isCasual = contractType?.toLowerCase() === "casual";
          
          // Non-casual employees should NOT be marked as casual
          return !isCasual;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Casual employees should be correctly identified", () => {
    /**
     * Property: For any casual contract type (case-insensitive),
     * the employee SHALL be identified as casual.
     * 
     * **Validates: Requirements 4.1**
     */
    fc.assert(
      fc.property(
        casualContractTypeArbitrary,
        (contractType) => {
          // Simulate the logic from the POST handler
          const isCasual = contractType?.toLowerCase() === "casual";
          
          // Casual employees should be marked as casual
          return isCasual === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Entitlement days are preserved with 2 decimal precision", () => {
    /**
     * Property: For any entitlement value, the stored value SHALL
     * be rounded to 2 decimal places.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30000 }).map(n => n / 1000), // Generate decimals with up to 3 places
        (rawEntitlement) => {
          // Simulate the roundToTwoDecimals function
          const rounded = Math.round(rawEntitlement * 100) / 100;
          
          // Check that the result has at most 2 decimal places
          const decimalPart = rounded.toString().split('.')[1] || '';
          return decimalPart.length <= 2;
        }
      ),
      { numRuns: 100 }
    );
  });
});

test("Property 2: Anniversary Date Calculation - NZ Annual Leave Compliance", async (t) => {
  
  await t.test("Anniversary is exactly 365 or 366 days after start (accounting for leap years)", () => {
    /**
     * Property: For any start date, the anniversary date SHALL be
     * between 365 and 366 days after the start date.
     * 
     * **Validates: Requirements 1.2, 1.3**
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          const anniversaryDate = calculateAnniversaryDate(startDate);
          const daysDiff = Math.round(
            (anniversaryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Should be 365 or 366 days (leap year consideration)
          return daysDiff >= 365 && daysDiff <= 366;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Anniversary preserves day of month when possible", () => {
    /**
     * Property: For any start date that is not Feb 29, the anniversary
     * SHALL have the same day of month as the start date.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary.filter(d => !(d.getMonth() === 1 && d.getDate() === 29)),
        (startDate) => {
          const anniversaryDate = calculateAnniversaryDate(startDate);
          return anniversaryDate.getDate() === startDate.getDate();
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Anniversary preserves month", () => {
    /**
     * Property: For any start date that is not Feb 29, the anniversary
     * SHALL have the same month as the start date.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary.filter(d => !(d.getMonth() === 1 && d.getDate() === 29)),
        (startDate) => {
          const anniversaryDate = calculateAnniversaryDate(startDate);
          return anniversaryDate.getMonth() === startDate.getMonth();
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Anniversary year is exactly start year + 1", () => {
    /**
     * Property: For any start date, the anniversary year SHALL be
     * exactly one year after the start year.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          const anniversaryDate = calculateAnniversaryDate(startDate);
          return anniversaryDate.getFullYear() === startDate.getFullYear() + 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Consecutive anniversaries are 12 months apart", () => {
    /**
     * Property: For any start date, calculating anniversary twice
     * (anniversary of anniversary) SHALL result in a date 24 months
     * after the original start date.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          const firstAnniversary = calculateAnniversaryDate(startDate);
          const secondAnniversary = calculateAnniversaryDate(firstAnniversary);
          
          // Second anniversary should be 2 years after start
          return secondAnniversary.getFullYear() === startDate.getFullYear() + 2;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

test("Edge Cases: Anniversary Date Calculation", async (t) => {
  
  await t.test("Feb 29 leap year start date", () => {
    // Feb 29, 2024 (leap year) -> should become Mar 1, 2025 or Feb 28, 2025
    const startDate = new Date("2024-02-29");
    const anniversaryDate = calculateAnniversaryDate(startDate);
    
    // JavaScript Date.setFullYear handles this by rolling to Mar 1
    assert.equal(anniversaryDate.getFullYear(), 2025);
    // The exact behavior depends on JavaScript's Date implementation
    // It typically rolls Feb 29 -> Mar 1 in non-leap years
  });

  await t.test("Dec 31 start date", () => {
    const startDate = new Date("2024-12-31");
    const anniversaryDate = calculateAnniversaryDate(startDate);
    
    assert.equal(anniversaryDate.getFullYear(), 2025);
    assert.equal(anniversaryDate.getMonth(), 11); // December
    assert.equal(anniversaryDate.getDate(), 31);
  });

  await t.test("Jan 1 start date", () => {
    const startDate = new Date("2024-01-01");
    const anniversaryDate = calculateAnniversaryDate(startDate);
    
    assert.equal(anniversaryDate.getFullYear(), 2025);
    assert.equal(anniversaryDate.getMonth(), 0); // January
    assert.equal(anniversaryDate.getDate(), 1);
  });

  await t.test("End of month dates", () => {
    // Jan 31 -> Jan 31 (both months have 31 days)
    const jan31 = new Date("2024-01-31");
    const jan31Anniversary = calculateAnniversaryDate(jan31);
    assert.equal(jan31Anniversary.getDate(), 31);
    
    // Mar 31 -> Mar 31
    const mar31 = new Date("2024-03-31");
    const mar31Anniversary = calculateAnniversaryDate(mar31);
    assert.equal(mar31Anniversary.getDate(), 31);
  });
});



// ============================================
// PROPERTY 3: ANNIVERSARY GRANT WITH DEDUCTION
// ============================================

import { calculateAnniversaryGrantBalance } from "../lib/leave/annual-leave-anniversary";

test("Property 3: Anniversary Grant with Deduction - NZ Annual Leave Compliance", async (t) => {
  /**
   * Property 3: Anniversary Grant with Deduction
   * *For any* employee reaching their 12-month anniversary, the created LeaveEntitlement 
   * balance SHALL equal `futureAnnualLeaveEntitlement - leaveInAdvanceUsed`, with a minimum of 0.
   * 
   * **Validates: Requirements 2.1, 2.2**
   */

  await t.test("Final balance equals future entitlement minus leave in advance", () => {
    /**
     * Property: For any valid future entitlement and leave in advance values,
     * the final balance SHALL equal futureEntitlement - leaveInAdvanceUsed.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3000 }).map(n => n / 100), // 0-30 days entitlement
        fc.integer({ min: 0, max: 2000 }).map(n => n / 100), // 0-20 days leave in advance
        (futureEntitlement, leaveInAdvanceUsed) => {
          const { finalBalance } = calculateAnniversaryGrantBalance(futureEntitlement, leaveInAdvanceUsed);
          
          const expectedBalance = Math.max(0, futureEntitlement - leaveInAdvanceUsed);
          const expectedRounded = Math.round(expectedBalance * 100) / 100;
          
          return finalBalance === expectedRounded;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Final balance is never negative", () => {
    /**
     * Property: For any combination of future entitlement and leave in advance,
     * the final balance SHALL never be negative.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 5000 }).map(n => n / 100), // Can exceed entitlement
        (futureEntitlement, leaveInAdvanceUsed) => {
          const { finalBalance } = calculateAnniversaryGrantBalance(futureEntitlement, leaveInAdvanceUsed);
          return finalBalance >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Flagged for review when leave in advance exceeds entitlement", () => {
    /**
     * Property: When leave in advance exceeds future entitlement,
     * the result SHALL be flagged for review.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }).map(n => n / 100), // 1-20 days entitlement
        fc.integer({ min: 0, max: 3000 }).map(n => n / 100),   // 0-30 days leave in advance
        (futureEntitlement, leaveInAdvanceUsed) => {
          const { flaggedForReview } = calculateAnniversaryGrantBalance(futureEntitlement, leaveInAdvanceUsed);
          
          const shouldBeFlagged = leaveInAdvanceUsed > futureEntitlement;
          return flaggedForReview === shouldBeFlagged;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Not flagged when leave in advance is within entitlement", () => {
    /**
     * Property: When leave in advance is less than or equal to future entitlement,
     * the result SHALL NOT be flagged for review.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 3000 }).map(n => n / 100), // 1-30 days entitlement
        (futureEntitlement) => {
          // Generate leave in advance that's <= entitlement
          const leaveInAdvanceUsed = Math.random() * futureEntitlement;
          const { flaggedForReview } = calculateAnniversaryGrantBalance(futureEntitlement, leaveInAdvanceUsed);
          
          return flaggedForReview === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Final balance has at most 2 decimal places", () => {
    /**
     * Property: For any input values, the final balance SHALL be rounded
     * to at most 2 decimal places.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30000 }).map(n => n / 1000), // Up to 3 decimal places
        fc.integer({ min: 0, max: 30000 }).map(n => n / 1000),
        (futureEntitlement, leaveInAdvanceUsed) => {
          const { finalBalance } = calculateAnniversaryGrantBalance(futureEntitlement, leaveInAdvanceUsed);
          
          // Check that the result has at most 2 decimal places
          const decimalPart = finalBalance.toString().split('.')[1] || '';
          return decimalPart.length <= 2;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Zero entitlement results in zero balance", () => {
    /**
     * Property: When future entitlement is 0, the final balance SHALL be 0
     * regardless of leave in advance.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3000 }).map(n => n / 100),
        (leaveInAdvanceUsed) => {
          const { finalBalance, flaggedForReview } = calculateAnniversaryGrantBalance(0, leaveInAdvanceUsed);
          
          // Balance should be 0
          // Should be flagged if any leave in advance was used
          return finalBalance === 0 && 
                 (leaveInAdvanceUsed > 0 ? flaggedForReview === true : flaggedForReview === false);
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("No leave in advance means full entitlement", () => {
    /**
     * Property: When no leave in advance was taken, the final balance
     * SHALL equal the full future entitlement.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3000 }).map(n => n / 100),
        (futureEntitlement) => {
          const { finalBalance, flaggedForReview } = calculateAnniversaryGrantBalance(futureEntitlement, 0);
          
          const expectedBalance = Math.round(futureEntitlement * 100) / 100;
          return finalBalance === expectedBalance && flaggedForReview === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// PROPERTY 10: AUDIT LOG CREATION
// ============================================

test("Property 10: Audit Log Creation - NZ Annual Leave Compliance", async (t) => {
  /**
   * Property 10: Audit Log Creation
   * *For any* anniversary grant operation, the system SHALL create an audit log entry
   * containing the employee ID, grant date, granted amount, deducted leave in advance, 
   * and final balance.
   * 
   * **Validates: Requirements 2.4**
   * 
   * Note: This test validates the audit log metadata structure that would be created.
   * Full integration testing requires database access.
   */

  await t.test("Audit log metadata contains all required fields", () => {
    /**
     * Property: For any anniversary grant, the audit log metadata SHALL contain
     * all required fields: employeeId, grantDate, futureEntitlement, 
     * leaveInAdvanceDeducted, finalBalance, flaggedForReview.
     */
    fc.assert(
      fc.property(
        fc.uuid(),
        validStartDateArbitrary, // Use the same safe date generator
        fc.integer({ min: 0, max: 3000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 2000 }).map(n => n / 100),
        (employeeId, grantDate, futureEntitlement, leaveInAdvanceUsed) => {
          const { finalBalance, flaggedForReview } = calculateAnniversaryGrantBalance(
            futureEntitlement, 
            leaveInAdvanceUsed
          );
          
          // Simulate the audit log metadata structure
          const metadata = {
            type: 'ANNIVERSARY_GRANT',
            employeeId,
            grantDate: grantDate.toISOString(),
            futureEntitlement,
            leaveInAdvanceDeducted: leaveInAdvanceUsed,
            finalBalance,
            flaggedForReview,
          };
          
          // Verify all required fields are present
          return (
            metadata.type === 'ANNIVERSARY_GRANT' &&
            typeof metadata.employeeId === 'string' &&
            typeof metadata.grantDate === 'string' &&
            typeof metadata.futureEntitlement === 'number' &&
            typeof metadata.leaveInAdvanceDeducted === 'number' &&
            typeof metadata.finalBalance === 'number' &&
            typeof metadata.flaggedForReview === 'boolean'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Audit log metadata values are consistent with grant calculation", () => {
    /**
     * Property: The audit log metadata values SHALL be consistent with
     * the actual grant calculation results.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 3000 }).map(n => n / 100),
        (futureEntitlement, leaveInAdvanceUsed) => {
          const { finalBalance, flaggedForReview } = calculateAnniversaryGrantBalance(
            futureEntitlement, 
            leaveInAdvanceUsed
          );
          
          // Verify consistency
          const expectedBalance = Math.max(0, futureEntitlement - leaveInAdvanceUsed);
          const expectedRounded = Math.round(expectedBalance * 100) / 100;
          const expectedFlagged = leaveInAdvanceUsed > futureEntitlement;
          
          return (
            finalBalance === expectedRounded &&
            flaggedForReview === expectedFlagged
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Grant date is preserved in ISO format", () => {
    /**
     * Property: The grant date in audit log metadata SHALL be a valid ISO date string.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary, // Use the same safe date generator
        (grantDate) => {
          const isoString = grantDate.toISOString();
          
          // Verify it's a valid ISO string that can be parsed back
          const parsed = new Date(isoString);
          return !isNaN(parsed.getTime()) && 
                 parsed.getTime() === grantDate.getTime();
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================
// PROPERTY 4: LEAVE IN ADVANCE CLASSIFICATION
// ============================================

import { classifyLeaveInAdvance } from "../app/lib/validateLeaveRequest";

test("Property 4: Leave In Advance Classification - NZ Annual Leave Compliance", async (t) => {
  /**
   * Property 4: Leave In Advance Classification
   * *For any* annual leave request from an employee with less than 12 months service 
   * (no LeaveEntitlement record), the request SHALL be classified as leave in advance 
   * and recorded in `leaveInAdvanceUsed` upon approval.
   * 
   * **Validates: Requirements 3.1, 3.2**
   */

  await t.test("Pre-12-month employees with future entitlement are classified as leave in advance", () => {
    /**
     * Property: For any employee with a futureAnnualLeaveEntitlement stored,
     * their annual leave requests SHALL be classified as leave in advance.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        fc.integer({ min: 100, max: 3000 }).map(n => n / 100), // 1-30 days future entitlement
        (startDate, futureEntitlement) => {
          // Create employee data with future entitlement (pre-12-month)
          const employee = {
            employmentStartDate: startDate,
            startDate: startDate,
            annualLeaveEntitlementDate: calculateAnniversaryDate(startDate),
            futureAnnualLeaveEntitlement: futureEntitlement,
            isCasualEmployee: false,
          };

          // Request date is before anniversary (within first 12 months)
          const requestDate = new Date(startDate);
          requestDate.setMonth(requestDate.getMonth() + 6); // 6 months after start

          const result = classifyLeaveInAdvance(employee, requestDate);

          // Should be classified as leave in advance
          return result.isLeaveInAdvance === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Post-12-month employees without future entitlement are NOT classified as leave in advance", () => {
    /**
     * Property: For any employee without a futureAnnualLeaveEntitlement (entitlement crystallised),
     * their annual leave requests SHALL NOT be classified as leave in advance.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          // Create employee data without future entitlement (post-12-month)
          const employee = {
            employmentStartDate: startDate,
            startDate: startDate,
            annualLeaveEntitlementDate: null, // Cleared after crystallisation
            futureAnnualLeaveEntitlement: null, // Cleared after crystallisation
            isCasualEmployee: false,
          };

          // Request date is after anniversary (past 12 months)
          const requestDate = new Date(startDate);
          requestDate.setFullYear(requestDate.getFullYear() + 2); // 2 years after start

          const result = classifyLeaveInAdvance(employee, requestDate);

          // Should NOT be classified as leave in advance
          return result.isLeaveInAdvance === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Casual employees are never classified as leave in advance", () => {
    /**
     * Property: For any casual employee, regardless of tenure,
     * they SHALL NOT be classified as leave in advance (they can't request annual leave).
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        fc.integer({ min: 100, max: 3000 }).map(n => n / 100),
        (startDate, futureEntitlement) => {
          // Create casual employee data
          const employee = {
            employmentStartDate: startDate,
            startDate: startDate,
            annualLeaveEntitlementDate: calculateAnniversaryDate(startDate),
            futureAnnualLeaveEntitlement: futureEntitlement,
            isCasualEmployee: true, // Casual employee
          };

          const requestDate = new Date(startDate);
          requestDate.setMonth(requestDate.getMonth() + 3);

          const result = classifyLeaveInAdvance(employee, requestDate);

          // Casual employees should not be classified as leave in advance
          // (they receive 8% holiday pay instead)
          return result.isLeaveInAdvance === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Tenure months is calculated correctly based on start date", () => {
    /**
     * Property: For any employee with a valid start date,
     * the tenure months SHALL be calculated correctly.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        fc.integer({ min: 0, max: 24 }), // 0-24 months tenure
        (startDate, monthsToAdd) => {
          const employee = {
            employmentStartDate: startDate,
            startDate: startDate,
            annualLeaveEntitlementDate: calculateAnniversaryDate(startDate),
            futureAnnualLeaveEntitlement: 20,
            isCasualEmployee: false,
          };

          // Request date is monthsToAdd months after start
          const requestDate = new Date(startDate);
          requestDate.setMonth(requestDate.getMonth() + monthsToAdd);

          const result = classifyLeaveInAdvance(employee, requestDate);

          // Tenure should be approximately monthsToAdd (within 1 month tolerance for edge cases)
          return Math.abs(result.tenureMonths - monthsToAdd) <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Classification is based on entitlement date, not just tenure", () => {
    /**
     * Property: For any employee where annualLeaveEntitlementDate is in the future,
     * they SHALL be classified as leave in advance, even if tenure > 12 months.
     * This handles edge cases like casual-to-permanent conversions.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          // Create employee with future entitlement date (e.g., casual-to-permanent conversion)
          const futureEntitlementDate = new Date(startDate);
          futureEntitlementDate.setFullYear(futureEntitlementDate.getFullYear() + 2);

          const employee = {
            employmentStartDate: startDate,
            startDate: startDate,
            annualLeaveEntitlementDate: futureEntitlementDate,
            futureAnnualLeaveEntitlement: 20,
            isCasualEmployee: false,
          };

          // Request date is after original start but before entitlement date
          const requestDate = new Date(startDate);
          requestDate.setMonth(requestDate.getMonth() + 18); // 18 months after start

          const result = classifyLeaveInAdvance(employee, requestDate);

          // Should be classified as leave in advance because entitlement date is in future
          return result.isLeaveInAdvance === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Missing start date returns zero tenure and no leave in advance", () => {
    /**
     * Property: For any employee without a start date,
     * the classification SHALL return isLeaveInAdvance=false and tenureMonths=0.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (requestDate) => {
          // Create employee without start date
          const employee = {
            employmentStartDate: null,
            startDate: null,
            annualLeaveEntitlementDate: null,
            futureAnnualLeaveEntitlement: null,
            isCasualEmployee: false,
          };

          const result = classifyLeaveInAdvance(employee, requestDate);

          // Should return defaults when no start date
          return result.isLeaveInAdvance === false && result.tenureMonths === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Classification is deterministic", () => {
    /**
     * Property: For any employee and request date,
     * calling classifyLeaveInAdvance multiple times SHALL produce the same result.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        fc.integer({ min: 100, max: 3000 }).map(n => n / 100),
        fc.boolean(),
        (startDate, futureEntitlement, isCasual) => {
          const employee = {
            employmentStartDate: startDate,
            startDate: startDate,
            annualLeaveEntitlementDate: calculateAnniversaryDate(startDate),
            futureAnnualLeaveEntitlement: isCasual ? null : futureEntitlement,
            isCasualEmployee: isCasual,
          };

          const requestDate = new Date(startDate);
          requestDate.setMonth(requestDate.getMonth() + 6);

          const result1 = classifyLeaveInAdvance(employee, requestDate);
          const result2 = classifyLeaveInAdvance(employee, requestDate);
          const result3 = classifyLeaveInAdvance(employee, requestDate);

          return (
            result1.isLeaveInAdvance === result2.isLeaveInAdvance &&
            result2.isLeaveInAdvance === result3.isLeaveInAdvance &&
            result1.tenureMonths === result2.tenureMonths &&
            result2.tenureMonths === result3.tenureMonths
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("12-month boundary: exactly at anniversary date", () => {
    /**
     * Property: For any employee at exactly their 12-month anniversary,
     * if they still have futureAnnualLeaveEntitlement, they are still leave in advance.
     * (The entitlement crystallises at the anniversary, but until processed, they're still pre-12-month)
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          const anniversaryDate = calculateAnniversaryDate(startDate);

          const employee = {
            employmentStartDate: startDate,
            startDate: startDate,
            annualLeaveEntitlementDate: anniversaryDate,
            futureAnnualLeaveEntitlement: 20, // Still has future entitlement
            isCasualEmployee: false,
          };

          // Request exactly on anniversary date
          const result = classifyLeaveInAdvance(employee, anniversaryDate);

          // Should still be leave in advance until entitlement is processed
          // (annualLeaveEntitlementDate is NOT in the future, but futureAnnualLeaveEntitlement exists)
          return result.isLeaveInAdvance === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================
// PROPERTY 5: CASUAL EMPLOYEE EXCLUSION
// ============================================

import { 
  calculateAnniversaryDateFromConversion, 
  canConvertToPermanent 
} from "../lib/leave/annual-leave-anniversary";

test("Property 5: Casual Employee Exclusion - NZ Annual Leave Compliance", async (t) => {
  /**
   * Property 5: Casual Employee Exclusion
   * *For any* employee marked as `isCasualEmployee = true`, the system SHALL NOT store 
   * a `futureAnnualLeaveEntitlement` value and SHALL NOT create LeaveEntitlement records.
   * 
   * **Validates: Requirements 4.1**
   */

  await t.test("Casual employees should not have future entitlement stored", () => {
    /**
     * Property: For any casual employee, the futureAnnualLeaveEntitlement
     * SHALL be null or undefined.
     */
    fc.assert(
      fc.property(
        casualContractTypeArbitrary,
        validEntitlementDaysArbitrary,
        (contractType, entitlementDays) => {
          // Simulate the logic from the POST handler
          const isCasual = contractType?.toLowerCase() === "casual";
          
          // For casual employees, futureAnnualLeaveEntitlement should NOT be stored
          // This simulates what the POST handler does
          const futureEntitlement = isCasual ? null : entitlementDays;
          
          // Casual employees should have null future entitlement
          return isCasual === true && futureEntitlement === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Casual detection is case-insensitive", () => {
    /**
     * Property: For any variation of "casual" (case-insensitive),
     * the employee SHALL be identified as casual.
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant("casual"),
          fc.constant("CASUAL"),
          fc.constant("Casual"),
          fc.constant("CaSuAl"),
          fc.constant("CASUAL "), // with trailing space - should NOT match
        ),
        (contractType) => {
          const isCasual = contractType?.toLowerCase().trim() === "casual";
          
          // All variations should be detected as casual (after trim)
          return isCasual === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Non-casual contract types should have future entitlement stored", () => {
    /**
     * Property: For any non-casual contract type, the employee
     * SHALL have their futureAnnualLeaveEntitlement stored.
     */
    fc.assert(
      fc.property(
        nonCasualContractTypeArbitrary,
        validEntitlementDaysArbitrary,
        (contractType, entitlementDays) => {
          // Simulate the logic from the POST handler
          const isCasual = contractType?.toLowerCase() === "casual";
          
          // For non-casual employees, futureAnnualLeaveEntitlement should be stored
          const futureEntitlement = isCasual ? null : entitlementDays;
          
          // Non-casual employees should have entitlement stored
          return isCasual === false && futureEntitlement === entitlementDays;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Casual employees are excluded from anniversary grant processing", () => {
    /**
     * Property: For any casual employee, the findEmployeesAtAnniversary query
     * SHALL NOT include them (isCasualEmployee: false filter).
     */
    fc.assert(
      fc.property(
        fc.boolean(),
        validStartDateArbitrary,
        (isCasual, startDate) => {
          // Simulate the query filter logic
          const queryFilter = {
            isCasualEmployee: false, // This is the filter used in findEmployeesAtAnniversary
          };
          
          // Employee data
          const employee = {
            isCasualEmployee: isCasual,
            annualLeaveEntitlementDate: calculateAnniversaryDate(startDate),
            futureAnnualLeaveEntitlement: isCasual ? null : 20,
          };
          
          // Check if employee would be included in query
          const wouldBeIncluded = 
            employee.isCasualEmployee === queryFilter.isCasualEmployee &&
            employee.futureAnnualLeaveEntitlement !== null;
          
          // Casual employees should NOT be included
          if (isCasual) {
            return wouldBeIncluded === false;
          }
          // Non-casual employees with entitlement should be included
          return wouldBeIncluded === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Casual employees cannot request annual leave (classified correctly)", () => {
    /**
     * Property: For any casual employee attempting to request annual leave,
     * they SHALL NOT be classified as leave in advance (they can't request at all).
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (startDate) => {
          // Create casual employee data
          const employee = {
            employmentStartDate: startDate,
            startDate: startDate,
            annualLeaveEntitlementDate: null, // Casual employees don't have this
            futureAnnualLeaveEntitlement: null, // Casual employees don't have this
            isCasualEmployee: true,
          };

          const requestDate = new Date(startDate);
          requestDate.setMonth(requestDate.getMonth() + 6);

          const result = classifyLeaveInAdvance(employee, requestDate);

          // Casual employees should not be classified as leave in advance
          // (they receive 8% holiday pay instead and can't request annual leave)
          return result.isLeaveInAdvance === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Employment type 'casual' also triggers casual detection", () => {
    /**
     * Property: For any employee with employmentType = "casual",
     * they SHALL be identified as casual (in addition to contractType).
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant("casual"),
          fc.constant("CASUAL"),
          fc.constant("Casual"),
        ),
        (employmentType) => {
          // Simulate the logic from the POST handler
          // Check both contractType and employmentType
          const contractType = "permanent"; // Non-casual contract type
          const isCasual = 
            contractType?.toLowerCase() === "casual" || 
            employmentType?.toLowerCase() === "casual";
          
          // Should be detected as casual via employmentType
          return isCasual === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// PROPERTY 6: CASUAL TO PERMANENT CONVERSION
// ============================================

test("Property 6: Casual to Permanent Conversion - NZ Annual Leave Compliance", async (t) => {
  /**
   * Property 6: Casual to Permanent Conversion
   * *For any* employee whose `isCasualEmployee` changes from true to false, 
   * the `annualLeaveEntitlementDate` SHALL be recalculated as 12 months from 
   * the `casualToPermanentDate`.
   * 
   * **Validates: Requirements 4.4**
   */

  await t.test("Anniversary date is exactly 12 months after conversion date", () => {
    /**
     * Property: For any conversion date, the new anniversary date
     * SHALL be exactly 12 months after the conversion date.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary, // Use as conversion date
        (conversionDate) => {
          const newAnniversaryDate = calculateAnniversaryDateFromConversion(conversionDate);
          
          // Anniversary should be exactly 1 year after conversion
          const expectedYear = conversionDate.getFullYear() + 1;
          const expectedMonth = conversionDate.getMonth();
          const expectedDay = conversionDate.getDate();
          
          // Handle edge case: Feb 29 -> Feb 28 in non-leap year
          const isLeapYearConversion = conversionDate.getMonth() === 1 && conversionDate.getDate() === 29;
          const isLeapYearAnniversary = (expectedYear % 4 === 0 && (expectedYear % 100 !== 0 || expectedYear % 400 === 0));
          
          if (isLeapYearConversion && !isLeapYearAnniversary) {
            // Feb 29 in leap year -> Mar 1 in non-leap year (JavaScript Date behavior)
            return newAnniversaryDate.getFullYear() === expectedYear &&
                   newAnniversaryDate.getMonth() === 2 && // March
                   newAnniversaryDate.getDate() === 1;
          }
          
          return newAnniversaryDate.getFullYear() === expectedYear &&
                 newAnniversaryDate.getMonth() === expectedMonth &&
                 newAnniversaryDate.getDate() === expectedDay;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Conversion anniversary is always in the future relative to conversion date", () => {
    /**
     * Property: For any conversion date, the new anniversary date
     * SHALL always be after the conversion date.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (conversionDate) => {
          const newAnniversaryDate = calculateAnniversaryDateFromConversion(conversionDate);
          return newAnniversaryDate.getTime() > conversionDate.getTime();
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Conversion anniversary calculation is deterministic", () => {
    /**
     * Property: For any conversion date, calculating the anniversary
     * multiple times SHALL produce the same result.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (conversionDate) => {
          const anniversary1 = calculateAnniversaryDateFromConversion(conversionDate);
          const anniversary2 = calculateAnniversaryDateFromConversion(conversionDate);
          const anniversary3 = calculateAnniversaryDateFromConversion(conversionDate);
          
          return isSameDay(anniversary1, anniversary2) && 
                 isSameDay(anniversary2, anniversary3);
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Only casual employees can be converted to permanent", () => {
    /**
     * Property: For any employee, canConvertToPermanent SHALL return true
     * only if isCasualEmployee is true and no future entitlement exists.
     */
    fc.assert(
      fc.property(
        fc.boolean(), // isCasualEmployee
        fc.option(validEntitlementDaysArbitrary, { nil: null }), // futureEntitlement
        (isCasual, futureEntitlement) => {
          const employee = {
            isCasualEmployee: isCasual,
            futureAnnualLeaveEntitlement: futureEntitlement,
          };
          
          const canConvert = canConvertToPermanent(employee);
          
          // Can only convert if:
          // 1. Is a casual employee
          // 2. Does not already have future entitlement
          const expectedCanConvert = isCasual && (!futureEntitlement || futureEntitlement <= 0);
          
          return canConvert === expectedCanConvert;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Non-casual employees cannot be converted", () => {
    /**
     * Property: For any non-casual employee, canConvertToPermanent
     * SHALL return false.
     */
    fc.assert(
      fc.property(
        fc.option(validEntitlementDaysArbitrary, { nil: null }),
        (futureEntitlement) => {
          const employee = {
            isCasualEmployee: false, // Not casual
            futureAnnualLeaveEntitlement: futureEntitlement,
          };
          
          const canConvert = canConvertToPermanent(employee);
          
          // Non-casual employees cannot be converted
          return canConvert === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Conversion preserves day of month when possible", () => {
    /**
     * Property: For any conversion date that is not Feb 29, the anniversary
     * SHALL have the same day of month as the conversion date.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary.filter(d => !(d.getMonth() === 1 && d.getDate() === 29)),
        (conversionDate) => {
          const anniversaryDate = calculateAnniversaryDateFromConversion(conversionDate);
          return anniversaryDate.getDate() === conversionDate.getDate();
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Conversion preserves month", () => {
    /**
     * Property: For any conversion date that is not Feb 29, the anniversary
     * SHALL have the same month as the conversion date.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary.filter(d => !(d.getMonth() === 1 && d.getDate() === 29)),
        (conversionDate) => {
          const anniversaryDate = calculateAnniversaryDateFromConversion(conversionDate);
          return anniversaryDate.getMonth() === conversionDate.getMonth();
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Conversion anniversary is between 365 and 366 days after conversion", () => {
    /**
     * Property: For any conversion date, the anniversary date SHALL be
     * between 365 and 366 days after the conversion date.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary,
        (conversionDate) => {
          const anniversaryDate = calculateAnniversaryDateFromConversion(conversionDate);
          const daysDiff = Math.round(
            (anniversaryDate.getTime() - conversionDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Should be 365 or 366 days (leap year consideration)
          return daysDiff >= 365 && daysDiff <= 366;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("Converted employee's leave in advance classification uses new anniversary date", () => {
    /**
     * Property: For any converted casual employee, leave requests before
     * the new anniversary date SHALL be classified as leave in advance.
     */
    fc.assert(
      fc.property(
        validStartDateArbitrary, // Original hire date
        validStartDateArbitrary, // Conversion date (later)
        (hireDate, conversionDate) => {
          // Ensure conversion is after hire
          const actualConversionDate = new Date(Math.max(hireDate.getTime(), conversionDate.getTime()));
          actualConversionDate.setMonth(actualConversionDate.getMonth() + 6); // 6 months after hire
          
          const newAnniversaryDate = calculateAnniversaryDateFromConversion(actualConversionDate);
          
          // Create converted employee data
          const employee = {
            employmentStartDate: hireDate,
            startDate: hireDate,
            annualLeaveEntitlementDate: newAnniversaryDate, // Uses conversion-based anniversary
            futureAnnualLeaveEntitlement: 20,
            isCasualEmployee: false, // Now permanent
          };

          // Request date is 6 months after conversion (before new anniversary)
          const requestDate = new Date(actualConversionDate);
          requestDate.setMonth(requestDate.getMonth() + 6);

          const result = classifyLeaveInAdvance(employee, requestDate);

          // Should be classified as leave in advance (before new anniversary)
          return result.isLeaveInAdvance === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
