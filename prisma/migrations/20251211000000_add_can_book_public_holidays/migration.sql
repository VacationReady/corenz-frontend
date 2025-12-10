-- AlterTable: Add canBookPublicHolidays field to Employee
-- This field controls whether an employee can book leave on public holidays.
-- Default is FALSE - employees cannot book leave on public holidays (they are already paid time off).
-- Set to TRUE for contractors or employees who don't receive public holidays as paid leave.

ALTER TABLE "Employee" ADD COLUMN "canBookPublicHolidays" BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN "Employee"."canBookPublicHolidays" IS 'Allow employee to book leave on public holidays. Default false for standard employees. Set true for contractors without public holiday entitlement.';
