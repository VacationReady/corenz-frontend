-- AlterTable TimeTrackingSettings: Unify field names and add enums
-- This migration renames columns and converts string fields to proper enums

-- Step 1: Create new enum types
CREATE TYPE "PhotoRequirement" AS ENUM ('NONE', 'CLOCK_IN', 'CLOCK_IN_OUT');
CREATE TYPE "OvertimeCalculationMode" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'PATTERN_BASED');
CREATE TYPE "PayrollExportFormat" AS ENUM ('CSV', 'EXCEL', 'JSON');

-- Step 2: Add new columns with temporary names
ALTER TABLE "TimeTrackingSettings" 
  ADD COLUMN "requireGpsLocation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "photoRequirement" "PhotoRequirement" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "allowManualTimeEntry" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "enableGeofencing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "geofenceRadius" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "requireBreaks" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "minBreakDuration" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "requireShiftConfirmation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "overtimeCalculationMode_new" "OvertimeCalculationMode" NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN "payrollExportFormat" "PayrollExportFormat" NOT NULL DEFAULT 'CSV',
  ADD COLUMN "includeBreaks" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "includeNotes" BOOLEAN NOT NULL DEFAULT true;

-- Step 3: Backfill data from old columns to new columns
-- Copy requireGPS -> requireGpsLocation
UPDATE "TimeTrackingSettings" SET "requireGpsLocation" = "requireGPS";

-- Convert requirePhoto string to PhotoRequirement enum
UPDATE "TimeTrackingSettings" 
SET "photoRequirement" = CASE 
  WHEN "requirePhoto" = 'BOTH' OR "requirePhoto" = 'CLOCK_IN_OUT' THEN 'CLOCK_IN_OUT'::"PhotoRequirement"
  WHEN "requirePhoto" = 'CLOCK_IN' THEN 'CLOCK_IN'::"PhotoRequirement"
  ELSE 'NONE'::"PhotoRequirement"
END;

-- Copy allowMobileClock -> allowManualTimeEntry (assuming mobile clock implies manual entry capability)
UPDATE "TimeTrackingSettings" SET "allowManualTimeEntry" = "allowMobileClock";

-- Convert overtimeCalculationMode string to enum
UPDATE "TimeTrackingSettings"
SET "overtimeCalculationMode_new" = CASE
  WHEN "overtimeCalculationMode" = 'DAILY' THEN 'DAILY'::"OvertimeCalculationMode"
  WHEN "overtimeCalculationMode" = 'MONTHLY' THEN 'MONTHLY'::"OvertimeCalculationMode"
  WHEN "overtimeCalculationMode" = 'PATTERN_BASED' THEN 'PATTERN_BASED'::"OvertimeCalculationMode"
  ELSE 'WEEKLY'::"OvertimeCalculationMode"
END;

-- Convert exportFormat string to PayrollExportFormat enum
UPDATE "TimeTrackingSettings"
SET "payrollExportFormat" = CASE
  WHEN "exportFormat" = 'EXCEL' THEN 'EXCEL'::"PayrollExportFormat"
  WHEN "exportFormat" = 'JSON' THEN 'JSON'::"PayrollExportFormat"
  ELSE 'CSV'::"PayrollExportFormat"
END;

-- Step 4: Rename requireShiftConfirm to requireShiftConfirmation
ALTER TABLE "TimeTrackingSettings" RENAME COLUMN "requireShiftConfirm" TO "requireShiftConfirmation_old";
UPDATE "TimeTrackingSettings" SET "requireShiftConfirmation" = "requireShiftConfirmation_old";

-- Step 5: Drop old columns
ALTER TABLE "TimeTrackingSettings" 
  DROP COLUMN "requireGPS",
  DROP COLUMN "requirePhoto",
  DROP COLUMN "allowMobileClock",
  DROP COLUMN "requireShiftConfirm",
  DROP COLUMN "requireShiftConfirmation_old",
  DROP COLUMN "overtimeCalculationMode",
  DROP COLUMN "exportFormat";

-- Step 6: Rename new overtimeCalculationMode column
ALTER TABLE "TimeTrackingSettings" 
  RENAME COLUMN "overtimeCalculationMode_new" TO "overtimeCalculationMode";

-- Step 7: Update indexes if needed (companyId index already exists)
-- No additional indexes needed for the new columns
