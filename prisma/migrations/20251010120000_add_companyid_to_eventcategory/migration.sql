-- DropIndex
DROP INDEX "public"."EventCategory_name_key";

-- AlterTable: Add columns as nullable first
ALTER TABLE "public"."EventCategory" ADD COLUMN "companyId" TEXT;
ALTER TABLE "public"."EventSubcategory" ADD COLUMN "companyId" TEXT;
ALTER TABLE "public"."LeaveRequest" ADD COLUMN "companyId" TEXT;
ALTER TABLE "public"."LeaveEntitlement" ADD COLUMN "companyId" TEXT;

-- Backfill existing data with company ID from the main company
-- Get the main company ID (assuming there's only one company)
DO $$
DECLARE
    main_company_id TEXT;
BEGIN
    SELECT id INTO main_company_id FROM "public"."Company" LIMIT 1;

    -- Backfill EventCategory with main company ID
    UPDATE "public"."EventCategory" SET "companyId" = main_company_id WHERE "companyId" IS NULL;

    -- Backfill EventSubcategory with company ID from related EventCategory
    UPDATE "public"."EventSubcategory"
    SET "companyId" = ec."companyId"
    FROM "public"."EventCategory" ec
    WHERE "EventSubcategory"."eventCategoryId" = ec."id" AND "EventSubcategory"."companyId" IS NULL;

    -- Backfill LeaveRequest with company ID from related User
    UPDATE "public"."LeaveRequest"
    SET "companyId" = u."companyId"
    FROM "public"."User" u
    WHERE "LeaveRequest"."requesterId" = u."id" AND "LeaveRequest"."companyId" IS NULL;

    -- Backfill LeaveEntitlement with company ID from related Employee
    UPDATE "public"."LeaveEntitlement"
    SET "companyId" = e."companyId"
    FROM "public"."Employee" e
    WHERE "LeaveEntitlement"."employeeId" = e."id" AND "LeaveEntitlement"."companyId" IS NULL;
END $$;

-- Set columns to NOT NULL after backfilling
ALTER TABLE "public"."EventCategory" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "public"."EventSubcategory" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "public"."LeaveRequest" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "public"."LeaveEntitlement" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_companyId_name_key" ON "public"."EventCategory"("companyId", "name");
CREATE UNIQUE INDEX "EventSubcategory_companyId_name_key" ON "public"."EventSubcategory"("companyId", "name");

-- AddForeignKey
ALTER TABLE "public"."EventCategory" ADD CONSTRAINT "EventCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."EventSubcategory" ADD CONSTRAINT "EventSubcategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."LeaveEntitlement" ADD CONSTRAINT "LeaveEntitlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

