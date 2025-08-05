-- AlterTable
ALTER TABLE "public"."Employee" ALTER COLUMN "isActive" SET DEFAULT true;

-- AlterTable
ALTER TABLE "public"."OnboardingStep" ADD COLUMN     "formId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OnboardingStep" ADD CONSTRAINT "OnboardingStep_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;
