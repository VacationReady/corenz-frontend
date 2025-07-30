-- CreateEnum
CREATE TYPE "OnboardingStepType" AS ENUM ('ACKNOWLEDGE_DOCUMENT', 'UPLOAD_DOCUMENT', 'INSTRUCTION');

-- CreateEnum
CREATE TYPE "OnboardingUploadType" AS ENUM ('PASSPORT', 'RIGHT_TO_WORK', 'DRIVER_LICENSE', 'TRAINING_CERTIFICATE', 'OTHER');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "onboardingStatus" JSONB,
ADD COLUMN     "onboardingTemplateId" TEXT;

-- CreateTable
CREATE TABLE "OnboardingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" TEXT NOT NULL,
    "type" "OnboardingStepType" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "documentId" TEXT,
    "uploadType" "OnboardingUploadType",
    "instruction" TEXT,

    CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_onboardingTemplateId_fkey" FOREIGN KEY ("onboardingTemplateId") REFERENCES "OnboardingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
