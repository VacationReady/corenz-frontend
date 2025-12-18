-- Fix Timesheet uniqueness under concurrency
--
-- Problem:
-- Manual time entry could create duplicate Timesheet rows for the same period under concurrency.
--
-- Solution:
-- 1) De-dupe any existing duplicates by re-pointing dependent rows to a single "kept" Timesheet.
-- 2) Replace the old unique index with a new compound unique index including companyId.

-- Build a mapping of duplicate timesheets -> kept timesheet
CREATE TEMP TABLE "_TimesheetDedupe" AS
WITH ranked AS (
  SELECT
    "id",
    "companyId",
    "employeeId",
    "periodStart",
    "periodEnd",
    FIRST_VALUE("id") OVER (
      PARTITION BY "companyId", "employeeId", "periodStart", "periodEnd"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS keep_id
  FROM "Timesheet"
)
SELECT "id" AS dupe_id, keep_id
FROM ranked
WHERE "id" <> keep_id;

-- Re-point dependent rows
UPDATE "ClockEntry" ce
SET "timesheetId" = d.keep_id
FROM "_TimesheetDedupe" d
WHERE ce."timesheetId" = d.dupe_id;

UPDATE "TimesheetEntry" te
SET "timesheetId" = d.keep_id
FROM "_TimesheetDedupe" d
WHERE te."timesheetId" = d.dupe_id;

UPDATE "TimesheetApprovalStage" tas
SET "timesheetId" = d.keep_id
FROM "_TimesheetDedupe" d
WHERE tas."timesheetId" = d.dupe_id;

UPDATE "TimesheetEntryAudit" tea
SET "timesheetId" = d.keep_id
FROM "_TimesheetDedupe" d
WHERE tea."timesheetId" = d.dupe_id;

UPDATE "BreakRecord" br
SET "timesheetId" = d.keep_id
FROM "_TimesheetDedupe" d
WHERE br."timesheetId" = d.dupe_id;

-- PayrollCalculation has a uniqueness constraint (@@unique([timesheetId, employeeId]))
-- so only move records when the target doesn't already have one; delete any remaining on duplicate timesheets.
UPDATE "PayrollCalculation" pc
SET "timesheetId" = d.keep_id
FROM "_TimesheetDedupe" d
WHERE pc."timesheetId" = d.dupe_id
  AND NOT EXISTS (
    SELECT 1
    FROM "PayrollCalculation" pc2
    WHERE pc2."timesheetId" = d.keep_id
      AND pc2."employeeId" = pc."employeeId"
  );

DELETE FROM "PayrollCalculation" pc
USING "_TimesheetDedupe" d
WHERE pc."timesheetId" = d.dupe_id;

-- Delete duplicate timesheets now that dependents are re-pointed
DELETE FROM "Timesheet" t
USING "_TimesheetDedupe" d
WHERE t."id" = d.dupe_id;

DROP TABLE "_TimesheetDedupe";

-- Replace unique index (old: employeeId+periodStart+periodEnd)
DROP INDEX IF EXISTS "Timesheet_employeeId_periodStart_periodEnd_key";

-- New: companyId+employeeId+periodStart+periodEnd
CREATE UNIQUE INDEX IF NOT EXISTS "Timesheet_companyId_employeeId_periodStart_periodEnd_key"
  ON "Timesheet"("companyId", "employeeId", "periodStart", "periodEnd");
