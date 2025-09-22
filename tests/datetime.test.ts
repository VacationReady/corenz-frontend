import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TENANT_PREFERENCES,
  formatTenantDate,
  formatTenantDateRange,
  formatTenantDateTime,
  resolveTenantDatePreferences,
} from "@/lib/datetime";

test("resolveTenantDatePreferences maps templates to locales and zones", () => {
  const nz = resolveTenantDatePreferences("NZ");
  assert.deepEqual(nz, {
    tenant: "NZ",
    locale: "en-NZ",
    timeZone: "Pacific/Auckland",
  });

  const au = resolveTenantDatePreferences("AU");
  assert.deepEqual(au, {
    tenant: "AU",
    locale: "en-AU",
    timeZone: "Australia/Sydney",
  });

  const uk = resolveTenantDatePreferences("UK");
  assert.deepEqual(uk, {
    tenant: "UK",
    locale: "en-GB",
    timeZone: "Europe/London",
  });

  const fallback = resolveTenantDatePreferences("UNKNOWN");
  assert.equal(fallback.tenant, "UNKNOWN");
  assert.equal(fallback.locale, DEFAULT_TENANT_PREFERENCES.locale);
  assert.equal(fallback.timeZone, DEFAULT_TENANT_PREFERENCES.timeZone);
});

test("formatTenantDate respects tenant time zones", () => {
  const nz = resolveTenantDatePreferences("NZ");
  const au = resolveTenantDatePreferences("AU");
  const iso = "2024-03-15T12:30:00Z";

  assert.equal(formatTenantDate(iso, { tenant: nz }), "16/03/2024");
  assert.equal(formatTenantDate(iso, { tenant: au }), "15/03/2024");
});

test("formatTenantDateTime renders locale-aware timestamps", () => {
  const nz = resolveTenantDatePreferences("NZ");
  const au = resolveTenantDatePreferences("AU");
  const iso = "2024-03-15T12:30:00Z";

  assert.equal(formatTenantDateTime(iso, { tenant: nz }), "16/03/2024, 1:30 AM");
  assert.equal(formatTenantDateTime(iso, { tenant: au }), "15/03/2024, 11:30 PM");
});

test("formatTenantDateRange collapses same-day ranges", () => {
  const nz = resolveTenantDatePreferences("NZ");
  const start = "2024-03-15T02:00:00Z";
  const end = "2024-03-15T05:00:00Z";

  assert.equal(formatTenantDateRange(start, end, { tenant: nz }), "15/03/2024");
});

test("formatTenantDateRange formats multi-day ranges", () => {
  const nz = resolveTenantDatePreferences("NZ");
  const start = "2024-03-15T12:30:00Z";
  const end = "2024-03-16T12:30:00Z";

  assert.equal(
    formatTenantDateRange(start, end, { tenant: nz }),
    "16/03/2024 – 17/03/2024",
  );
});

test("formatTenantDate handles invalid dates", () => {
  assert.equal(formatTenantDate(""), "Invalid Date");
  assert.equal(formatTenantDateTime("not-a-date"), "Invalid Date");
  assert.equal(formatTenantDateRange("not-a-date", null), "Invalid Date");
});
