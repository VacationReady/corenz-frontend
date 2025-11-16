-- Add visa/work permit and trial period fields for NZ compliance
-- Immigration Act 2009 and Employment Relations Act 2000

-- Add to Employee table
ALTER TABLE "Employee" ADD COLUMN "visaExpiryDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "workPermitType" TEXT;
ALTER TABLE "Employee" ADD COLUMN "ninetyDayTrialPeriod" BOOLEAN DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN "trialPeriodEndDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "trialPeriodAccepted" BOOLEAN DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN "trialPeriodAcceptedAt" TIMESTAMP(3);

-- Add comment for compliance
COMMENT ON COLUMN "Employee"."visaExpiryDate" IS 'Visa/work permit expiry date for Immigration Act 2009 compliance';
COMMENT ON COLUMN "Employee"."ninetyDayTrialPeriod" IS 'Whether employee is on 90-day trial period (Employment Relations Act 2000)';
COMMENT ON COLUMN "Employee"."trialPeriodAccepted" IS 'Whether employee has accepted trial period terms';
