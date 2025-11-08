-- Rollback Migration --------------------------------------------------------
-- Version: 20251108035700_fix_time_tracking_settings_columns
-- Purpose: Restore legacy column values and drop newly added boolean columns.
-------------------------------------------------------------------------------

BEGIN;

-- Step 1: Copy allowManualEntry back to legacy columns where available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'TimeTrackingSettings'
          AND column_name = 'allowManualEntry'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'TimeTrackingSettings'
              AND column_name = 'allowMobileClock'
        ) THEN
            UPDATE "TimeTrackingSettings"
            SET "allowMobileClock" = COALESCE("allowManualEntry", true);
        ELSE
            UPDATE "TimeTrackingSettings"
            SET "allowManualTimeEntry" = COALESCE("allowManualEntry", true);
        END IF;
    END IF;
END $$;

-- Step 2: Copy requirePhotos back to legacy photo columns when available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'TimeTrackingSettings'
          AND column_name = 'requirePhotos'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'TimeTrackingSettings'
              AND column_name = 'requirePhoto'
        ) THEN
            UPDATE "TimeTrackingSettings"
            SET "requirePhoto" = CASE WHEN COALESCE("requirePhotos", false) THEN 'CLOCK_IN_OUT' ELSE 'NONE' END;
        ELSE
            UPDATE "TimeTrackingSettings"
            SET "photoRequirement" = CASE WHEN COALESCE("requirePhotos", false)
                                           THEN 'CLOCK_IN_OUT'
                                           ELSE 'NONE'
                                      END::"PhotoRequirement";
        END IF;
    END IF;
END $$;

-- Step 3: Drop newly added columns (safe even if already removed)
ALTER TABLE "TimeTrackingSettings"
    DROP COLUMN IF EXISTS "allowManualEntry",
    DROP COLUMN IF EXISTS "requirePhotos";

COMMIT;
