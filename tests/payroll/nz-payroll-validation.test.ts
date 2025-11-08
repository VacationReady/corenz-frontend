/**
 * Test suite for NZ Payroll Validation
 * Tests compliance with NZ employment and tax regulations
 */

import { describe, it, expect } from "@jest/globals";
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
} from "@/lib/payroll/nz-payroll-validation";

describe("NZ Payroll Validation", () => {
  describe("IRD Number Validation", () => {
    it("should accept valid 8-digit IRD numbers", () => {
      const result = validateIrdNumber("49091850");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("49091850");
    });

    it("should accept valid 9-digit IRD numbers", () => {
      const result = validateIrdNumber("123456789");
      expect(result.valid).toBe(true);
    });

    it("should accept IRD numbers with formatting", () => {
      const result = validateIrdNumber("123-456-789");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("123456789");
    });

    it("should reject IRD numbers that are too short", () => {
      const result = validateIrdNumber("1234567");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("8 or 9 digits");
    });

    it("should reject IRD numbers that are too long", () => {
      const result = validateIrdNumber("1234567890");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("8 or 9 digits");
    });

    it("should reject IRD numbers with invalid checksum", () => {
      const result = validateIrdNumber("123456788");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("checksum");
    });

    it("should reject empty IRD numbers", () => {
      const result = validateIrdNumber("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });
  });

  describe("Tax Code Validation", () => {
    it("should accept valid primary tax code M", () => {
      const result = validateTaxCode("M");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("M");
    });

    it("should accept valid tax code with student loan", () => {
      const result = validateTaxCode("M SL");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("M_SL");
    });

    it("should accept secondary tax codes", () => {
      const codes = ["SB", "S", "SH", "ST"];
      codes.forEach((code) => {
        const result = validateTaxCode(code);
        expect(result.valid).toBe(true);
      });
    });

    it("should accept special tax codes", () => {
      const codes = ["STC", "CAE", "EDW", "ND"];
      codes.forEach((code) => {
        const result = validateTaxCode(code);
        expect(result.valid).toBe(true);
      });
    });

    it("should reject invalid tax codes", () => {
      const result = validateTaxCode("XX");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid tax code");
    });

    it("should normalize lowercase tax codes", () => {
      const result = validateTaxCode("m");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe("M");
    });

    it("should reject empty tax codes", () => {
      const result = validateTaxCode("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });
  });

  describe("KiwiSaver Employee Rate Validation", () => {
    it("should accept valid KiwiSaver rates when enrolled", () => {
      KIWISAVER_EMPLOYEE_RATES.slice(1).forEach((rate) => {
        const result = validateKiwiSaverEmployeeRate(rate, true);
        expect(result.valid).toBe(true);
      });
    });

    it("should accept 0% when not enrolled", () => {
      const result = validateKiwiSaverEmployeeRate(0, false);
      expect(result.valid).toBe(true);
    });

    it("should accept null when not enrolled", () => {
      const result = validateKiwiSaverEmployeeRate(null, false);
      expect(result.valid).toBe(true);
    });

    it("should reject rate when not enrolled", () => {
      const result = validateKiwiSaverEmployeeRate(0.03, false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be 0 or null");
    });

    it("should require rate when enrolled", () => {
      const result = validateKiwiSaverEmployeeRate(null, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should reject invalid rates", () => {
      const result = validateKiwiSaverEmployeeRate(0.05, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be one of");
    });
  });

  describe("KiwiSaver Employer Rate Validation", () => {
    it("should accept 3% minimum when enrolled", () => {
      const result = validateKiwiSaverEmployerRate(0.03, true);
      expect(result.valid).toBe(true);
    });

    it("should accept higher rates as benefit", () => {
      const result = validateKiwiSaverEmployerRate(0.05, true);
      expect(result.valid).toBe(true);
    });

    it("should reject rates below 3% when enrolled", () => {
      const result = validateKiwiSaverEmployerRate(0.02, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least");
    });

    it("should reject rates over 100%", () => {
      const result = validateKiwiSaverEmployerRate(1.5, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot exceed");
    });

    it("should accept null when not enrolled", () => {
      const result = validateKiwiSaverEmployerRate(null, false);
      expect(result.valid).toBe(true);
    });
  });

  describe("Student Loan Rate Validation", () => {
    it("should accept standard rate of 12%", () => {
      const result = validateStudentLoanRate(0.12, true);
      expect(result.valid).toBe(true);
    });

    it("should default to 12% when not specified", () => {
      const result = validateStudentLoanRate(null, true);
      expect(result.valid).toBe(true);
      expect(result.defaultRate).toBe(STUDENT_LOAN_STANDARD_RATE);
    });

    it("should accept custom rates within range", () => {
      const result = validateStudentLoanRate(0.10, true);
      expect(result.valid).toBe(true);
    });

    it("should reject rates above 20%", () => {
      const result = validateStudentLoanRate(0.25, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("between 0% and 20%");
    });

    it("should accept null when no loan", () => {
      const result = validateStudentLoanRate(null, false);
      expect(result.valid).toBe(true);
    });

    it("should reject rate when no loan", () => {
      const result = validateStudentLoanRate(0.12, false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be 0 or null");
    });
  });

  describe("Special Tax Rate Validation", () => {
    it("should accept special rate with reason", () => {
      const result = validateSpecialTaxRate(0.175, "Non-resident withholding");
      expect(result.valid).toBe(true);
    });

    it("should reject special rate without reason", () => {
      const result = validateSpecialTaxRate(0.175, null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("reason is required");
    });

    it("should accept null special rate", () => {
      const result = validateSpecialTaxRate(null, null);
      expect(result.valid).toBe(true);
    });

    it("should reject rates outside valid range", () => {
      const result = validateSpecialTaxRate(1.5, "Invalid rate");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("between 0% and 100%");
    });
  });

  describe("Comprehensive Payroll Data Validation", () => {
    it("should validate complete payroll data", () => {
      const data = {
        irdNumber: "123-456-789",
        taxCode: "M",
        kiwiSaverEnrolled: true,
        kiwiSaverEmployeeRate: 0.03,
        kiwiSaverEmployerRate: 0.03,
        hasStudentLoan: false,
      };

      const result = validateNzPayrollData(data);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it("should catch multiple validation errors", () => {
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
      expect(result.valid).toBe(false);
      expect(result.errors.irdNumber).toBeDefined();
      expect(result.errors.taxCode).toBeDefined();
      expect(result.errors.kiwiSaverEmployeeRate).toBeDefined();
      expect(result.errors.kiwiSaverEmployerRate).toBeDefined();
      expect(result.errors.studentLoanRate).toBeDefined();
    });

    it("should normalize valid data", () => {
      const data = {
        irdNumber: "123-456-789",
        taxCode: "m sl",
        hasStudentLoan: true,
      };

      const result = validateNzPayrollData(data);
      expect(result.valid).toBe(true);
      expect(result.normalizedData?.irdNumber).toBe("123456789");
      expect(result.normalizedData?.taxCode).toBe("M_SL");
      expect(result.normalizedData?.studentLoanRate).toBe(0.12);
    });
  });

  describe("Payroll Data Completeness Check", () => {
    it("should identify complete payroll data", () => {
      const data = {
        irdNumber: "123456789",
        taxCode: "M",
      };

      const result = isPayrollDataComplete(data);
      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should identify missing required fields", () => {
      const data = {
        irdNumber: "123456789",
        // Missing tax code
      };

      const result = isPayrollDataComplete(data);
      expect(result.complete).toBe(false);
      expect(result.missing).toContain("Tax code");
    });

    it("should require KiwiSaver rate when enrolled", () => {
      const data = {
        irdNumber: "123456789",
        taxCode: "M",
        kiwiSaverEnrolled: true,
        // Missing employee rate
      };

      const result = isPayrollDataComplete(data);
      expect(result.complete).toBe(false);
      expect(result.missing).toContain("KiwiSaver employee rate");
    });

    it("should require student loan rate when has loan", () => {
      const data = {
        irdNumber: "123456789",
        taxCode: "M",
        hasStudentLoan: true,
        // Missing loan rate
      };

      const result = isPayrollDataComplete(data);
      expect(result.complete).toBe(false);
      expect(result.missing).toContain("Student loan rate");
    });
  });
});
