-- AlterTable: Add otherEntitlementId to LeaveRequest for tracking custom entitlement bookings
ALTER TABLE "LeaveRequest" ADD COLUMN "otherEntitlementId" TEXT;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_otherEntitlementId_fkey" FOREIGN KEY ("otherEntitlementId") REFERENCES "EmployeeOtherEntitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "LeaveRequest_otherEntitlementId_idx" ON "LeaveRequest"("otherEntitlementId");
