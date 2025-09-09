-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_companyId_fkey";
ALTER TABLE "public"."Employee" DROP CONSTRAINT "Employee_companyId_fkey";
ALTER TABLE "public"."SavedReport" DROP CONSTRAINT "SavedReport_companyId_fkey";

-- Backfill existing data
UPDATE "public"."User" u
SET "companyId" = e."companyId"
FROM "public"."Employee" e
WHERE u."id" = e."userId" AND u."companyId" IS NULL AND e."companyId" IS NOT NULL;

UPDATE "public"."SavedReport" sr
SET "companyId" = u."companyId"
FROM "public"."User" u
WHERE sr."companyId" IS NULL AND sr."createdBy" = u."id" AND u."companyId" IS NOT NULL;

DELETE FROM "public"."SavedReport" WHERE "companyId" IS NULL;
DELETE FROM "public"."Employee" WHERE "companyId" IS NULL;
DELETE FROM "public"."User" WHERE "companyId" IS NULL;

-- DropIndex
DROP INDEX "public"."User_email_key";

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "public"."Employee" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "public"."SavedReport" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_companyId_key" ON "public"."User"("email", "companyId");
CREATE UNIQUE INDEX "SavedReport_name_companyId_key" ON "public"."SavedReport"("name", "companyId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."SavedReport" ADD CONSTRAINT "SavedReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
