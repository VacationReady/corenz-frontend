-- Add contractEndDate to Employee if not exists
ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP;

