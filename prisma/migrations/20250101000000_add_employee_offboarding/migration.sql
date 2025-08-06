-- Add offboarding fields to Employee table
ALTER TABLE "Employee" ADD COLUMN "offboardingStatus" TEXT;
ALTER TABLE "Employee" ADD COLUMN "offboardingDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "lastWorkingDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "noticePeriodDays" INTEGER;
ALTER TABLE "Employee" ADD COLUMN "offboardingReason" TEXT;
ALTER TABLE "Employee" ADD COLUMN "offboardingNotes" TEXT;

-- Create EmployeeOffboarding table for detailed offboarding workflow
CREATE TABLE "EmployeeOffboarding" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    
    -- Key Dates
    "resignationDate" TIMESTAMP(3),
    "lastWorkingDate" TIMESTAMP(3) NOT NULL,
    "noticePeriodDays" INTEGER,
    "actualLeaveDate" TIMESTAMP(3),
    
    -- Reason & Classification
    "offboardingType" TEXT NOT NULL, -- RESIGNATION, TERMINATION, RETIREMENT, END_OF_CONTRACT, REDUNDANCY
    "offboardingReason" TEXT,
    "isVoluntary" BOOLEAN NOT NULL DEFAULT true,
    
    -- Access Management
    "removeAccessImmediately" BOOLEAN NOT NULL DEFAULT false,
    "accessRemovedAt" TIMESTAMP(3),
    "accessRemovedBy" TEXT,
    
    -- Asset Management
    "assetsToReturn" JSONB,
    "assetsReturned" BOOLEAN NOT NULL DEFAULT false,
    "assetsReturnedAt" TIMESTAMP(3),
    "assetsReturnedTo" TEXT,
    
    -- Knowledge Transfer
    "handoverRequired" BOOLEAN NOT NULL DEFAULT false,
    "handoverAssignedTo" TEXT,
    "handoverCompleted" BOOLEAN NOT NULL DEFAULT false,
    "handoverCompletedAt" TIMESTAMP(3),
    "handoverNotes" TEXT,
    
    -- Final Pay & Benefits
    "finalPayCalculated" BOOLEAN NOT NULL DEFAULT false,
    "finalPayAmount" DECIMAL(10,2),
    "unusedLeaveHours" DECIMAL(8,2),
    "unusedLeavePayment" DECIMAL(10,2),
    "benefitsEndDate" TIMESTAMP(3),
    
    -- Exit Process
    "exitInterviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "exitInterviewScheduled" BOOLEAN NOT NULL DEFAULT false,
    "exitInterviewCompletedAt" TIMESTAMP(3),
    "exitInterviewNotes" TEXT,
    
    -- Administrative
    "hrReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "hrReviewCompleted" BOOLEAN NOT NULL DEFAULT false,
    "hrReviewCompletedBy" TEXT,
    "hrReviewCompletedAt" TIMESTAMP(3),
    "hrNotes" TEXT,
    
    -- References & Documentation
    "referenceContactAllowed" BOOLEAN NOT NULL DEFAULT true,
    "documentationArchived" BOOLEAN NOT NULL DEFAULT false,
    "complianceCheckCompleted" BOOLEAN NOT NULL DEFAULT false,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeOffboarding_pkey" PRIMARY KEY ("id")
);

-- Create OffboardingTask table for checklist items
CREATE TABLE "OffboardingTask" (
    "id" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL, -- ACCESS, ASSETS, HANDOVER, PAYROLL, HR, COMPLIANCE
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingTask_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "EmployeeOffboarding" ADD CONSTRAINT "EmployeeOffboarding_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeOffboarding" ADD CONSTRAINT "EmployeeOffboarding_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeOffboarding" ADD CONSTRAINT "EmployeeOffboarding_accessRemovedBy_fkey" FOREIGN KEY ("accessRemovedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeOffboarding" ADD CONSTRAINT "EmployeeOffboarding_handoverAssignedTo_fkey" FOREIGN KEY ("handoverAssignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeOffboarding" ADD CONSTRAINT "EmployeeOffboarding_hrReviewCompletedBy_fkey" FOREIGN KEY ("hrReviewCompletedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OffboardingTask" ADD CONSTRAINT "OffboardingTask_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "EmployeeOffboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OffboardingTask" ADD CONSTRAINT "OffboardingTask_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OffboardingTask" ADD CONSTRAINT "OffboardingTask_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX "EmployeeOffboarding_employeeId_idx" ON "EmployeeOffboarding"("employeeId");
CREATE INDEX "EmployeeOffboarding_status_idx" ON "EmployeeOffboarding"("status");
CREATE INDEX "EmployeeOffboarding_lastWorkingDate_idx" ON "EmployeeOffboarding"("lastWorkingDate");
CREATE INDEX "OffboardingTask_offboardingId_idx" ON "OffboardingTask"("offboardingId");
CREATE INDEX "OffboardingTask_category_idx" ON "OffboardingTask"("category");
CREATE INDEX "OffboardingTask_assignedTo_idx" ON "OffboardingTask"("assignedTo");

-- Create enum types for better type safety
CREATE TYPE "OffboardingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OffboardingType" AS ENUM ('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'END_OF_CONTRACT', 'REDUNDANCY', 'OTHER');
CREATE TYPE "TaskCategory" AS ENUM ('ACCESS', 'ASSETS', 'HANDOVER', 'PAYROLL', 'HR', 'COMPLIANCE', 'OTHER');