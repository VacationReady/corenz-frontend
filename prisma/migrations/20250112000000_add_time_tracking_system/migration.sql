-- CreateEnum
CREATE TYPE "ClockEntryStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TimesheetEntryType" AS ENUM ('CLOCK', 'MANUAL', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "ShiftAttendanceStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'PARTIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftSwapStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'MANAGER_PENDING', 'APPROVED', 'DECLINED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ConflictType" AS ENUM ('DOUBLE_BOOKING', 'REST_PERIOD', 'OVERTIME', 'UNAVAILABLE', 'SKILL_MISMATCH');

-- CreateEnum
CREATE TYPE "ConflictSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BreakType" AS ENUM ('MEAL_BREAK', 'REST_BREAK', 'UNPAID_BREAK');

-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('REST_PERIOD', 'MEAL_BREAK', 'REST_BREAK', 'MAX_HOURS', 'OVERTIME_EXCESSIVE', 'MISSING_TIMESHEET');

-- CreateTable
CREATE TABLE "ClockEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clockInTime" TIMESTAMP(3) NOT NULL,
    "clockOutTime" TIMESTAMP(3),
    "clockInLocation" JSONB,
    "clockOutLocation" JSONB,
    "clockInPhotoUrl" TEXT,
    "clockOutPhotoUrl" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" JSONB,
    "status" "ClockEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "timesheetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClockEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalHours" DECIMAL(10,2) NOT NULL,
    "regularHours" DECIMAL(10,2) NOT NULL,
    "overtimeHours" DECIMAL(10,2) NOT NULL,
    "breakHours" DECIMAL(10,2) NOT NULL,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "hours" DECIMAL(10,2) NOT NULL,
    "isOvertime" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "entryType" "TimesheetEntryType" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetApprovalStage" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "workflowStageId" TEXT,
    "name" TEXT,
    "order" INTEGER NOT NULL,
    "mode" "ApprovalStageMode" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetApprovalStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetApprovalDecision" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT,
    "templateId" TEXT,
    "departmentId" TEXT,
    "locationId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "role" TEXT,
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "attendanceStatus" "ShiftAttendanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSwapRequest" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetEmployeeId" TEXT,
    "status" "ShiftSwapStatus" NOT NULL DEFAULT 'PENDING',
    "requestMessage" TEXT,
    "responseMessage" TEXT,
    "managerApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "managerApprovedBy" TEXT,
    "managerApprovedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityPattern" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleConflict" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "conflictType" "ConflictType" NOT NULL,
    "description" TEXT NOT NULL,
    "shift1Id" TEXT,
    "shift2Id" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "severity" "ConflictSeverity" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "ScheduleConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollExport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "exportedBy" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "format" TEXT NOT NULL,
    "fileUrl" TEXT,
    "employeeCount" INTEGER NOT NULL,
    "totalHours" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2),
    "metadata" JSONB,

    CONSTRAINT "PayrollExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakRecord" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "breakType" "BreakType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreakRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceViolation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "violationType" "ViolationType" NOT NULL,
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolution" TEXT,
    "severity" "ViolationSeverity" NOT NULL DEFAULT 'MEDIUM',
    "metadata" JSONB,

    CONSTRAINT "ComplianceViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeTrackingSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requireGPS" BOOLEAN NOT NULL DEFAULT false,
    "requirePhoto" TEXT NOT NULL DEFAULT 'NO',
    "allowMobileClock" BOOLEAN NOT NULL DEFAULT true,
    "geofenceLocations" JSONB,
    "roundClockTimes" TEXT NOT NULL DEFAULT 'NONE',
    "autoClockOutHours" INTEGER,
    "timesheetPeriod" TEXT NOT NULL DEFAULT 'WEEKLY',
    "periodStartDay" TEXT NOT NULL DEFAULT 'MONDAY',
    "autoSubmit" BOOLEAN NOT NULL DEFAULT false,
    "defaultWorkflowId" TEXT,
    "allowEditAfterSubmit" BOOLEAN NOT NULL DEFAULT false,
    "autoSchedulingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publishDaysAdvance" INTEGER NOT NULL DEFAULT 7,
    "requireShiftConfirm" BOOLEAN NOT NULL DEFAULT false,
    "allowShiftSwaps" BOOLEAN NOT NULL DEFAULT true,
    "managerApprovalSwaps" BOOLEAN NOT NULL DEFAULT true,
    "minimumRestHours" INTEGER NOT NULL DEFAULT 11,
    "includeOvertimeExport" BOOLEAN NOT NULL DEFAULT true,
    "overtimeThreshold" DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    "overtimeMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.50,
    "exportFormat" TEXT NOT NULL DEFAULT 'CSV',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeTrackingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClockEntry_employeeId_clockInTime_idx" ON "ClockEntry"("employeeId", "clockInTime");

-- CreateIndex
CREATE INDEX "ClockEntry_companyId_status_idx" ON "ClockEntry"("companyId", "status");

-- CreateIndex
CREATE INDEX "ClockEntry_timesheetId_idx" ON "ClockEntry"("timesheetId");

-- CreateIndex
CREATE INDEX "Timesheet_employeeId_periodStart_idx" ON "Timesheet"("employeeId", "periodStart");

-- CreateIndex
CREATE INDEX "Timesheet_companyId_approvalStatus_idx" ON "Timesheet"("companyId", "approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Timesheet_employeeId_periodStart_periodEnd_key" ON "Timesheet"("employeeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "TimesheetEntry_timesheetId_date_idx" ON "TimesheetEntry"("timesheetId", "date");

-- CreateIndex
CREATE INDEX "TimesheetApprovalStage_timesheetId_order_idx" ON "TimesheetApprovalStage"("timesheetId", "order");

-- CreateIndex
CREATE INDEX "TimesheetApprovalDecision_approverId_status_isActive_idx" ON "TimesheetApprovalDecision"("approverId", "status", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetApprovalDecision_stageId_approverId_key" ON "TimesheetApprovalDecision"("stageId", "approverId");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetApprovalDecision_stageId_order_key" ON "TimesheetApprovalDecision"("stageId", "order");

-- CreateIndex
CREATE INDEX "ShiftTemplate_companyId_isActive_idx" ON "ShiftTemplate"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTemplate_companyId_name_key" ON "ShiftTemplate"("companyId", "name");

-- CreateIndex
CREATE INDEX "Shift_companyId_startTime_idx" ON "Shift"("companyId", "startTime");

-- CreateIndex
CREATE INDEX "Shift_employeeId_startTime_idx" ON "Shift"("employeeId", "startTime");

-- CreateIndex
CREATE INDEX "Shift_departmentId_startTime_idx" ON "Shift"("departmentId", "startTime");

-- CreateIndex
CREATE INDEX "Shift_isPublished_idx" ON "Shift"("isPublished");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_requesterId_status_idx" ON "ShiftSwapRequest"("requesterId", "status");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_targetEmployeeId_status_idx" ON "ShiftSwapRequest"("targetEmployeeId", "status");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_shiftId_idx" ON "ShiftSwapRequest"("shiftId");

-- CreateIndex
CREATE INDEX "AvailabilityPattern_employeeId_dayOfWeek_idx" ON "AvailabilityPattern"("employeeId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityPattern_employeeId_dayOfWeek_startTime_endTime_key" ON "AvailabilityPattern"("employeeId", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "AvailabilityException_employeeId_date_idx" ON "AvailabilityException"("employeeId", "date");

-- CreateIndex
CREATE INDEX "ScheduleConflict_companyId_resolvedAt_idx" ON "ScheduleConflict"("companyId", "resolvedAt");

-- CreateIndex
CREATE INDEX "ScheduleConflict_employeeId_resolvedAt_idx" ON "ScheduleConflict"("employeeId", "resolvedAt");

-- CreateIndex
CREATE INDEX "PayrollExport_companyId_exportedAt_idx" ON "PayrollExport"("companyId", "exportedAt");

-- CreateIndex
CREATE INDEX "BreakRecord_employeeId_startTime_idx" ON "BreakRecord"("employeeId", "startTime");

-- CreateIndex
CREATE INDEX "BreakRecord_companyId_breakType_idx" ON "BreakRecord"("companyId", "breakType");

-- CreateIndex
CREATE INDEX "ComplianceViolation_companyId_violationType_idx" ON "ComplianceViolation"("companyId", "violationType");

-- CreateIndex
CREATE INDEX "ComplianceViolation_employeeId_detectedAt_idx" ON "ComplianceViolation"("employeeId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimeTrackingSettings_companyId_key" ON "TimeTrackingSettings"("companyId");

-- CreateIndex
CREATE INDEX "TimeTrackingSettings_companyId_idx" ON "TimeTrackingSettings"("companyId");

-- AddForeignKey
ALTER TABLE "ClockEntry" ADD CONSTRAINT "ClockEntry_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetApprovalStage" ADD CONSTRAINT "TimesheetApprovalStage_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetApprovalDecision" ADD CONSTRAINT "TimesheetApprovalDecision_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TimesheetApprovalStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShiftTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakRecord" ADD CONSTRAINT "BreakRecord_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
