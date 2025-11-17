-- Add versioning columns to OnboardingTemplate
ALTER TABLE "OnboardingTemplate" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "OnboardingTemplate" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "OnboardingTemplate" ADD COLUMN "publishedBy" TEXT;

-- Add versioning columns to OnboardingStep
ALTER TABLE "OnboardingStep" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "OnboardingStep" ADD COLUMN "updatedBy" TEXT;

-- Create TemplateVersionStatus enum
CREATE TYPE "TemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- Create TemplateVersion table for version history
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "TemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL,
    "departmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jobRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stepsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "changesSummary" TEXT,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- Create TemplateStepVersion table for step-level version history
CREATE TABLE "TemplateStepVersion" (
    "id" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "type" "OnboardingStepType" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "documentId" TEXT,
    "uploadType" "OnboardingUploadType",
    "instruction" TEXT,
    "formId" TEXT,
    "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "slaDays" INTEGER,
    "taskOwnerId" TEXT,
    "trainingId" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderDaysBefore" INTEGER,
    "reminderTime" TEXT,
    "reminderEscalationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderEscalationDays" INTEGER,
    "reminderEscalationRole" TEXT,
    "reminderEscalationUserId" TEXT,
    "slaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slaCompletionDays" INTEGER,
    "slaWarningDays" INTEGER,
    "excludePublicHolidays" BOOLEAN NOT NULL DEFAULT true,
    "excludeWeekends" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "changeType" TEXT,

    CONSTRAINT "TemplateStepVersion_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "TemplateVersion_templateId_version_key" ON "TemplateVersion"("templateId", "version");
CREATE UNIQUE INDEX "TemplateStepVersion_templateVersionId_stepId_version_key" ON "TemplateStepVersion"("templateVersionId", "stepId", "version");

-- Create indexes for performance
CREATE INDEX "OnboardingTemplate_companyId_version_idx" ON "OnboardingTemplate"("companyId", "version");
CREATE INDEX "OnboardingTemplate_companyId_isActive_idx" ON "OnboardingTemplate"("companyId", "isActive");
CREATE INDEX "OnboardingStep_templateId_version_idx" ON "OnboardingStep"("templateId", "version");
CREATE INDEX "TemplateVersion_templateId_status_idx" ON "TemplateVersion"("templateId", "status");
CREATE INDEX "TemplateVersion_companyId_createdAt_idx" ON "TemplateVersion"("companyId", "createdAt");
CREATE INDEX "TemplateVersion_status_publishedAt_idx" ON "TemplateVersion"("status", "publishedAt");
CREATE INDEX "TemplateStepVersion_stepId_version_idx" ON "TemplateStepVersion"("stepId", "version");
CREATE INDEX "TemplateStepVersion_companyId_createdAt_idx" ON "TemplateStepVersion"("companyId", "createdAt");
CREATE INDEX "TemplateStepVersion_templateVersionId_order_idx" ON "TemplateStepVersion"("templateVersionId", "order");

-- Add foreign key constraints
ALTER TABLE "OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingStep" ADD CONSTRAINT "OnboardingStep_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TemplateStepVersion" ADD CONSTRAINT "TemplateStepVersion_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "TemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateStepVersion" ADD CONSTRAINT "TemplateStepVersion_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OnboardingStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemplateStepVersion" ADD CONSTRAINT "TemplateStepVersion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
