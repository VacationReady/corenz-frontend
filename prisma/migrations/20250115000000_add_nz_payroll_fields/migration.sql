-- Add missing NZ payroll compliance fields to Employee
-- Tax Administration Act 1994 & Employment Relations Act 2000

-- Add student loan rate field (12% standard rate in NZ)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "studentLoanRate" DECIMAL(4,2) DEFAULT 0.12;

-- Add special tax rate for non-standard situations
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "specialTaxRate" DECIMAL(5,4);

-- Add tax exemption reason field
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "taxExemptionReason" TEXT;

-- Add comments for clarity
COMMENT ON COLUMN "Employee"."studentLoanRate" IS 'Student loan deduction rate (usually 12% in NZ)';
COMMENT ON COLUMN "Employee"."specialTaxRate" IS 'Special tax rate for non-standard tax situations';
COMMENT ON COLUMN "Employee"."taxExemptionReason" IS 'Reason if employee has tax exemption or special tax arrangement';

-- Add check constraint for student loan rate (must be between 0% and 20%)
ALTER TABLE "Employee" ADD CONSTRAINT "check_student_loan_rate" 
  CHECK ("studentLoanRate" IS NULL OR ("studentLoanRate" >= 0.00 AND "studentLoanRate" <= 0.20));

-- Add check constraint for special tax rate (must be between 0% and 100%)
ALTER TABLE "Employee" ADD CONSTRAINT "check_special_tax_rate" 
  CHECK ("specialTaxRate" IS NULL OR ("specialTaxRate" >= 0.0000 AND "specialTaxRate" <= 1.0000));

-- Add check constraint for KiwiSaver employee rate (must be 3%, 4%, 6%, 8%, or 10%)
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "check_kiwisaver_employee_rate";
ALTER TABLE "Employee" ADD CONSTRAINT "check_kiwisaver_employee_rate" 
  CHECK ("kiwiSaverEmployeeRate" IS NULL OR "kiwiSaverEmployeeRate" IN (0.03, 0.04, 0.06, 0.08, 0.10));

-- Add check constraint for KiwiSaver employer rate (minimum 3% required by law)
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "check_kiwisaver_employer_rate";
ALTER TABLE "Employee" ADD CONSTRAINT "check_kiwisaver_employer_rate" 
  CHECK ("kiwiSaverEmployerRate" IS NULL OR "kiwiSaverEmployerRate" >= 0.03);

-- Update existing records: set studentLoanRate to 12% for employees with student loans
UPDATE "Employee" 
SET "studentLoanRate" = 0.12 
WHERE "hasStudentLoan" = true AND "studentLoanRate" IS NULL;

-- Create index on IRD number for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS "idx_employee_ird_number" ON "Employee"("companyId", "irdNumber");

-- Create index on tax code for reporting
CREATE INDEX IF NOT EXISTS "idx_employee_tax_code" ON "Employee"("companyId", "taxCode");
