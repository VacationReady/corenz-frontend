/**
 * Test suite for NZ Payroll Validation
 * Tests compliance with NZ employment and tax regulations
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateIrdNumber,
  validateTaxCode,
  validateKiwiSaverEmployeeRate,
  validateKiwiSaverEmployerRate,
  validateStudentLoanRate,
  validateSpecialTaxRate,
  validateNzPayrollData,
  isPayrollDataComplete,
  KIWISAVER_EMPLOYEE_RATES,
  STUDENT_LOAN_STANDARD_RATE,
} from "../../lib/payroll/nz-payroll-validation";

describe("NZ Payroll Validation", () => {
  describe("IRD Number Validation", () => {
    test("should accept valid 8-digit IRD numbers", () => {
      const result = validateIrdNumber("49091850");
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.normalized, "49091850");
    });

    test("should accept valid 9-digit IRD numbers", () => {
      const result = validateIrdNumber("123456789");
      assert.strictEqual(result.valid, true);
    });

    test("should accept IRD numbers with formatting", () => {
      const result = validateIrdNumber("123-456-789");
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.normalized, "123456789");
    });

    test("should reject IRD numbers that are too short", () => {
      const result = validateIrdNumber("1234567");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("8 or 9 digits"));
    });

    test("should reject IRD numbers that are too long", () => {
      const result = validateIrdNumber("1234567890");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("8 or 9 digits"));
    });

    test("should reject IRD numbers with invalid checksum", () => {
      const result = validateIrdNumber("123456788");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("checksum"));
    });

    test("should reject empty IRD numbers", () => {
      const result = validateIrdNumber("");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("required"));
    });
  });

  describe("Tax Code Validation", () => {
    test("should accept valid primary tax code M", () => {
      const result = validateTaxCode("M");
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.normalized, "M");
    });

    test("should accept valid tax code with student loan", () => {
      const result = validateTaxCode("M SL");
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.normalized, "M_SL");
    });

    test("should accept secondary tax codes", () => {
      const codes = ["SB", "S", "SH", "ST"];
      codes.forEach((code) => {
        const result = validateTaxCode(code);
        assert.strictEqual(result.valid, true);
      });
    });

    test("should accept special tax codes", () => {
      const codes = ["STC", "CAE", "EDW", "ND"];
      codes.forEach((code) => {
        const result = validateTaxCode(code);
        assert.strictEqual(result.valid, true);
      });
    });

    test("should reject invalid tax codes", () => {
      const result = validateTaxCode("XX");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("Invalid tax code"));
    });

    test("should normalize lowercase tax codes", () => {
      const result = validateTaxCode("m");
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.normalized, "M");
    });

    test("should reject empty tax codes", () => {
      const result = validateTaxCode("");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("required"));
    });
  });

  describe("KiwiSaver Employee Rate Validation", () => {
    test("should accept valid KiwiSaver rates when enrolled", () => {
      KIWISAVER_EMPLOYEE_RATES.slice(1).forEach((rate) => {
        const result = validateKiwiSaverEmployeeRate(rate, true);
        assert.strictEqual(result.valid, true);
      });
    });

    test("should accept 0% when not enrolled", () => {
      const result = validateKiwiSaverEmployeeRate(0, false);
      assert.strictEqual(result.valid, true);
    });

    test("should accept null when not enrolled", () => {
      const result = validateKiwiSaverEmployeeRate(null, false);
      assert.strictEqual(result.valid, true);
    });

    test("should reject rate when not enrolled", () => {
      const result = validateKiwiSaverEmployeeRate(0.03, false);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("must be 0 or null"));
    });

    test("should require rate when enrolled", () => {
      const result = validateKiwiSaverEmployeeRate(null, true);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("required"));
    });

    test("should reject invalid rates", () => {
      const result = validateKiwiSaverEmployeeRate(0.05, true);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("must be one of"));
    });
  });

  describe("KiwiSaver Employer Rate Validation", () => {
    test("should accept 3% minimum when enrolled", () => {
      const result = validateKiwiSaverEmployerRate(0.03, true);
      assert.strictEqual(result.valid, true);
    });

    test("should accept higher rates as benefit", () => {
      const result = validateKiwiSaverEmployerRate(0.05, true);
      assert.strictEqual(result.valid, true);
    });

    test("should reject rates below 3% when enrolled", () => {
      const result = validateKiwiSaverEmployerRate(0.02, true);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("at least"));
    });

    test("should reject rates over 100%", () => {
      const result = validateKiwiSaverEmployerRate(1.5, true);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("cannot exceed"));
    });

    test("should accept null when not enrolled", () => {
      const result = validateKiwiSaverEmployerRate(null, false);
      assert.strictEqual(result.valid, true);
    });
  });

  describe("Student Loan Rate Validation", () => {
    test("should accept standard rate of 12%", () => {
      const result = validateStudentLoanRate(0.12, true);
      assert.strictEqual(result.valid, true);
    });

    test("should default to 12% when not specified", () => {
      const result = validateStudentLoanRate(null, true);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.defaultRate, STUDENT_LOAN_STANDARD_RATE);
    });

    test("should accept custom rates within range", () => {
      const result = validateStudentLoanRate(0.10, true);
      assert.strictEqual(result.valid, true);
    });

    test("should reject rates above 20%", () => {
      const result = validateStudentLoanRate(0.25, true);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("between 0% and 20%"));
    });

    test("should accept null when no loan", () => {
      const result = validateStudentLoanRate(null, false);
      assert.strictEqual(result.valid, true);
    });

    test("should reject rate when no loan", () => {
      const result = validateStudentLoanRate(0.12, false);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("must be 0 or null"));
    });
  });

  describe("Special Tax Rate Validation", () => {
    test("should accept special rate with reason", () => {
      const result = validateSpecialTaxRate(0.175, "Non-resident withholding");
      assert.strictEqual(result.valid, true);
    });

    test("should reject special rate without reason", () => {
      const result = validateSpecialTaxRate(0.175, null);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("reason is required"));
    });

    test("should accept null special rate", () => {
      const result = validateSpecialTaxRate(null, null);
      assert.strictEqual(result.valid, true);
    });

    test("should reject rates outside valid range", () => {
      const result = validateSpecialTaxRate(1.5, "Invalid rate");
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes("between 0% and 100%"));
    });
  });

  describe("Comprehensive Payroll Data Validation", () => {
    test("should validate complete payroll data", () => {
      const data = {
        irdNumber: "123-456-789",
        taxCode: "M",
        kiwiSaverEnrolled: true,
        kiwiSaverEmployeeRate: 0.03,
        kiwiSaverEmployerRate: 0.03,
        hasStudentLoan: false,
      };

      const result = validateNzPayrollData(data);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(Object.keys(result.errors).length, 0);
    });

    test("should catch multiple validation errors", () => {
      const data = {
        irdNumber: "invalid",
        taxCode: "XX",
        kiwiSaverEnrolled: true,
        kiwiSaverEmployeeRate: 0.05, // Invalid rate
        kiwiSaverEmployerRate: 0.02, // Below minimum
        hasStudentLoan: true,
        studentLoanRate: 0.25, // Above maximum
      };

      const result = validateNzPayrollData(data);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.irdNumber);
      assert.ok(result.errors.taxCode);
      assert.ok(result.errors.kiwiSaverEmployeeRate);
      assert.ok(result.errors.kiwiSaverEmployerRate);
      assert.ok(result.errors.studentLoanRate);
    });

    test("should normalize valid data", () => {
      const data = {
        irdNumber: "123-456-789",
        taxCode: "m sl",
        hasStudentLoan: true,
      };

      const result = validateNzPayrollData(data);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.normalizedData?.irdNumber, "123456789");
      assert.strictEqual(result.normalizedData?.taxCode, "M_SL");
      assert.strictEqual(result.normalizedData?.studentLoanRate, 0.12);
    });
  });

  describe("Payroll Data Completeness Check", () => {
    test("should identify complete payroll data", () => {
      const data = {
        irdNumber: "123456789",
        taxCode: "M",
      };

      const result = isPayrollDataComplete(data);
      assert.strictEqual(result.complete, true);
      assert.strictEqual(result.missing.length, 0);
    });

    test("should identify missing required fields", () => {
      const data = {
        irdNumber: "123456789",
        // Missing tax code
      };

      const result = isPayrollDataComplete(data);
      assert.strictEqual(result.complete, false);
      assert.ok(result.missing.includes("Tax code"));
    });

    test("should require KiwiSaver rate when enrolled", () => {
      const data = {
        irdNumber: "123456789",
        taxCode: "M",
        kiwiSaverEnrolled: true,
        // Missing employee rate
      };

      const result = isPayrollDataComplete(data);
      assert.strictEqual(result.complete, false);
      assert.ok(result.missing.includes("KiwiSaver employee rate"));
    });

    test("should require student loan rate when has loan", () => {
      const data = {
        irdNumber: "123456789",
        taxCode: "M",
        hasStudentLoan: true,
        // Missing loan rate
      };

      const result = isPayrollDataComplete(data);
      assert.strictEqual(result.complete, false);
      assert.ok(result.missing.includes("Student loan rate"));
    });
  });
});
