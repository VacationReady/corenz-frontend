/*
  Warnings:

  - A unique constraint covering the columns `[employeeId,leaveType]` on the table `LeaveEntitlement` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "WorkingPattern_active_idx";

-- CreateIndex
CREATE UNIQUE INDEX "LeaveEntitlement_employeeId_leaveType_key" ON "LeaveEntitlement"("employeeId", "leaveType");
