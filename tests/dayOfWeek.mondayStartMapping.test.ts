import test from "node:test";
import assert from "node:assert/strict";

import { toMondayStartDayIndexFromJs, toJsDayFromMondayStart } from "../lib/day-of-week";

test("toMondayStartDayIndexFromJs maps JS getDay() to Monday-start (Mon=0..Sun=6)", () => {
  const expected: Record<number, number> = {
    0: 6,
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
  };

  for (const [jsDayStr, mondayStartStr] of Object.entries(expected)) {
    const jsDay = Number(jsDayStr);
    const mondayStart = Number(mondayStartStr);
    assert.equal(toMondayStartDayIndexFromJs(jsDay), mondayStart);
  }
});

test("toJsDayFromMondayStart maps Monday-start (Mon=0..Sun=6) to JS getDay() (Sun=0..Sat=6)", () => {
  const expected: Record<number, number> = {
    0: 1,
    1: 2,
    2: 3,
    3: 4,
    4: 5,
    5: 6,
    6: 0,
  };

  for (const [mondayStartStr, jsDayStr] of Object.entries(expected)) {
    const mondayStart = Number(mondayStartStr);
    const jsDay = Number(jsDayStr);
    assert.equal(toJsDayFromMondayStart(mondayStart), jsDay);
  }
});

test("day-of-week mapping round-trips", () => {
  for (let jsDay = 0; jsDay <= 6; jsDay++) {
    const mondayStart = toMondayStartDayIndexFromJs(jsDay);
    const roundTrip = toJsDayFromMondayStart(mondayStart);
    assert.equal(roundTrip, jsDay);
  }
});
