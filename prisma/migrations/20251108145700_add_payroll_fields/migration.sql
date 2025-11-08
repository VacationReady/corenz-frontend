-- NZ Payroll Export - Add Required Fields for IRD Compliance
-- Date: 2024-11-08
-- Compliance: Tax Administration Act 1994, Employment Relations Act 2000, Holidays Act 2003

-- ============================================
-- EMPLOYEE MODEL ENHANCEMENTS
-- ============================================

-- Tax & Payroll Fields
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "studentLoanBalance" DECIMAL(10,2);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hasStudentLoan" BOOLEAN NOT NULL DEFAULT false;

-- KiwiSaver Fields (update existing int to decimal)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "kiwiSaverEmployeeRate" DECIMAL(4,2);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "kiwiSaverEmployerRate" DECIMAL(4,2) DEFAULT 0.03;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "esctRate" DECIMAL(4,2);

-- Migrate existing kiwiSaverContribution (Int) to kiwiSaverEmployeeRate (Decimal)
-- Convert percentage int (3, 4, 6, 8, 10) to decimal rate (0.03, 0.04, 0.06, 0.08, 0.10)
UPDATE "Employee" 
SET "kiwiSaverEmployeeRate" = CASE 
  WHEN "kiwiSaverContribution" = 3 THEN 0.03
  WHEN "kiwiSaverContribution" = 4 THEN 0.04
  WHEN "kiwiSaverContribution" = 6 THEN 0.06
  WHEN "kiwiSaverContribution" = 8 THEN 0.08
  WHEN "kiwiSaverContribution" = 10 THEN 0.10
  ELSE 0.03 -- Default to 3%
END
WHERE "kiwiSaverContribution" IS NOT NULL AND "kiwiSaverEmployeeRate" IS NULL;

-- Leave Balance Fields (Holidays Act 2003 compliance)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "annualLeaveBalance" DECIMAL(8,2) NOT NULL DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "sickLeaveBalance" DECIMAL(8,2) NOT NULL DEFAULT 80; -- 10 days × 8 hours
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "alternativeDaysBalance" INTEGER NOT NULL DEFAULT 0;

-- Leave Configuration Fields
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "annualLeaveAccrualRate" DECIMAL(4,2) DEFAULT 0.08; -- 8% standard
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "sickLeaveEntitlement" DECIMAL(4,1) DEFAULT 80; -- 80 hours = 10 days
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "employmentStartDate" TIMESTAMP(3);

-- Audit Fields
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "taxCodeLastUpdated" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "kiwiSaverLastUpdated" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "leaveBalanceLastUpdated" TIMESTAMP(3);

-- ============================================
-- TIMESHEET ENTRY MODEL ENHANCEMENTS
-- ============================================

-- Public Holiday Tracking (Holidays Act 2003 compliance)
ALTER TABLE "TimesheetEntry" ADD COLUMN IF NOT EXISTS "isPublicHoliday" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TimesheetEntry" ADD COLUMN IF NOT EXISTS "publicHolidayName" TEXT;
ALTER TABLE "TimesheetEntry" ADD COLUMN IF NOT EXISTS "publicHolidayHours" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "TimesheetEntry" ADD COLUMN IF NOT EXISTS "publicHolidayMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 2.0;
ALTER TABLE "TimesheetEntry" ADD COLUMN IF NOT EXISTS "alternativeDayGranted" BOOLEAN NOT NULL DEFAULT false;

-- Enhanced Public Holiday Fields
ALTER TABLE "TimesheetEntry" ADD COLUMN IF NOT EXISTS "publicHolidayType" TEXT; -- NATIONAL, REGIONAL, MONDAYISED
ALTER TABLE "TimesheetEntry" ADD COLUMN IF NOT EXISTS "publicHolidayRegion" TEXT; -- AUCKLAND, WELLINGTON, etc.

-- Create index for public holiday queries
CREATE INDEX IF NOT EXISTS "TimesheetEntry_date_isPublicHoliday_idx" ON "TimesheetEntry"("date", "isPublicHoliday");

-- ============================================
-- PAYROLL CALCULATION MODEL (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS "PayrollCalculation" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    
    -- Earnings
    "regularPay" DECIMAL(10,2) NOT NULL,
    "overtimePay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "publicHolidayPay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonuses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reimbursements" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(10,2) NOT NULL,
    
    -- Tax Deductions
    "payeTax" DECIMAL(10,2) NOT NULL,
    "accLevy" DECIMAL(10,2) NOT NULL,
    "studentLoanDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- KiwiSaver
    "kiwiSaverEmployee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "kiwiSaverEmployeeRate" DECIMAL(4,2) NOT NULL DEFAULT 0.03,
    "kiwiSaverEmployer" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "kiwiSaverEmployerRate" DECIMAL(4,2) NOT NULL DEFAULT 0.03,
    "esctDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Other Deductions
    "unionFees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "insuranceDeductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "childcareLevy" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Totals
    "totalDeductions" DECIMAL(10,2) NOT NULL,
    "netPay" DECIMAL(10,2) NOT NULL,
    "employerCost" DECIMAL(10,2) NOT NULL,
    
    -- Pay Period
    "payPeriodStart" TIMESTAMP(3) NOT NULL,
    "payPeriodEnd" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "payFrequency" TEXT NOT NULL,
    
    -- Calculation Metadata
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedBy" TEXT NOT NULL,
    "calculationVersion" TEXT NOT NULL DEFAULT '1.0',
    "taxYear" TEXT NOT NULL,
    
    -- Status
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "exportedAt" TIMESTAMP(3),
    "irdFiledAt" TIMESTAMP(3),
    
    CONSTRAINT "PayrollCalculation_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "PayrollCalculation" ADD CONSTRAINT "PayrollCalculation_timesheetId_fkey" 
    FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayrollCalculation" ADD CONSTRAINT "PayrollCalculation_employeeId_fkey" 
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PayrollCalculation" ADD CONSTRAINT "PayrollCalculation_companyId_fkey" 
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "PayrollCalculation_timesheetId_idx" ON "PayrollCalculation"("timesheetId");
CREATE INDEX IF NOT EXISTS "PayrollCalculation_employeeId_payPeriodStart_idx" ON "PayrollCalculation"("employeeId", "payPeriodStart");
CREATE INDEX IF NOT EXISTS "PayrollCalculation_companyId_payPeriodStart_idx" ON "PayrollCalculation"("companyId", "payPeriodStart");
CREATE INDEX IF NOT EXISTS "PayrollCalculation_status_exportedAt_idx" ON "PayrollCalculation"("status", "exportedAt");

-- Unique Constraint: One calculation per timesheet per employee
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollCalculation_timesheetId_employeeId_key" ON "PayrollCalculation"("timesheetId", "employeeId");

-- ============================================
-- DATA MIGRATION & CLEANUP
-- ============================================

-- Set employmentStartDate from existing startDate where available
UPDATE "Employee" 
SET "employmentStartDate" = "startDate"
WHERE "startDate" IS NOT NULL AND "employmentStartDate" IS NULL;

-- Initialize leave balances for existing employees based on employment duration
-- Annual leave: 4 weeks (160 hours for full-time) pro-rated
-- Sick leave: 10 days (80 hours) after 6 months employment
UPDATE "Employee"
SET 
  "annualLeaveBalance" = CASE 
    WHEN "startDate" IS NOT NULL AND "startDate" <= NOW() - INTERVAL '1 year' THEN 160.00
    WHEN "startDate" IS NOT NULL THEN EXTRACT(EPOCH FROM (NOW() - "startDate")) / (365.25 * 24 * 3600) * 160.00
    ELSE 0
  END,
  "sickLeaveBalance" = CASE 
    WHEN "startDate" IS NOT NULL AND "startDate" <= NOW() - INTERVAL '6 months' THEN 80.00
    ELSE 0
  END,
  "leaveBalanceLastUpdated" = NOW()
WHERE "annualLeaveBalance" = 0 OR "sickLeaveBalance" = 80;

-- Update hasStudentLoan based on tax code
UPDATE "Employee"
SET "hasStudentLoan" = true
WHERE "taxCode" LIKE '%SL%' AND "hasStudentLoan" = false;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN "Employee"."dateOfBirth" IS 'Employee date of birth for PAYE verification (Tax Administration Act 1994)';
COMMENT ON COLUMN "Employee"."studentLoanBalance" IS 'Current student loan balance for tracking';
COMMENT ON COLUMN "Employee"."hasStudentLoan" IS 'Whether employee has active student loan requiring deductions';
COMMENT ON COLUMN "Employee"."kiwiSaverEmployeeRate" IS 'KiwiSaver employee contribution rate (0.03, 0.04, 0.06, 0.08, 0.10)';
COMMENT ON COLUMN "Employee"."kiwiSaverEmployerRate" IS 'KiwiSaver employer contribution rate (minimum 0.03)';
COMMENT ON COLUMN "Employee"."esctRate" IS 'ESCT rate on employer KiwiSaver contribution (0.105, 0.175, 0.28, 0.33)';
COMMENT ON COLUMN "Employee"."annualLeaveBalance" IS 'Annual leave balance in hours (Holidays Act 2003)';
COMMENT ON COLUMN "Employee"."sickLeaveBalance" IS 'Sick leave balance in hours (Holidays Act 2003)';
COMMENT ON COLUMN "Employee"."alternativeDaysBalance" IS 'Alternative days owed for public holidays worked (Holidays Act 2003)';

COMMENT ON COLUMN "TimesheetEntry"."isPublicHoliday" IS 'Whether this entry is on a NZ public holiday';
COMMENT ON COLUMN "TimesheetEntry"."publicHolidayName" IS 'Name of the public holiday (Waitangi Day, Christmas, etc.)';
COMMENT ON COLUMN "TimesheetEntry"."publicHolidayHours" IS 'Hours worked on public holiday';
COMMENT ON COLUMN "TimesheetEntry"."publicHolidayMultiplier" IS 'Pay multiplier for public holiday work (minimum 1.5x, typically 2.0x)';
COMMENT ON COLUMN "TimesheetEntry"."alternativeDayGranted" IS 'Whether alternative day was granted for working this public holiday';

COMMENT ON TABLE "PayrollCalculation" IS 'Payroll calculations for IRD compliance (Tax Administration Act 1994)';
