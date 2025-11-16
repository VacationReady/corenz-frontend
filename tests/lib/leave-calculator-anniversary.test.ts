import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAnniversaryBasedEntitlement,
  calculateDaysPerWeek,
  ANNUAL_LEAVE_WEEKS,
  SICK_LEAVE_DAYS,
} from "../../lib/payroll/leave-calculator";

test("calculateAnniversaryBasedEntitlement - full-time employee, 6 months into first year", () => {
  const startDate = new Date("2024-01-01");
  const currentDate = new Date("2024-07-01"); // 6 months in
  const daysPerWeek = 5;
  const fullTimeEntitlement = 20;

  const result = calculateAnniversaryBasedEntitlement(
    startDate,
    currentDate,
    daysPerWeek,
    fullTimeEntitlement
  );

  // After 6 months, 6 months remain to anniversary
  // Expected: 20 * (183/365) ≈ 10 days
  assert.ok(result >= 9.5 && result <= 10.5, `Expected ~10 days, got ${result}`);
});

test("calculateAnniversaryBasedEntitlement - full-time employee, past first anniversary", () => {
  const startDate = new Date("2023-01-01");
  const currentDate = new Date("2024-07-01"); // 18 months in
  const daysPerWeek = 5;
  const fullTimeEntitlement = 20;

  const result = calculateAnniversaryBasedEntitlement(
    startDate,
    currentDate,
    daysPerWeek,
    fullTimeEntitlement
  );

  // Past anniversary, should get full entitlement
  assert.strictEqual(result, 20);
});

test("calculateAnniversaryBasedEntitlement - part-time employee (3 days/week), 6 months in", () => {
  const startDate = new Date("2024-01-01");
  const currentDate = new Date("2024-07-01");
  const daysPerWeek = 3;
  const fullTimeEntitlement = 20;

  const result = calculateAnniversaryBasedEntitlement(
    startDate,
    currentDate,
    daysPerWeek,
    fullTimeEntitlement
  );

  // Part-time annual entitlement: (3/5) * 20 = 12 days
  // After 6 months: 12 * (183/365) ≈ 6 days
  assert.ok(result >= 5.5 && result <= 6.5, `Expected ~6 days, got ${result}`);
});

test("calculateAnniversaryBasedEntitlement - part-time employee (2.5 days/week), full year", () => {
  const startDate = new Date("2023-01-01");
  const currentDate = new Date("2024-01-01"); // Exactly 1 year
  const daysPerWeek = 2.5;
  const fullTimeEntitlement = 20;

  const result = calculateAnniversaryBasedEntitlement(
    startDate,
    currentDate,
    daysPerWeek,
    fullTimeEntitlement
  );

  // Part-time annual entitlement: (2.5/5) * 20 = 10 days
  assert.strictEqual(result, 10);
});

test("calculateAnniversaryBasedEntitlement - employee starting today", () => {
  const startDate = new Date();
  const currentDate = new Date();
  const daysPerWeek = 5;
  const fullTimeEntitlement = 20;

  const result = calculateAnniversaryBasedEntitlement(
    startDate,
    currentDate,
    daysPerWeek,
    fullTimeEntitlement
  );

  // Just started, full year ahead: 20 * (365/365) = 20
  assert.strictEqual(result, 20);
});

test("calculateAnniversaryBasedEntitlement - future start date returns 0", () => {
  const startDate = new Date("2025-01-01");
  const currentDate = new Date("2024-01-01");
  const daysPerWeek = 5;
  const fullTimeEntitlement = 20;

  const result = calculateAnniversaryBasedEntitlement(
    startDate,
    currentDate,
    daysPerWeek,
    fullTimeEntitlement
  );

  assert.strictEqual(result, 0);
});

test("calculateAnniversaryBasedEntitlement - 11 months in, 1 month to anniversary", () => {
  const startDate = new Date("2024-01-01");
  const currentDate = new Date("2024-12-01"); // 11 months in
  const daysPerWeek = 5;
  const fullTimeEntitlement = 20;

  const result = calculateAnniversaryBasedEntitlement(
    startDate,
    currentDate,
    daysPerWeek,
    fullTimeEntitlement
  );

  // 1 month remaining: 20 * (31/365) ≈ 1.7 days
  assert.ok(result >= 1.5 && result <= 2, `Expected ~1.7 days, got ${result}`);
});

test("calculateAnniversaryBasedEntitlement - custom full-time entitlement (25 days UK)", () => {
  const startDate = new Date("2024-01-01");
  const currentDate = new Date("2024-07-01");
  const daysPerWeek = 5;
  const fullTimeEntitlement = 25; // UK entitlement

  const result = calculateAnniversaryBasedEntitlement(
    startDate,
    currentDate,
    daysPerWeek,
    fullTimeEntitlement
  );

  // 25 * (183/365) ≈ 12.5 days
  assert.ok(result >= 12 && result <= 13, `Expected ~12.5 days, got ${result}`);
});

test("calculateAnniversaryBasedEntitlement - rounds to nearest 0.5 days", () => {
  const startDate = new Date("2024-01-01");
  const currentDate = new Date("2024-03-15"); // ~2.5 months in
  const daysPerWeek = 5;
  const fullTimeEntitlement = 20;

  const result = calculateAnniversaryBasedEntitlement(
    startDate,
    currentDate,
    daysPerWeek,
    fullTimeEntitlement
  );

  // Check result is a multiple of 0.5
  assert.strictEqual(result % 0.5, 0, "Result should be rounded to nearest 0.5");
});

test("calculateAnniversaryBasedEntitlement - invalid daysPerWeek throws error", () => {
  const startDate = new Date("2024-01-01");
  const currentDate = new Date("2024-07-01");
  const fullTimeEntitlement = 20;

  assert.throws(() => {
    calculateAnniversaryBasedEntitlement(startDate, currentDate, 0, fullTimeEntitlement);
  }, /daysPerWeek must be between 1 and 7/);

  assert.throws(() => {
    calculateAnniversaryBasedEntitlement(startDate, currentDate, 8, fullTimeEntitlement);
  }, /daysPerWeek must be between 1 and 7/);
});

test("calculateAnniversaryBasedEntitlement - invalid fullTimeEntitlement throws error", () => {
  const startDate = new Date("2024-01-01");
  const currentDate = new Date("2024-07-01");
  const daysPerWeek = 5;

  assert.throws(() => {
    calculateAnniversaryBasedEntitlement(startDate, currentDate, daysPerWeek, 0);
  }, /fullTimeEntitlement must be positive/);

  assert.throws(() => {
    calculateAnniversaryBasedEntitlement(startDate, currentDate, daysPerWeek, -10);
  }, /fullTimeEntitlement must be positive/);
});

test("calculateDaysPerWeek - full-time pattern (5 days)", () => {
  const pattern = {
    weeks: [
      {
        days: [
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "OFF" },
          { type: "OFF" },
        ],
      },
    ],
  };

  const result = calculateDaysPerWeek(pattern);
  assert.strictEqual(result, 5);
});

test("calculateDaysPerWeek - part-time pattern (3 days)", () => {
  const pattern = {
    weeks: [
      {
        days: [
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "OFF" },
          { type: "OFF" },
          { type: "OFF" },
          { type: "OFF" },
        ],
      },
    ],
  };

  const result = calculateDaysPerWeek(pattern);
  assert.strictEqual(result, 3);
});

test("calculateDaysPerWeek - pattern with half days", () => {
  const pattern = {
    weeks: [
      {
        days: [
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "HALF_DAY_AM" },
          { type: "FULL_DAY" },
          { type: "HALF_DAY_PM" },
          { type: "OFF" },
          { type: "OFF" },
        ],
      },
    ],
  };

  const result = calculateDaysPerWeek(pattern);
  assert.strictEqual(result, 4); // 3 full + 2 half = 4 days
});

test("calculateDaysPerWeek - multi-week rotating pattern", () => {
  const pattern = {
    weeks: [
      {
        days: [
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "OFF" },
          { type: "OFF" },
        ],
      },
      {
        days: [
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "FULL_DAY" },
          { type: "OFF" },
          { type: "OFF" },
          { type: "OFF" },
          { type: "OFF" },
        ],
      },
    ],
  };

  const result = calculateDaysPerWeek(pattern);
  assert.strictEqual(result, 4); // (5 + 3) / 2 = 4 days average
});

test("calculateDaysPerWeek - empty pattern defaults to 5", () => {
  const pattern = { weeks: [] };
  const result = calculateDaysPerWeek(pattern);
  assert.strictEqual(result, 5);
});

test("calculateDaysPerWeek - pattern with empty week defaults to 5", () => {
  const pattern = {
    weeks: [
      {
        days: [],
      },
    ],
  };
  const result = calculateDaysPerWeek(pattern);
  assert.strictEqual(result, 5);
});

test("calculateDaysPerWeek - null pattern defaults to 5", () => {
  const result = calculateDaysPerWeek(null as any);
  assert.strictEqual(result, 5);
});

test("NZ compliance constants are correct", () => {
  assert.strictEqual(ANNUAL_LEAVE_WEEKS, 4, "NZ annual leave should be 4 weeks");
  assert.strictEqual(SICK_LEAVE_DAYS, 10, "NZ sick leave should be 10 days");
});

test("Integration: calculate leave for various employee scenarios", () => {
  // Scenario 1: Full-time employee, just hired
  const ft_new = calculateAnniversaryBasedEntitlement(
    new Date("2024-01-01"),
    new Date("2024-01-01"),
    5,
    20
  );
  assert.strictEqual(ft_new, 20, "New full-time employee should get full prorated entitlement");

  // Scenario 2: Full-time employee, 3 months in
  const ft_3mo = calculateAnniversaryBasedEntitlement(
    new Date("2024-01-01"),
    new Date("2024-04-01"),
    5,
    20
  );
  assert.ok(ft_3mo >= 14.5 && ft_3mo <= 15.5, "3 months in should have ~15 days remaining");

  // Scenario 3: Part-time (60%), 6 months in
  const pt_6mo = calculateAnniversaryBasedEntitlement(
    new Date("2024-01-01"),
    new Date("2024-07-01"),
    3,
    20
  );
  assert.ok(pt_6mo >= 5.5 && pt_6mo <= 6.5, "Part-time 6 months in should have ~6 days");

  // Scenario 4: Part-time (80%), past anniversary
  const pt_past = calculateAnniversaryBasedEntitlement(
    new Date("2023-01-01"),
    new Date("2024-06-01"),
    4,
    20
  );
  assert.strictEqual(pt_past, 16, "Part-time past anniversary should get full 16 days");
});

test("Edge case: employee starting on leap year", () => {
  const startDate = new Date("2024-02-29"); // Leap year
  const currentDate = new Date("2024-08-29"); // 6 months later
  const result = calculateAnniversaryBasedEntitlement(startDate, currentDate, 5, 20);

  // Should handle leap year correctly
  assert.ok(result >= 9.5 && result <= 10.5, "Leap year calculation should be accurate");
});

test("Edge case: exact anniversary date", () => {
  const startDate = new Date("2023-06-15");
  const currentDate = new Date("2024-06-15"); // Exactly 1 year
  const result = calculateAnniversaryBasedEntitlement(startDate, currentDate, 5, 20);

  assert.strictEqual(result, 20, "On anniversary should get full entitlement");
});

test("Edge case: one day before anniversary", () => {
  const startDate = new Date("2023-06-15");
  const currentDate = new Date("2024-06-14"); // One day before anniversary
  const result = calculateAnniversaryBasedEntitlement(startDate, currentDate, 5, 20);

  // Should have minimal entitlement (1 day remaining / 365)
  assert.ok(result >= 0 && result <= 0.5, "One day before anniversary should have minimal leave");
});

test("Consistency: same calculation with same inputs", () => {
  const startDate = new Date("2024-01-15");
  const currentDate = new Date("2024-07-20");
  
  const result1 = calculateAnniversaryBasedEntitlement(startDate, currentDate, 5, 20);
  const result2 = calculateAnniversaryBasedEntitlement(startDate, currentDate, 5, 20);
  
  assert.strictEqual(result1, result2, "Same inputs should produce same output");
});

test("Consistency: calculation is deterministic across multiple calls", () => {
  const results = [];
  for (let i = 0; i < 10; i++) {
    const result = calculateAnniversaryBasedEntitlement(
      new Date("2024-01-01"),
      new Date("2024-06-01"),
      5,
      20
    );
    results.push(result);
  }
  
  // All results should be identical
  const allSame = results.every(r => r === results[0]);
  assert.ok(allSame, "Multiple calls with same inputs should produce same result");
});
