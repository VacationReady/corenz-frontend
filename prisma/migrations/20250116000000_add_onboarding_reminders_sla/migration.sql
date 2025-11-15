-- Add reminder and SLA configuration fields to OnboardingStep
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "reminderEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "reminderDaysBefore" INTEGER;
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "reminderTime" TEXT; -- Format: HH:MM in tenant timezone
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "reminderEscalationEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "reminderEscalationDays" INTEGER;
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "reminderEscalationRole" TEXT; -- 'manager' | 'hr_admin' | 'custom'
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "reminderEscalationUserId" TEXT;
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "slaEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "slaCompletionDays" INTEGER;
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "slaWarningDays" INTEGER;
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "excludePublicHolidays" BOOLEAN DEFAULT true;
ALTER TABLE "OnboardingStep" ADD COLUMN IF NOT EXISTS "excludeWeekends" BOOLEAN DEFAULT false;

-- Add audit log table for onboarding step changes
CREATE TABLE IF NOT EXISTS "OnboardingStepAuditLog" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "stepId" TEXT,
  "stepLabel" TEXT NOT NULL,
  "changeType" TEXT NOT NULL, -- 'label_change' | 'reminder_config' | 'sla_config' | 'metadata_change'
  "fieldName" TEXT,
  "oldValue" JSONB,
  "newValue" JSONB,
  "changedById" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  "ipAddress" TEXT,
  CONSTRAINT "OnboardingStepAuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE,
  CONSTRAINT "OnboardingStepAuditLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE CASCADE,
  CONSTRAINT "OnboardingStepAuditLog_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OnboardingStep"("id") ON DELETE SET NULL,
  CONSTRAINT "OnboardingStepAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "OnboardingStepAuditLog_companyId_changedAt_idx" ON "OnboardingStepAuditLog"("companyId", "changedAt" DESC);
CREATE INDEX IF NOT EXISTS "OnboardingStepAuditLog_templateId_stepLabel_idx" ON "OnboardingStepAuditLog"("templateId", "stepLabel");
CREATE INDEX IF NOT EXISTS "OnboardingStepAuditLog_changeType_idx" ON "OnboardingStepAuditLog"("changeType");

-- Add reminder queue table for scheduled reminders
CREATE TABLE IF NOT EXISTS "OnboardingReminder" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "onboardingInstanceId" TEXT NOT NULL,
  "stepInstanceId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "reminderType" TEXT NOT NULL, -- 'initial' | 'escalation'
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed' | 'cancelled'
  "recipientEmail" TEXT NOT NULL,
  "recipientName" TEXT,
  "escalatedTo" TEXT, -- User ID if escalated
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingReminder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE,
  CONSTRAINT "OnboardingReminder_onboardingInstanceId_fkey" FOREIGN KEY ("onboardingInstanceId") REFERENCES "OnboardingInstance"("id") ON DELETE CASCADE,
  CONSTRAINT "OnboardingReminder_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "OnboardingStepInstance"("id") ON DELETE CASCADE,
  CONSTRAINT "OnboardingReminder_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OnboardingStep"("id") ON DELETE CASCADE,
  CONSTRAINT "OnboardingReminder_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "OnboardingReminder_status_scheduledFor_idx" ON "OnboardingReminder"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "OnboardingReminder_companyId_employeeId_idx" ON "OnboardingReminder"("companyId", "employeeId");
CREATE INDEX IF NOT EXISTS "OnboardingReminder_onboardingInstanceId_idx" ON "OnboardingReminder"("onboardingInstanceId");
