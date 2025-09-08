/*
  Warnings:

  - You are about to drop the column `exitInterviewCompletedAt` on the `EmployeeOffboarding` table. All the data in the column will be lost.
  - The `status` column on the `EmployeeOffboarding` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `formTiming` column on the `EmployeeOffboarding` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `completionStatus` column on the `EmployeeOffboarding` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[employeeId]` on the table `EmployeeOffboarding` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `offboardingType` on the `EmployeeOffboarding` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category` on the `OffboardingTask` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."ExitInterviewSubmission" DROP CONSTRAINT "ExitInterviewSubmission_templateId_fkey";

-- AlterTable
ALTER TABLE "public"."EmployeeOffboarding" DROP COLUMN "exitInterviewCompletedAt",
DROP COLUMN "status",
ADD COLUMN     "status" "public"."OffboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
DROP COLUMN "offboardingType",
ADD COLUMN     "offboardingType" "public"."OffboardingType" NOT NULL,
DROP COLUMN "formTiming",
ADD COLUMN     "formTiming" "public"."ExitInterviewFormTiming",
DROP COLUMN "completionStatus",
ADD COLUMN     "completionStatus" "public"."ExitInterviewCompletionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."ExitInterview" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."OffboardingTask" DROP COLUMN "category",
ADD COLUMN     "category" "public"."TaskCategory" NOT NULL;

-- AlterTable
ALTER TABLE "public"."OnboardingTemplate" ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeOffboarding_employeeId_key" ON "public"."EmployeeOffboarding"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeOffboarding_status_idx" ON "public"."EmployeeOffboarding"("status");

-- CreateIndex
CREATE INDEX "OffboardingTask_category_idx" ON "public"."OffboardingTask"("category");

-- AddForeignKey
ALTER TABLE "public"."OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeOffboarding" ADD CONSTRAINT "EmployeeOffboarding_assetsReturnedTo_fkey" FOREIGN KEY ("assetsReturnedTo") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExitInterviewSubmission" ADD CONSTRAINT "ExitInterviewSubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."ExitInterviewFormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
