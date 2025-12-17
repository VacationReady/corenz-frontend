-- NZ Sick Leave Ledger Migration
-- Implements anniversary-grant model per NZ Holidays Act 2003

-- CreateEnum
CREATE TYPE "LeaveBalanceLedgerType" AS ENUM ('SICK_LEAVE');

-- CreateEnum
CREATE TYPE "LeaveBalanceLedgerEvent" AS ENUM ('OPENING_BALANCE', 'GRANT', 'USAGE', 'CAP_CLAMP', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "LeaveBalanceLedger" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leaveType" "LeaveBalanceLedgerType" NOT NULL,
    "eventType" "LeaveBalanceLedgerEvent" NOT NULL,
    "deltaHours" DECIMAL(8,2) NOT NULL,
    "balanceAfter" DECIMAL(8,2) NOT NULL,
    "grantDate" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "sourceRef" TEXT,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveBalanceLedger_pkey" PRIMARY KEY ("id")
);

-- Add new fields to Employee table
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "sickLeaveEligibilityDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "sickLeaveLastGrantDate" TIMESTAMP(3);

-- Update default for sickLeaveBalance (new employees start at 0, not 80)
-- Note: This only affects new records; existing records retain their values
ALTER TABLE "Employee" ALTER COLUMN "sickLeaveBalance" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalanceLedger_idempotencyKey_key" ON "LeaveBalanceLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LeaveBalanceLedger_employeeId_leaveType_idx" ON "LeaveBalanceLedger"("employeeId", "leaveType");

-- CreateIndex
CREATE INDEX "LeaveBalanceLedger_employeeId_createdAt_idx" ON "LeaveBalanceLedger"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaveBalanceLedger_companyId_leaveType_createdAt_idx" ON "LeaveBalanceLedger"("companyId", "leaveType", "createdAt");

-- AddForeignKey
ALTER TABLE "LeaveBalanceLedger" ADD CONSTRAINT "LeaveBalanceLedger_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comment to sickLeaveBalance field for documentation
COMMENT ON COLUMN "Employee"."sickLeaveBalance" IS 'Sick leave balance in HOURS. This is a CACHE - source of truth is LeaveBalanceLedger. Updated exclusively via lib/leave/nz-sick-leave-ledger.ts helper functions.';
