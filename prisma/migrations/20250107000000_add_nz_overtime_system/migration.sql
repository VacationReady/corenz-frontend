-- AlterTable: Add hours tracking to WorkingPatternDay
ALTER TABLE "WorkingPatternDay" ADD COLUMN "hoursPerDay" DECIMAL(4,2);
ALTER TABLE "WorkingPatternDay" ADD COLUMN "startTime" TEXT;
ALTER TABLE "WorkingPatternDay" ADD COLUMN "endTime" TEXT;

-- AlterTable: Add total hours to WorkingPatternWeek
ALTER TABLE "WorkingPatternWeek" ADD COLUMN "totalHours" DECIMAL(5,2) NOT NULL DEFAULT 0.00;

-- AlterTable: Add overtime configuration to Employee
ALTER TABLE "Employee" ADD COLUMN "overtimeEligible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN "overtimeThreshold" DECIMAL(5,2);
ALTER TABLE "Employee" ADD COLUMN "overtimeMultiplier" DECIMAL(3,2);
ALTER TABLE "Employee" ADD COLUMN "overtimeCalculationMode" TEXT;
ALTER TABLE "Employee" ADD COLUMN "maxOvertimeHoursPerWeek" DECIMAL(4,2);

-- AlterTable: Add enhanced overtime tracking to TimesheetEntry
ALTER TABLE "TimesheetEntry" ADD COLUMN "overtimeType" TEXT;
ALTER TABLE "TimesheetEntry" ADD COLUMN "overtimeHours" DECIMAL(5,2);
ALTER TABLE "TimesheetEntry" ADD COLUMN "regularHours" DECIMAL(5,2);
ALTER TABLE "TimesheetEntry" ADD COLUMN "overtimeMultiplier" DECIMAL(3,2);
ALTER TABLE "TimesheetEntry" ADD COLUMN "overtimeReason" TEXT;
ALTER TABLE "TimesheetEntry" ADD COLUMN "managerAdjusted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TimesheetEntry" ADD COLUMN "managerAdjustedBy" TEXT;
ALTER TABLE "TimesheetEntry" ADD COLUMN "managerAdjustedAt" TIMESTAMP(3);
ALTER TABLE "TimesheetEntry" ADD COLUMN "managerAdjustmentNote" TEXT;

-- CreateIndex: Add indexes for overtime queries
CREATE INDEX "TimesheetEntry_date_isOvertime_idx" ON "TimesheetEntry"("date", "isOvertime");

-- AlterTable: Add enhanced overtime configuration to TimeTrackingSettings
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "overtimeCalculationMode" TEXT NOT NULL DEFAULT 'WEEKLY';
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "autoApplyOvertime" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "allowManualOvertimeEntry" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "blockOvertimeDuringHours" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "requireOvertimeApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "dailyOvertimeThreshold" DECIMAL(4,2);
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "weeklyOvertimeThreshold" DECIMAL(5,2);
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "monthlyOvertimeThreshold" DECIMAL(6,2);
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "overtimeMultiplierTier2" DECIMAL(3,2);
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "overtimeThresholdTier2" DECIMAL(5,2);
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "publicHolidayMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.50;
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "sundayMultiplier" DECIMAL(3,2);
ALTER TABLE "TimeTrackingSettings" ADD COLUMN "enableOvertimeBreakdown" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: OvertimeAuditLog for compliance tracking
CREATE TABLE "OvertimeAuditLog" (
    "id" TEXT NOT NULL,
    "timesheetEntryId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousValues" JSONB,
    "newValues" JSONB NOT NULL,
    "calculationMethod" TEXT,
    "triggeredBy" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "OvertimeAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Indexes for OvertimeAuditLog
CREATE INDEX "OvertimeAuditLog_timesheetEntryId_idx" ON "OvertimeAuditLog"("timesheetEntryId");
CREATE INDEX "OvertimeAuditLog_employeeId_triggeredAt_idx" ON "OvertimeAuditLog"("employeeId", "triggeredAt");
CREATE INDEX "OvertimeAuditLog_companyId_triggeredAt_idx" ON "OvertimeAuditLog"("companyId", "triggeredAt");
CREATE INDEX "OvertimeAuditLog_action_idx" ON "OvertimeAuditLog"("action");

-- AddForeignKey: OvertimeAuditLog relations
ALTER TABLE "OvertimeAuditLog" ADD CONSTRAINT "OvertimeAuditLog_timesheetEntryId_fkey" FOREIGN KEY ("timesheetEntryId") REFERENCES "TimesheetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OvertimeAuditLog" ADD CONSTRAINT "OvertimeAuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OvertimeAuditLog" ADD CONSTRAINT "OvertimeAuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
