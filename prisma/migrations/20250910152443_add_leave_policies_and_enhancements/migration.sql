-- CreateEnum
CREATE TYPE "public"."EnforcementMode" AS ENUM ('HARD_BLOCK', 'SOFT_GATE');

-- CreateEnum
CREATE TYPE "public"."AccrualPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "public"."AccrualUnit" AS ENUM ('DAYS', 'HOURS');

-- CreateEnum
CREATE TYPE "public"."ProrationMethod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'NONE');

-- CreateEnum
CREATE TYPE "public"."PermissionScope" AS ENUM ('SELF', 'TEAM', 'COMPANY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."OnboardingStepType" ADD VALUE 'COLLECT_DOCUMENT';
ALTER TYPE "public"."OnboardingStepType" ADD VALUE 'FILL_FORM_BY_SLUG';
ALTER TYPE "public"."OnboardingStepType" ADD VALUE 'CREATE_TASK';
ALTER TYPE "public"."OnboardingStepType" ADD VALUE 'TRAINING_ASSIGNMENT';

-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."EventRule" ADD COLUMN     "maxBookingLengthMode" "public"."EnforcementMode" NOT NULL DEFAULT 'HARD_BLOCK',
ADD COLUMN     "maxConcurrentMode" "public"."EnforcementMode" NOT NULL DEFAULT 'HARD_BLOCK',
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "public"."OnboardingStep" ADD COLUMN     "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "slaDays" INTEGER,
ADD COLUMN     "taskOwnerId" TEXT,
ADD COLUMN     "trainingId" TEXT;

-- AlterTable
ALTER TABLE "public"."PermissionProfile" ADD COLUMN     "constraints" JSONB,
ADD COLUMN     "scope" "public"."PermissionScope";

-- CreateTable
CREATE TABLE "public"."LeavePolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventCategoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "accrualRate" DOUBLE PRECISION NOT NULL,
    "accrualPeriod" "public"."AccrualPeriod" NOT NULL DEFAULT 'MONTHLY',
    "accrualUnit" "public"."AccrualUnit" NOT NULL DEFAULT 'DAYS',
    "enableProration" BOOLEAN NOT NULL DEFAULT true,
    "prorationMethod" "public"."ProrationMethod" NOT NULL DEFAULT 'DAILY',
    "serviceLengthTiers" JSONB,
    "allowNegativeBalance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeavePolicyAssignment" (
    "id" TEXT NOT NULL,
    "leavePolicyId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jobRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "employeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePolicyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PermissionProfileAudit" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionProfileAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeavePolicy_companyId_eventCategoryId_idx" ON "public"."LeavePolicy"("companyId", "eventCategoryId");

-- CreateIndex
CREATE INDEX "LeavePolicy_effectiveFrom_effectiveTo_idx" ON "public"."LeavePolicy"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_companyId_name_key" ON "public"."LeavePolicy"("companyId", "name");

-- CreateIndex
CREATE INDEX "LeavePolicyAssignment_companyId_idx" ON "public"."LeavePolicyAssignment"("companyId");

-- CreateIndex
CREATE INDEX "LeavePolicyAssignment_effectiveFrom_effectiveTo_idx" ON "public"."LeavePolicyAssignment"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "PermissionProfileAudit_profileId_idx" ON "public"."PermissionProfileAudit"("profileId");

-- CreateIndex
CREATE INDEX "PermissionProfileAudit_changedAt_idx" ON "public"."PermissionProfileAudit"("changedAt");

-- AddForeignKey
ALTER TABLE "public"."LeavePolicy" ADD CONSTRAINT "LeavePolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeavePolicy" ADD CONSTRAINT "LeavePolicy_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "public"."EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeavePolicyAssignment" ADD CONSTRAINT "LeavePolicyAssignment_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES "public"."LeavePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeavePolicyAssignment" ADD CONSTRAINT "LeavePolicyAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissionProfileAudit" ADD CONSTRAINT "PermissionProfileAudit_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."PermissionProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
