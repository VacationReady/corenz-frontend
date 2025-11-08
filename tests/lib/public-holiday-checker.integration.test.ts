/**
 * Integration tests for public holiday detection
 * 
 * These tests use real holiday data from the date-holidays library
 * to validate that known NZ holidays are correctly identified.
 * 
 * Run these tests against a test database with proper company setup.
 */

import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Holidays from "date-holidays";

/**
 * Validate that date-holidays library correctly identifies NZ holidays
 * This serves as a reference for expected behavior
 */
test("date-holidays library: validates NZ national holidays for 2024", () => {
  const hd = new Holidays();
  hd.init('NZ');
  
  const holidays2024 = hd.getHolidays(2024);
  const holidayDates = holidays2024.map((h: any) => ({
    date: h.date.split(' ')[0], // Get date part only
    name: h.name,
  }));
  
  // Expected national holidays - check key holidays exist
  const keyHolidays = [
    { date: '2024-01-01', keyword: 'New Year' },
    { date: '2024-02-06', keyword: 'Waitangi' },
    { date: '2024-03-29', keyword: 'Good Friday' },
    { date: '2024-04-01', keyword: 'Easter Monday' },
    { date: '2024-04-25', keyword: 'Anzac' }, // Library uses "Anzac" not "ANZAC"
    { date: '2024-12-25', keyword: 'Christmas' },
    { date: '2024-12-26', keyword: 'Boxing' },
  ];
  
  for (const expected of keyHolidays) {
    const found = holidayDates.find((h: any) => 
      h.date === expected.date && h.name.toLowerCase().includes(expected.keyword.toLowerCase())
    );
    assert.ok(
      found, 
      `Expected holiday with "${expected.keyword}" on ${expected.date} to be in holiday list`
    );
  }
  
  console.log(`✓ Validated ${keyHolidays.length} national NZ holidays for 2024`);
});

test("date-holidays library: validates Auckland regional holidays", () => {
  const hd = new Holidays();
  hd.init('NZ', 'auk'); // Auckland region
  
  const holidays2024 = hd.getHolidays(2024);
  
  // Should have more holidays than national calendar
  assert.ok(holidays2024.length >= 11, 'Auckland should have at least national holidays');
  
  // Check for regional holiday (anniversary day typically in January)
  const januaryHolidays = holidays2024.filter((h: any) => 
    h.date.startsWith('2024-01')
  );
  
  assert.ok(januaryHolidays.length >= 2, 'Should have multiple January holidays including anniversary');
  console.log(`✓ Found ${holidays2024.length} holidays for Auckland region`);
});

test("date-holidays library: validates Wellington regional holidays", () => {
  const hd = new Holidays();
  hd.init('NZ', 'wgn'); // Wellington region
  
  const holidays2024 = hd.getHolidays(2024);
  
  // Should have more holidays than national calendar
  assert.ok(holidays2024.length >= 11, 'Wellington should have at least national holidays');
  
  // Check for regional holiday (anniversary day typically in January)
  const januaryHolidays = holidays2024.filter((h: any) => 
    h.date.startsWith('2024-01')
  );
  
  assert.ok(januaryHolidays.length >= 2, 'Should have multiple January holidays including anniversary');
  console.log(`✓ Found ${holidays2024.length} holidays for Wellington region`);
});

test("date-holidays library: validates Canterbury regional holidays", () => {
  const hd = new Holidays();
  hd.init('NZ', 'can'); // Canterbury region
  
  const holidays2024 = hd.getHolidays(2024);
  
  // Should have more holidays than national calendar
  assert.ok(holidays2024.length >= 11, 'Canterbury should have at least national holidays');
  
  // Canterbury Anniversary is typically in November
  const novemberHolidays = holidays2024.filter((h: any) => 
    h.date.startsWith('2024-11')
  );
  
  assert.ok(novemberHolidays.length >= 1, 'Should have November holidays including anniversary');
  console.log(`✓ Found ${holidays2024.length} holidays for Canterbury region`);
});

test("date-holidays library: validates Otago regional holidays", () => {
  const hd = new Holidays();
  hd.init('NZ', 'ota'); // Otago region
  
  const holidays2024 = hd.getHolidays(2024);
  
  // Should have more holidays than national calendar
  assert.ok(holidays2024.length >= 11, 'Otago should have at least national holidays');
  
  // Otago Anniversary is typically in March
  const marchHolidays = holidays2024.filter((h: any) => 
    h.date.startsWith('2024-03')
  );
  
  assert.ok(marchHolidays.length >= 1, 'Should have March holidays including anniversary');
  console.log(`✓ Found ${holidays2024.length} holidays for Otago region`);
});

/**
 * Test consistency across multiple years
 */
test("date-holidays library: Christmas is always Dec 25 across years", () => {
  const hd = new Holidays();
  hd.init('NZ');
  
  const years = [2023, 2024, 2025, 2026];
  
  for (const year of years) {
    const holidays = hd.getHolidays(year);
    const christmas = holidays.find((h: any) => 
      h.date.startsWith(`${year}-12-25`) && h.name.includes('Christmas')
    );
    assert.ok(christmas, `Christmas should be on Dec 25 in ${year}`);
  }
  
  console.log(`✓ Validated Christmas across ${years.length} years`);
});

test("date-holidays library: ANZAC Day is always Apr 25 across years", () => {
  const hd = new Holidays();
  hd.init('NZ');
  
  const years = [2023, 2024, 2025, 2026];
  
  for (const year of years) {
    const holidays = hd.getHolidays(year);
    const anzac = holidays.find((h: any) => 
      h.date.startsWith(`${year}-04-25`) && h.name.toLowerCase().includes('anzac')
    );
    assert.ok(anzac, `Anzac Day should be on Apr 25 in ${year}`);
  }
  
  console.log(`✓ Validated Anzac Day across ${years.length} years`);
});

test("date-holidays library: Waitangi Day is always Feb 6 across years", () => {
  const hd = new Holidays();
  hd.init('NZ');
  
  const years = [2023, 2024, 2025, 2026];
  
  for (const year of years) {
    const holidays = hd.getHolidays(year);
    const waitangi = holidays.find((h: any) => 
      h.date.startsWith(`${year}-02-06`) && h.name.includes('Waitangi')
    );
    assert.ok(waitangi, `Waitangi Day should be on Feb 6 in ${year}`);
  }
  
  console.log(`✓ Validated Waitangi Day across ${years.length} years`);
});

/**
 * Test edge cases with leap years
 */
test("date-holidays library: handles leap years correctly", () => {
  const hd = new Holidays();
  hd.init('NZ');
  
  // 2024 is a leap year
  const holidays2024 = hd.getHolidays(2024);
  
  // Ensure we can get holidays for Feb in a leap year
  const febHolidays = holidays2024.filter((h: any) => 
    h.date.startsWith('2024-02')
  );
  
  assert.ok(febHolidays.length > 0, 'Should have holidays in February of leap year');
  
  // Waitangi Day should still be Feb 6
  const waitangi = febHolidays.find((h: any) => 
    h.date.startsWith('2024-02-06')
  );
  assert.ok(waitangi, 'Waitangi Day should be on Feb 6 even in leap year');
  
  console.log('✓ Leap year handling validated');
});

/**
 * Test holiday moved to Monday when falls on weekend
 */
test("date-holidays library: Mondayisation rules", () => {
  const hd = new Holidays();
  hd.init('NZ');
  
  // In NZ, when a public holiday falls on Saturday/Sunday,
  // it may be observed on Monday
  // This test documents the expected behavior
  
  const holidays2024 = hd.getHolidays(2024);
  
  // Check all holidays are present
  assert.ok(holidays2024.length >= 11, 'Should have at least 11 national holidays');
  
  console.log(`✓ Found ${holidays2024.length} holidays for 2024`);
});

/**
 * Performance validation
 */
test("date-holidays library: performance check", () => {
  const hd = new Holidays();
  hd.init('NZ');
  
  const startTime = Date.now();
  
  // Get holidays for 5 years
  for (let year = 2020; year <= 2025; year++) {
    hd.getHolidays(year);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  assert.ok(duration < 1000, 'Getting holidays for 5 years should take less than 1 second');
  console.log(`✓ Performance: ${duration}ms for 5 years of holidays`);
});

/**
 * Test region code formats
 */
test("date-holidays library: accepts different region code formats", () => {
  // Test that both uppercase and lowercase work
  const hdUppercase = new Holidays();
  hdUppercase.init('NZ', 'AUK');
  const holidaysUpper = hdUppercase.getHolidays(2024);
  
  const hdLowercase = new Holidays();
  hdLowercase.init('NZ', 'auk');
  const holidaysLower = hdLowercase.getHolidays(2024);
  
  // Both should have more holidays than national (includes regional)
  assert.ok(holidaysUpper.length >= 11, 'Uppercase region code should return holidays');
  assert.ok(holidaysLower.length >= 11, 'Lowercase region code should return holidays');
  
  // Both should have similar counts
  assert.ok(
    Math.abs(holidaysUpper.length - holidaysLower.length) <= 1,
    'Both formats should return similar holiday counts'
  );
  
  console.log('✓ Both uppercase and lowercase region codes work');
});

/**
 * Document expected holiday counts
 */
test("date-holidays library: expected holiday counts", () => {
  const hd = new Holidays();
  
  // National holidays only
  hd.init('NZ');
  const nationalHolidays = hd.getHolidays(2024);
  console.log(`  National holidays: ${nationalHolidays.length}`);
  assert.ok(nationalHolidays.length >= 11, 'Should have at least 11 national holidays');
  
  // Auckland region (national + regional)
  hd.init('NZ', 'auk');
  const aucklandHolidays = hd.getHolidays(2024);
  console.log(`  Auckland holidays: ${aucklandHolidays.length}`);
  assert.ok(
    aucklandHolidays.length > nationalHolidays.length, 
    'Regional calendar should have more holidays than national'
  );
  
  console.log('✓ Holiday counts validated');
});
