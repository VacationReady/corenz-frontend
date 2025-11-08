-- Migration Metadata ---------------------------------------------------------
-- Version: 20251108035700_fix_time_tracking_settings_columns
-- Timestamp: 2025-11-08T03:57:00Z
-- Description: Align manual entry and photo requirement boolean columns with
--              API/UI naming by adding allowManualEntry and requirePhotos.
--              Backfill values from legacy fields and ensure NOT NULL defaults.
-- Production Runbook:
--   1. Run `npx prisma migrate deploy`.
--   2. Execute `node scripts/verify-time-tracking-settings-migration.ts`.
--   3. Review verification output and address any discrepancies before release.
-------------------------------------------------------------------------------

BEGIN;

-- Step 1: Add new boolean columns with safe defaults for backward compatibility
ALTER TABLE "TimeTrackingSettings"
    ADD COLUMN IF NOT EXISTS "allowManualEntry" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "requirePhotos" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Backfill allowManualEntry from allowMobileClock when available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'TimeTrackingSettings'
          AND column_name = 'allowMobileClock'
    ) THEN
        UPDATE "TimeTrackingSettings"
        SET "allowManualEntry" = "allowMobileClock";
    ELSE
        -- Fallback to canonical allowManualTimeEntry when legacy column is absent
        UPDATE "TimeTrackingSettings"
        SET "allowManualEntry" = "allowManualTimeEntry";
    END IF;
END $$;

-- Step 3: Backfill requirePhotos from legacy requirePhoto string column when present
DO $$
DECLARE
    legacy_requirement_present BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'TimeTrackingSettings'
          AND column_name = 'requirePhoto'
    ) INTO legacy_requirement_present;

    IF legacy_requirement_present THEN
        UPDATE "TimeTrackingSettings"
        SET "requirePhotos" = CASE UPPER(COALESCE("requirePhoto", 'NO'))
            WHEN 'YES' THEN true
            WHEN 'CLOCK_IN' THEN true
            WHEN 'CLOCK_IN_OUT' THEN true
            WHEN 'BOTH' THEN true
            ELSE false
        END;
    ELSE
        -- Fallback to enum-based photoRequirement when legacy column is absent
        UPDATE "TimeTrackingSettings"
        SET "requirePhotos" = CASE "photoRequirement"
            WHEN 'NONE' THEN false
            ELSE true
        END;
    END IF;
END $$;

-- Step 4: Reinforce NOT NULL constraint post-backfill
ALTER TABLE "TimeTrackingSettings"
    ALTER COLUMN "allowManualEntry" SET NOT NULL,
    ALTER COLUMN "requirePhotos" SET NOT NULL;

COMMIT;

-- Step 5: No additional indexes required (companyId already indexed)
-- Verification handled via scripts/verify-time-tracking-settings-migration.ts
