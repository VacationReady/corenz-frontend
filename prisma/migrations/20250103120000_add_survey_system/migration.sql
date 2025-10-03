-- CreateEnum
CREATE TYPE "public"."SurveyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."SurveyAutomationTrigger" AS ENUM ('SCHEDULED', 'ONBOARDING_COMPLETE', 'ANNIVERSARY', 'PERFORMANCE_REVIEW', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."SurveyAutomationFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "public"."Survey" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formId" TEXT NOT NULL,
    "status" "public"."SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "sentDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "responses" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION,
    "sentimentScore" DOUBLE PRECISION,
    "keyInsights" TEXT[],
    "topThemes" TEXT[],
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SurveyRecipient" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "actionItemId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "SurveyRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "responseData" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentimentScore" DOUBLE PRECISION,
    "keyThemes" TEXT[],

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SurveyAutomation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "surveyId" TEXT,
    "formId" TEXT NOT NULL,
    "trigger" "public"."SurveyAutomationTrigger" NOT NULL,
    "frequency" "public"."SurveyAutomationFrequency",
    "scheduleConfig" JSONB,
    "targetAudience" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SurveyAutomationRun" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "surveyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recipientsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SurveyAutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Survey_companyId_status_idx" ON "public"."Survey"("companyId", "status");

-- CreateIndex
CREATE INDEX "Survey_companyId_sentDate_idx" ON "public"."Survey"("companyId", "sentDate");

-- CreateIndex
CREATE INDEX "Survey_companyId_deadline_idx" ON "public"."Survey"("companyId", "deadline");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyRecipient_surveyId_employeeId_key" ON "public"."SurveyRecipient"("surveyId", "employeeId");

-- CreateIndex
CREATE INDEX "SurveyRecipient_surveyId_status_idx" ON "public"."SurveyRecipient"("surveyId", "status");

-- CreateIndex
CREATE INDEX "SurveyRecipient_employeeId_status_idx" ON "public"."SurveyRecipient"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_surveyId_employeeId_key" ON "public"."SurveyResponse"("surveyId", "employeeId");

-- CreateIndex
CREATE INDEX "SurveyResponse_surveyId_submittedAt_idx" ON "public"."SurveyResponse"("surveyId", "submittedAt");

-- CreateIndex
CREATE INDEX "SurveyAutomation_companyId_isActive_idx" ON "public"."SurveyAutomation"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "SurveyAutomation_companyId_nextRunAt_idx" ON "public"."SurveyAutomation"("companyId", "nextRunAt");

-- CreateIndex
CREATE INDEX "SurveyAutomationRun_automationId_startedAt_idx" ON "public"."SurveyAutomationRun"("automationId", "startedAt");

-- CreateIndex
CREATE INDEX "SurveyAutomationRun_status_idx" ON "public"."SurveyAutomationRun"("status");

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyRecipient" ADD CONSTRAINT "SurveyRecipient_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyRecipient" ADD CONSTRAINT "SurveyRecipient_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyRecipient" ADD CONSTRAINT "SurveyRecipient_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "public"."ActionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyResponse" ADD CONSTRAINT "SurveyResponse_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyAutomation" ADD CONSTRAINT "SurveyAutomation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyAutomation" ADD CONSTRAINT "SurveyAutomation_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyAutomation" ADD CONSTRAINT "SurveyAutomation_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyAutomation" ADD CONSTRAINT "SurveyAutomation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyAutomationRun" ADD CONSTRAINT "SurveyAutomationRun_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "public"."SurveyAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyAutomationRun" ADD CONSTRAINT "SurveyAutomationRun_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
