-- Add hours-based tracking fields to LeaveEntitlement
-- This supports NZ Holidays Act 2003 compliance for part-time and variable-hour employees
-- Internal unit: Hours | Display unit: Days (configurable)
--
-- IMPORTANT: This migration is SCHEMA-ONLY. It does NOT backfill data.
-- Backfilling must be done via TypeScript script (scripts/backfill-leave-hours.ts)
-- which correctly uses: WorkingPattern.hoursPerDay → Company.defaultHoursPerDay → 8 (fallback)
--
-- DO NOT add any UPDATE statements here that assume hours per day.

-- Create LeaveDisplayUnit enum
CREATE TYPE "LeaveDisplayUnit" AS ENUM ('DAYS', 'HOURS', 'BOTH');

-- Add hour fields to LeaveEntitlement (nullable - will be populated by backfill script)
ALTER TABLE "LeaveEntitlement" ADD COLUMN "totalHours" DECIMAL(10,2);
ALTER TABLE "LeaveEntitlement" ADD COLUMN "usedHours" DECIMAL(10,2);
ALTER TABLE "LeaveEntitlement" ADD COLUMN "carryoverHours" DECIMAL(10,2);

-- Add company-level configuration for hours display
ALTER TABLE "Company" ADD COLUMN "defaultHoursPerDay" DECIMAL(4,2) DEFAULT 8.0;
ALTER TABLE "Company" ADD COLUMN "leaveDisplayUnit" "LeaveDisplayUnit" DEFAULT 'DAYS';

-- Add feature flag for hours-based tracking (default OFF for existing tenants)
-- When false: system behaves exactly as before (days only), hours fields are ignored
-- When true: hours become source of truth, days are derived for display
ALTER TABLE "Company" ADD COLUMN "leaveHoursEnabled" BOOLEAN DEFAULT false;

-- Add index for efficient querying (only useful once data is backfilled)
CREATE INDEX IF NOT EXISTS "LeaveEntitlement_totalHours_idx" ON "LeaveEntitlement"("totalHours");
