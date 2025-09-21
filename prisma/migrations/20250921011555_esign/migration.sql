/*
  Warnings:

  - A unique constraint covering the columns `[companyId,code]` on the table `Department` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."SignatureMethod" AS ENUM ('DRAWN', 'TYPED');

-- CreateEnum
CREATE TYPE "public"."ApprovalScopeType" AS ENUM ('COMPANY', 'DEPARTMENT', 'JOB_ROLE', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "public"."ApprovalStageMode" AS ENUM ('SEQUENTIAL', 'FIRST_RESPONDER', 'UNANIMOUS');

-- DropIndex
DROP INDEX "public"."Department_code_key";

-- DropIndex
DROP INDEX "public"."NewsPost_companyId_idx";

-- AlterTable
ALTER TABLE "public"."Course" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signatureDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."ExitInterviewFormTemplate" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "public"."ExpiryRule" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "public"."Location" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "public"."TrainingProvider" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "public"."DocumentSignatureArtifact" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "method" "public"."SignatureMethod" NOT NULL,
    "typedText" TEXT,
    "artifactPath" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "DocumentSignatureArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentSignatureDepartment" (
    "documentId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "DocumentSignatureDepartment_pkey" PRIMARY KEY ("documentId","departmentId")
);

-- CreateTable
CREATE TABLE "public"."DocumentSignatureJobRole" (
    "documentId" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,

    CONSTRAINT "DocumentSignatureJobRole_pkey" PRIMARY KEY ("documentId","jobRoleId")
);

-- CreateTable
CREATE TABLE "public"."DocumentSignatureEmployee" (
    "documentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),

    CONSTRAINT "DocumentSignatureEmployee_pkey" PRIMARY KEY ("documentId","employeeId")
);

-- CreateTable
CREATE TABLE "public"."DocumentSignatureField" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "assignedEmployeeId" TEXT,
    "assignedDepartmentId" TEXT,
    "assignedJobRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSignatureField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventCategoryId" TEXT NOT NULL,
    "scopeType" "public"."ApprovalScopeType" NOT NULL,
    "departmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jobRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "employeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalWorkflowStage" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT,
    "order" INTEGER NOT NULL,
    "mode" "public"."ApprovalStageMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalWorkflowStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalWorkflowStageApprover" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ApprovalWorkflowStageApprover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeaveApprovalStage" (
    "id" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "workflowStageId" TEXT,
    "name" TEXT,
    "order" INTEGER NOT NULL,
    "mode" "public"."ApprovalStageMode" NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveApprovalStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeaveApprovalDecision" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSignatureArtifact_documentId_employeeId_key" ON "public"."DocumentSignatureArtifact"("documentId", "employeeId");

-- CreateIndex
CREATE INDEX "DocumentSignatureField_documentId_idx" ON "public"."DocumentSignatureField"("documentId");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_companyId_eventCategoryId_idx" ON "public"."ApprovalWorkflow"("companyId", "eventCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflow_companyId_name_key" ON "public"."ApprovalWorkflow"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflowStage_workflowId_order_key" ON "public"."ApprovalWorkflowStage"("workflowId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflowStageApprover_stageId_order_key" ON "public"."ApprovalWorkflowStageApprover"("stageId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflowStageApprover_stageId_userId_key" ON "public"."ApprovalWorkflowStageApprover"("stageId", "userId");

-- CreateIndex
CREATE INDEX "LeaveApprovalStage_leaveRequestId_order_idx" ON "public"."LeaveApprovalStage"("leaveRequestId", "order");

-- CreateIndex
CREATE INDEX "LeaveApprovalDecision_approverId_status_isActive_idx" ON "public"."LeaveApprovalDecision"("approverId", "status", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveApprovalDecision_stageId_approverId_key" ON "public"."LeaveApprovalDecision"("stageId", "approverId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveApprovalDecision_stageId_order_key" ON "public"."LeaveApprovalDecision"("stageId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Department_companyId_code_key" ON "public"."Department"("companyId", "code");

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureArtifact" ADD CONSTRAINT "DocumentSignatureArtifact_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureArtifact" ADD CONSTRAINT "DocumentSignatureArtifact_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureDepartment" ADD CONSTRAINT "DocumentSignatureDepartment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureDepartment" ADD CONSTRAINT "DocumentSignatureDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureJobRole" ADD CONSTRAINT "DocumentSignatureJobRole_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureJobRole" ADD CONSTRAINT "DocumentSignatureJobRole_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "public"."JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureEmployee" ADD CONSTRAINT "DocumentSignatureEmployee_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureEmployee" ADD CONSTRAINT "DocumentSignatureEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureField" ADD CONSTRAINT "DocumentSignatureField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureField" ADD CONSTRAINT "DocumentSignatureField_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureField" ADD CONSTRAINT "DocumentSignatureField_assignedDepartmentId_fkey" FOREIGN KEY ("assignedDepartmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSignatureField" ADD CONSTRAINT "DocumentSignatureField_assignedJobRoleId_fkey" FOREIGN KEY ("assignedJobRoleId") REFERENCES "public"."JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExitInterviewFormTemplate" ADD CONSTRAINT "ExitInterviewFormTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpiryRule" ADD CONSTRAINT "ExpiryRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrainingProvider" ADD CONSTRAINT "TrainingProvider_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "public"."EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalWorkflowStage" ADD CONSTRAINT "ApprovalWorkflowStage_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalWorkflowStageApprover" ADD CONSTRAINT "ApprovalWorkflowStageApprover_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."ApprovalWorkflowStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalWorkflowStageApprover" ADD CONSTRAINT "ApprovalWorkflowStageApprover_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveApprovalStage" ADD CONSTRAINT "LeaveApprovalStage_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "public"."LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveApprovalDecision" ADD CONSTRAINT "LeaveApprovalDecision_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."LeaveApprovalStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveApprovalDecision" ADD CONSTRAINT "LeaveApprovalDecision_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
