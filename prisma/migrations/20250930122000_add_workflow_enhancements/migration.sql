-- Enhance AutomationRule model
ALTER TABLE "AutomationRule"
ADD COLUMN IF NOT EXISTS "templateId" TEXT,
ADD COLUMN IF NOT EXISTS "workflowDefinition" JSONB,
ADD COLUMN IF NOT EXISTS "lastExecutedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "executionCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "successCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "failureCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "averageExecutionTime" INTEGER,
ADD COLUMN IF NOT EXISTS "createdBy" TEXT REFERENCES "User"("id"),
ADD COLUMN IF NOT EXISTS "tags" TEXT[],
ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "isTemplate" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "category" TEXT;

-- Add new automation trigger types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationTriggerType') THEN
    CREATE TYPE "AutomationTriggerType" AS ENUM (
      'DOCUMENT_EXPIRING',
      'FORM_SUBMITTED',
      'ONBOARDING_STEP_COMPLETED',
      'EMPLOYEE_CREATED',
      'SCHEDULED',
      'WEBHOOK',
      'LEAVE_REQUEST',
      'CONTRACT_EXPIRING',
      'PERFORMANCE_REVIEW_COMPLETED',
      'EMPLOYEE_UPDATED',
      'EMPLOYEE_START_DATE',
      'LEAVE_ENDING',
      'MANUAL',
      'API_TRIGGERED'
    );
  ELSE
    -- Add new values if they don't exist
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'SCHEDULED';
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'WEBHOOK';
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'LEAVE_REQUEST';
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'CONTRACT_EXPIRING';
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW_COMPLETED';
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'EMPLOYEE_UPDATED';
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'EMPLOYEE_START_DATE';
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'LEAVE_ENDING';
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'MANUAL';
    ALTER TYPE "AutomationTriggerType" ADD VALUE IF NOT EXISTS 'API_TRIGGERED';
  END IF;
END $$;

-- Create WorkflowTemplate table
CREATE TABLE IF NOT EXISTS "WorkflowTemplate" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "icon" TEXT,
  "definition" JSONB NOT NULL,
  "isPublic" BOOLEAN DEFAULT false,
  "isDefault" BOOLEAN DEFAULT false,
  "usageCount" INTEGER DEFAULT 0,
  "createdBy" TEXT REFERENCES "User"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "WorkflowTemplate_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "AutomationRule_templateId_idx" ON "AutomationRule"("templateId");
CREATE INDEX IF NOT EXISTS "AutomationRule_category_idx" ON "AutomationRule"("category");
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_category_idx" ON "WorkflowTemplate"("category");
CREATE INDEX IF NOT EXISTS "WorkflowTemplate_isDefault_idx" ON "WorkflowTemplate"("isDefault");


