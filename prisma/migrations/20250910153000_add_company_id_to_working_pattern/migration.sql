-- Add companyId column to WorkingPattern and backfill existing records
ALTER TABLE "WorkingPattern" ADD COLUMN "companyId" TEXT;

-- Populate companyId based on linked employees
UPDATE "WorkingPattern" wp
SET "companyId" = (
  SELECT e."companyId"
  FROM "Employee" e
  WHERE e."workingPatternId" = wp."id"
  LIMIT 1
)
WHERE "companyId" IS NULL;

-- Fallback: assign first company if still null
UPDATE "WorkingPattern"
SET "companyId" = (SELECT "id" FROM "Company" LIMIT 1)
WHERE "companyId" IS NULL;

-- Make column required and add foreign key
ALTER TABLE "WorkingPattern" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "WorkingPattern"
ADD CONSTRAINT "WorkingPattern_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
