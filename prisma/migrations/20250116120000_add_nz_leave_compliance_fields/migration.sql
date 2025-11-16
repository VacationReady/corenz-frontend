-- AlterTable
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "sickLeaveDaysPerYear" DECIMAL(4,1) DEFAULT 10,
ADD COLUMN IF NOT EXISTS "alternativeHolidayBalance" DECIMAL(5,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "publicHolidaysPerYear" INTEGER DEFAULT 11;

-- Add comments for documentation
COMMENT ON COLUMN "Employee"."sickLeaveDaysPerYear" IS 'NZ Holidays Act 2003: Annual sick leave entitlement (minimum 10 days after 6 months)';
COMMENT ON COLUMN "Employee"."alternativeHolidayBalance" IS 'NZ Holidays Act 2003: Alternative holiday days earned when working public holidays';
COMMENT ON COLUMN "Employee"."publicHolidaysPerYear" IS 'NZ Holidays Act 2003: Number of public holidays per year (11 national + regional)';
