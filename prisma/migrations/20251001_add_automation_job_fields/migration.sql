-- Add jobType and jobData to AutomationJob
ALTER TABLE "AutomationJob"
  ADD COLUMN IF NOT EXISTS "jobType" TEXT,
  ADD COLUMN IF NOT EXISTS "jobData" JSONB;

