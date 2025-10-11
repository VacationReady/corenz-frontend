import test from "node:test";
import assert from "node:assert/strict";
import { calculateDateRange } from "@/lib/reportingDatePresets";
import { formatInTimeZone } from "date-fns-tz";
import { buildDynamicQuery } from "@/lib/queryBuilder";

test("today preset respects provided timezone", () => {
  const now = new Date("2024-05-10T12:30:00Z");
  const { start, end } = calculateDateRange(
    { type: "preset", key: "today" },
    { timeZone: "Pacific/Auckland", now },
  );

  assert(start instanceof Date);
  assert(end instanceof Date);
  assert.equal(formatInTimeZone(start, "Pacific/Auckland", "yyyy-MM-dd HH:mm"), "2024-05-11 00:00");
  assert.equal(formatInTimeZone(end, "Pacific/Auckland", "yyyy-MM-dd HH:mm"), "2024-05-11 23:59");
});

test("this week preset aligns to ISO week boundaries in timezone", () => {
  const now = new Date("2024-05-10T12:30:00Z");
  const { start, end } = calculateDateRange(
    { type: "preset", key: "this_week" },
    { timeZone: "Pacific/Auckland", now },
  );

  assert(start instanceof Date);
  assert(end instanceof Date);
  assert.equal(formatInTimeZone(start, "Pacific/Auckland", "yyyy-MM-dd"), "2024-05-06");
  assert.equal(formatInTimeZone(end, "Pacific/Auckland", "yyyy-MM-dd"), "2024-05-12");
});

test("relative after_days preset returns start boundary only", () => {
  const now = new Date("2024-02-10T10:00:00Z");
  const { start, end } = calculateDateRange(
    { type: "relative", key: "after_days", amount: 5 },
    { timeZone: "Pacific/Auckland", now },
  );

  assert(start instanceof Date);
  assert.equal(end, undefined);
  assert.equal(formatInTimeZone(start!, "Pacific/Auckland", "yyyy-MM-dd"), "2024-02-16");
});

test("relative before_days preset produces open-ended start", () => {
  const now = new Date("2024-01-20T09:00:00Z");
  const { start, end } = calculateDateRange(
    { type: "relative", key: "before_days", amount: 3 },
    { timeZone: "Europe/London", now },
  );

  assert.equal(start, undefined);
  assert(end instanceof Date);
  assert.equal(formatInTimeZone(end!, "Europe/London", "yyyy-MM-dd"), "2024-01-17");
});

test("date_in_last months clamps to target month boundary", () => {
  const now = new Date("2024-03-31T10:00:00Z");
  const { queries } = buildDynamicQuery(
    {
      selectedFields: ["Employee.hireDate"],
      filters: [
        {
          field: "Employee.hireDate",
          operator: "date_in_last",
          value: { amount: 1, unit: "months" },
        },
      ],
    },
    { timeZone: "Pacific/Auckland", now },
  );

  assert.equal(queries.length, 1);
  const where = queries[0].prismaQuery.where;
  assert(where?.hireDate);
  const { gte, lte } = where.hireDate;
  assert(gte instanceof Date);
  assert(lte instanceof Date);
  assert.equal(formatInTimeZone(gte, "Pacific/Auckland", "yyyy-MM-dd"), "2024-02-29");
  assert.equal(formatInTimeZone(lte, "Pacific/Auckland", "yyyy-MM-dd"), "2024-03-31");
});
