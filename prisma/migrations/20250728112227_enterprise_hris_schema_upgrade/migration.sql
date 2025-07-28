/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,name]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,name]` on the table `JobRole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `JobRole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `JobRole` table without a default value. This is not possible if the table is not empty.
*/

-- DropIndex
DROP INDEX IF EXISTS "Department_name_key";

-- DropIndex
DROP INDEX IF EXISTS "JobRole_name_key";

-- ========================================
-- COMPANY ALTERATION
-- ========================================
ALTER TABLE "Company" 
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "code" TEXT,
ADD COLUMN IF NOT EXISTS "industry" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "size" INTEGER,
ADD COLUMN IF NOT EXISTS "website" TEXT;

-- ========================================
-- DEPARTMENT ALTERATION
-- ========================================
ALTER TABLE "Department" 
ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "code" TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "headId" TEXT;

-- ✅ Add updatedAt as nullable first
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- ✅ Backfill updatedAt for existing rows
UPDATE "Department" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

-- ✅ Enforce NOT NULL after backfill
ALTER TABLE "Department" ALTER COLUMN "updatedAt" SET NOT NULL;

-- ========================================
-- JOBROLE ALTERATION
-- ========================================
ALTER TABLE "JobRole"
ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "level" INTEGER,
ADD COLUMN IF NOT EXISTS "payGrade" TEXT;

-- ✅ Add updatedAt as nullable first
ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- ✅ Backfill updatedAt for existing rows
UPDATE "JobRole" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

-- ✅ Add companyId as nullable first
ALTER TABLE "JobRole" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- ✅ Backfill companyId (assumes first company ID is default for legacy rows)
UPDATE "JobRole" 
SET "companyId" = (SELECT "id" FROM "Company" LIMIT 1) 
WHERE "companyId" IS NULL;

-- ✅ Now enforce NOT NULL
ALTER TABLE "JobRole" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "JobRole" ALTER COLUMN "updatedAt" SET NOT NULL;

-- ========================================
-- USER ALTERATION
-- ========================================
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "emailPreferences" JSONB,
ADD COLUMN IF NOT EXISTS "profileImageUrl" TEXT;

-- ========================================
-- UNIQUE CONSTRAINTS
-- (Safe unless duplicate values exist; adjust manually if needed)
-- ========================================
CREATE UNIQUE INDEX IF NOT EXISTS "Company_code_key" ON "Company"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Department_code_key" ON "Department"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Department_companyId_name_key" ON "Department"("companyId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "JobRole_companyId_name_key" ON "JobRole"("companyId", "name");

-- ========================================
-- FOREIGN KEYS
-- ========================================
ALTER TABLE "Department" 
ADD CONSTRAINT "Department_headId_fkey" FOREIGN KEY ("headId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "JobRole" 
ADD CONSTRAINT "JobRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
