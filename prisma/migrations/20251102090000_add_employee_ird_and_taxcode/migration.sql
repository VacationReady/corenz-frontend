-- Create TaxCode enum and new IRD number field
CREATE TYPE "TaxCode" AS ENUM (
  'M',
  'ME',
  'M SL',
  'ME SL',
  'SB',
  'SB SL',
  'S',
  'S SL',
  'SH',
  'SH SL',
  'ST',
  'ST SL',
  'SA',
  'SA SL',
  'SL',
  'SED',
  'STC',
  'CAE',
  'EDW',
  'ND',
  'NS',
  'NC',
  'NCC',
  'WT',
  'P'
);

ALTER TABLE "Employee"
  ADD COLUMN "irdNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "taxCode_tmp" "TaxCode";

UPDATE "Employee"
SET "taxCode_tmp" = CASE
  WHEN "taxCode" IS NULL THEN NULL
  WHEN replace("taxCode", '_', ' ') IN ('M', 'ME', 'M SL', 'ME SL', 'SB', 'SB SL', 'S', 'S SL', 'SH', 'SH SL', 'ST', 'ST SL', 'SA', 'SA SL', 'SL', 'SED', 'STC', 'CAE', 'EDW', 'ND', 'NS', 'NC', 'NCC', 'WT', 'P')
    THEN replace("taxCode", '_', ' ')::"TaxCode"
  ELSE NULL
END;

ALTER TABLE "Employee" DROP COLUMN "taxCode";
ALTER TABLE "Employee" RENAME COLUMN "taxCode_tmp" TO "taxCode";

CREATE UNIQUE INDEX "Employee_companyId_irdNumber_key" ON "Employee"("companyId", "irdNumber");
