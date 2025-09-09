-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressCountry" TEXT,
ADD COLUMN     "addressPostcode" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelationship" TEXT,
ADD COLUMN     "genderOptionId" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "pronouns" TEXT;

-- CreateTable
CREATE TABLE "public"."PersonalInfoAudit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalInfoAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GenderOption" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenderOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalInfoAudit_companyId_subjectUserId_changedAt_idx" ON "public"."PersonalInfoAudit"("companyId", "subjectUserId", "changedAt");

-- CreateIndex
CREATE INDEX "GenderOption_companyId_active_idx" ON "public"."GenderOption"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "GenderOption_companyId_key_key" ON "public"."GenderOption"("companyId", "key");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_genderOptionId_fkey" FOREIGN KEY ("genderOptionId") REFERENCES "public"."GenderOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonalInfoAudit" ADD CONSTRAINT "PersonalInfoAudit_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonalInfoAudit" ADD CONSTRAINT "PersonalInfoAudit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GenderOption" ADD CONSTRAINT "GenderOption_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
