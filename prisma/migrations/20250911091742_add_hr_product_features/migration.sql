-- CreateEnum
CREATE TYPE "public"."AutomationTriggerType" AS ENUM ('DOCUMENT_EXPIRING', 'FORM_SUBMITTED', 'ONBOARDING_STEP_COMPLETED', 'EMPLOYEE_CREATED');

-- CreateEnum
CREATE TYPE "public"."AutomationExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."StaffingDensityBehavior" AS ENUM ('DENY', 'REQUIRE_APPROVAL');

-- CreateEnum
CREATE TYPE "public"."AuditEntityType" AS ENUM ('LEAVE_POLICY', 'PERMISSION_PROFILE', 'EVENT_RULE', 'DOCUMENT_TYPE', 'AUTOMATION_RULE', 'NOTIFICATION_CHANNEL', 'SSO_CONFIG', 'SCIM_CONFIG', 'BRANDING_CONFIG');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'ACTIVATED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "public"."AuditActorType" AS ENUM ('USER', 'SYSTEM', 'API');

-- CreateEnum
CREATE TYPE "public"."NotificationChannelType" AS ENUM ('EMAIL', 'SLACK', 'TEAMS', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "public"."SSOProvider" AS ENUM ('OIDC', 'SAML', 'AZURE_AD', 'GOOGLE', 'OKTA');

-- CreateTable
CREATE TABLE "public"."AutomationRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" "public"."AutomationTriggerType" NOT NULL,
    "triggerConfig" JSONB NOT NULL,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AutomationExecution" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."AutomationExecutionStatus" NOT NULL,
    "triggerData" JSONB NOT NULL,
    "executionLog" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventRuleOverride" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eventCategoryId" TEXT NOT NULL,
    "departmentId" TEXT,
    "teamId" TEXT,
    "enforceEntitlement" BOOLEAN,
    "noticePeriodDays" INTEGER,
    "maxConcurrent" INTEGER,
    "maxBookingLength" INTEGER,
    "maxConcurrentMode" "public"."EnforcementMode",
    "maxBookingLengthMode" "public"."EnforcementMode",
    "staffingDensityEnabled" BOOLEAN NOT NULL DEFAULT false,
    "staffingDensityThreshold" DOUBLE PRECISION,
    "staffingDensityBehavior" "public"."StaffingDensityBehavior" NOT NULL DEFAULT 'DENY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRuleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GlobalAuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" "public"."AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" "public"."AuditActorType" NOT NULL DEFAULT 'USER',
    "changes" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationChannel" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "public"."NotificationChannelType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fallbackToEmail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emailTemplateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailTemplateConfig" JSONB,
    "defaultChannels" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SSOConfiguration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "public"."SSOProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SSOConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SCIMConfiguration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "endpoint" TEXT,
    "token" TEXT,
    "autoProvisionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoDeprovisionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "attributeMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SCIMConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BrandingConfiguration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "emailHeaderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailFooterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailFooterText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandingConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationRule_companyId_isActive_idx" ON "public"."AutomationRule"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRule_companyId_name_key" ON "public"."AutomationRule"("companyId", "name");

-- CreateIndex
CREATE INDEX "AutomationExecution_ruleId_triggeredAt_idx" ON "public"."AutomationExecution"("ruleId", "triggeredAt");

-- CreateIndex
CREATE INDEX "AutomationExecution_companyId_status_idx" ON "public"."AutomationExecution"("companyId", "status");

-- CreateIndex
CREATE INDEX "EventRuleOverride_companyId_eventCategoryId_idx" ON "public"."EventRuleOverride"("companyId", "eventCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRuleOverride_companyId_eventCategoryId_departmentId_te_key" ON "public"."EventRuleOverride"("companyId", "eventCategoryId", "departmentId", "teamId");

-- CreateIndex
CREATE INDEX "GlobalAuditLog_companyId_timestamp_idx" ON "public"."GlobalAuditLog"("companyId", "timestamp");

-- CreateIndex
CREATE INDEX "GlobalAuditLog_companyId_entityType_entityId_idx" ON "public"."GlobalAuditLog"("companyId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "GlobalAuditLog_companyId_actorId_idx" ON "public"."GlobalAuditLog"("companyId", "actorId");

-- CreateIndex
CREATE INDEX "NotificationChannel_companyId_type_isActive_idx" ON "public"."NotificationChannel"("companyId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationChannel_companyId_name_key" ON "public"."NotificationChannel"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_companyId_key" ON "public"."NotificationSettings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SSOConfiguration_companyId_key" ON "public"."SSOConfiguration"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SCIMConfiguration_companyId_key" ON "public"."SCIMConfiguration"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandingConfiguration_companyId_key" ON "public"."BrandingConfiguration"("companyId");

-- AddForeignKey
ALTER TABLE "public"."AutomationRule" ADD CONSTRAINT "AutomationRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationRule" ADD CONSTRAINT "AutomationRule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationExecution" ADD CONSTRAINT "AutomationExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationExecution" ADD CONSTRAINT "AutomationExecution_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventRuleOverride" ADD CONSTRAINT "EventRuleOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventRuleOverride" ADD CONSTRAINT "EventRuleOverride_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "public"."EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventRuleOverride" ADD CONSTRAINT "EventRuleOverride_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GlobalAuditLog" ADD CONSTRAINT "GlobalAuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GlobalAuditLog" ADD CONSTRAINT "GlobalAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationChannel" ADD CONSTRAINT "NotificationChannel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationSettings" ADD CONSTRAINT "NotificationSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SSOConfiguration" ADD CONSTRAINT "SSOConfiguration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SCIMConfiguration" ADD CONSTRAINT "SCIMConfiguration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandingConfiguration" ADD CONSTRAINT "BrandingConfiguration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
