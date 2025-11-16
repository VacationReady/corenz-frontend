import test from "node:test";
import assert from "node:assert/strict";
import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateDate,
  getPhoneHelperText,
  formatPhoneDisplay,
  validateFields,
  hasValidationErrors,
} from "../../lib/validators";

test("validateEmail - valid emails", () => {
  const validEmails = [
    "user@example.com",
    "test.user@example.com",
    "user+tag@example.co.nz",
    "first.last@subdomain.example.com",
    "user123@test-domain.com",
  ];

  for (const email of validEmails) {
    const result = validateEmail(email);
    assert.ok(result.isValid, `${email} should be valid`);
    assert.strictEqual(result.error, undefined);
  }
});

test("validateEmail - invalid emails", () => {
  const invalidEmails = [
    { email: "", expectedError: "Email is required" },
    { email: "   ", expectedError: "Email is required" },
    { email: "notanemail", expectedError: "Please enter a valid email address" },
    { email: "@example.com", expectedError: "Please enter a valid email address" },
    { email: "user@", expectedError: "Please enter a valid email address" },
    { email: "user @example.com", expectedError: "Please enter a valid email address" },
  ];

  for (const { email, expectedError } of invalidEmails) {
    const result = validateEmail(email);
    assert.ok(!result.isValid, `${email} should be invalid`);
    assert.ok(result.error?.includes(expectedError) || result.error === expectedError);
  }
});

test("validateEmail - handles null and undefined", () => {
  const resultNull = validateEmail(null);
  assert.ok(!resultNull.isValid);
  assert.strictEqual(resultNull.error, "Email is required");

  const resultUndefined = validateEmail(undefined);
  assert.ok(!resultUndefined.isValid);
  assert.strictEqual(resultUndefined.error, "Email is required");
});

test("validatePhone - valid NZ phone numbers", () => {
  const validPhones = [
    "+64 21 123 4567",
    "+64211234567",
    "021 123 4567",
    "0211234567",
    "+64 9 123 4567",
    "09 123 4567",
    "(021) 123-4567",
  ];

  for (const phone of validPhones) {
    const result = validatePhone(phone);
    assert.ok(result.isValid, `${phone} should be valid`);
    assert.strictEqual(result.error, undefined);
  }
});

test("validatePhone - invalid phone numbers", () => {
  const invalidPhones = [
    { phone: "123", error: "Phone number is too short" },
    { phone: "12345678901234567890", error: "Phone number is too long" },
    { phone: "abc123defg", error: "Phone number contains invalid characters" },
    { phone: "64 21 123 4567", error: "NZ international format should start with +64" },
  ];

  for (const { phone, error } of invalidPhones) {
    const result = validatePhone(phone);
    assert.ok(!result.isValid, `${phone} should be invalid`);
    assert.ok(result.error?.includes(error) || result.error === error);
  }
});

test("validatePhone - optional field (empty is valid)", () => {
  assert.ok(validatePhone("").isValid);
  assert.ok(validatePhone(null).isValid);
  assert.ok(validatePhone(undefined).isValid);
  assert.ok(validatePhone("   ").isValid);
});

test("validateRequired - validates non-empty strings", () => {
  const result = validateRequired("test value", "Test Field");
  assert.ok(result.isValid);
  assert.strictEqual(result.error, undefined);
});

test("validateRequired - rejects empty strings", () => {
  const emptyValues = ["", "   ", null, undefined];

  for (const value of emptyValues) {
    const result = validateRequired(value as any, "Test Field");
    assert.ok(!result.isValid);
    assert.strictEqual(result.error, "Test Field is required");
  }
});

test("validateDate - valid dates", () => {
  const result = validateDate("2024-01-15", { fieldName: "Start Date" });
  assert.ok(result.isValid);
  assert.strictEqual(result.error, undefined);
});

test("validateDate - invalid date format", () => {
  const result = validateDate("invalid-date", { fieldName: "Start Date" });
  assert.ok(!result.isValid);
  assert.ok(result.error?.includes("not a valid date"));
});

test("validateDate - date range validation", () => {
  const minDate = new Date("2024-01-01");
  const maxDate = new Date("2024-12-31");

  // Date before minimum
  const resultBefore = validateDate("2023-12-31", {
    fieldName: "Start Date",
    minDate,
  });
  assert.ok(!resultBefore.isValid);
  assert.ok(resultBefore.error?.includes("must be after"));

  // Date after maximum
  const resultAfter = validateDate("2025-01-01", {
    fieldName: "Start Date",
    maxDate,
  });
  assert.ok(!resultAfter.isValid);
  assert.ok(resultAfter.error?.includes("must be before"));

  // Date within range
  const resultValid = validateDate("2024-06-15", {
    fieldName: "Start Date",
    minDate,
    maxDate,
  });
  assert.ok(resultValid.isValid);
});

test("validateDate - optional field", () => {
  const result = validateDate(null, { fieldName: "Optional Date", required: false });
  assert.ok(result.isValid);
});

test("getPhoneHelperText - provides contextual hints", () => {
  // Empty input
  assert.ok(getPhoneHelperText("").includes("+64"));

  // Local NZ format
  assert.ok(getPhoneHelperText("021 123 4567").includes("+64"));

  // International format
  assert.ok(getPhoneHelperText("+64 21 123 4567").includes("international"));
});

test("formatPhoneDisplay - formats NZ numbers", () => {
  assert.strictEqual(formatPhoneDisplay("0211234567"), "+64 211234567");
  assert.strictEqual(formatPhoneDisplay("+64211234567"), "+64 211234567");
  assert.strictEqual(formatPhoneDisplay(""), "");
  assert.strictEqual(formatPhoneDisplay(null), "");
});

test("validateFields - validates multiple fields", () => {
  const fields = {
    email: { value: "test@example.com", validator: validateEmail },
    phone: { value: "+64 21 123 4567", validator: validatePhone },
    firstName: {
      value: "John",
      validator: (v: string) => validateRequired(v, "First Name"),
    },
  };

  const results = validateFields(fields);

  assert.ok(results.email.isValid);
  assert.ok(results.phone.isValid);
  assert.ok(results.firstName.isValid);
});

test("validateFields - detects validation errors", () => {
  const fields = {
    email: { value: "invalid-email", validator: validateEmail },
    phone: { value: "123", validator: validatePhone },
  };

  const results = validateFields(fields);

  assert.ok(!results.email.isValid);
  assert.ok(!results.phone.isValid);
});

test("hasValidationErrors - detects errors in results", () => {
  const resultsWithErrors = {
    email: { isValid: false, error: "Invalid email" },
    phone: { isValid: true },
  };

  assert.ok(hasValidationErrors(resultsWithErrors));

  const resultsWithoutErrors = {
    email: { isValid: true },
    phone: { isValid: true },
  };

  assert.ok(!hasValidationErrors(resultsWithoutErrors));
});

test("validateEmail - trims whitespace", () => {
  const result = validateEmail("  test@example.com  ");
  assert.ok(result.isValid);
});

test("validatePhone - NZ-specific hints for common mistakes", () => {
  // Local format starting with 0 - valid 9 digits
  const resultLocal = validatePhone("021 123 456");
  assert.ok(resultLocal.isValid); // 9 digits is valid for NZ

  // Local format that's too short
  const resultShort = validatePhone("021 12");
  assert.ok(!resultShort.isValid);

  // International format without +
  const result64 = validatePhone("64 21 123 4567");
  assert.ok(!result64.isValid);
  assert.ok(result64.error?.includes("should start with +64"));
});
