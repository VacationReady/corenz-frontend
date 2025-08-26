-- Add enhanced exit interview fields to EmployeeOffboarding table
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "exitInterviewDate" TIMESTAMP(3);
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "exitInterviewEnd" TIMESTAMP(3);
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "interviewerUserId" TEXT;
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "interviewerName" TEXT;
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "interviewerEmail" TEXT;
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "location" TEXT;

-- Add exit interview form management fields
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "sendForm" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "formTemplateId" TEXT;
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "formTiming" TEXT;
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "inviteIcsUid" TEXT;
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "inviteLastSentAt" TIMESTAMP(3);
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "scheduledSendAt" TIMESTAMP(3);
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "completionTokenHash" TEXT;
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "completionStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- Add SCHEDULED to OffboardingStatus enum
ALTER TYPE "OffboardingStatus" ADD VALUE 'SCHEDULED';

-- Create ExitInterviewFormTiming enum
CREATE TYPE "ExitInterviewFormTiming" AS ENUM ('NOW', 'ON_DATE');

-- Create ExitInterviewCompletionStatus enum
CREATE TYPE "ExitInterviewCompletionStatus" AS ENUM ('PENDING', 'STARTED', 'SUBMITTED');

-- Create ExitInterviewFormTemplate table
CREATE TABLE "ExitInterviewFormTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schemaJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExitInterviewFormTemplate_pkey" PRIMARY KEY ("id")
);

-- Create ExitInterviewSubmission table
CREATE TABLE "ExitInterviewSubmission" (
    "id" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "answersJson" JSONB,

    CONSTRAINT "ExitInterviewSubmission_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX "EmployeeOffboarding_exitInterviewDate_idx" ON "EmployeeOffboarding"("exitInterviewDate");
CREATE INDEX "EmployeeOffboarding_scheduledSendAt_idx" ON "EmployeeOffboarding"("scheduledSendAt");
CREATE INDEX "ExitInterviewFormTemplate_isActive_idx" ON "ExitInterviewFormTemplate"("isActive");
CREATE INDEX "ExitInterviewSubmission_offboardingId_idx" ON "ExitInterviewSubmission"("offboardingId");
CREATE INDEX "ExitInterviewSubmission_templateId_idx" ON "ExitInterviewSubmission"("templateId");

-- Add foreign key constraints
ALTER TABLE "EmployeeOffboarding" ADD CONSTRAINT "EmployeeOffboarding_interviewerUserId_fkey" FOREIGN KEY ("interviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeOffboarding" ADD CONSTRAINT "EmployeeOffboarding_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "ExitInterviewFormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExitInterviewSubmission" ADD CONSTRAINT "ExitInterviewSubmission_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "EmployeeOffboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitInterviewSubmission" ADD CONSTRAINT "ExitInterviewSubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExitInterviewFormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
