-- AlterTable: Add otherEntitlementId to LeaveRequest for tracking custom entitlement bookings
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "otherEntitlementId" TEXT;

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "LeaveRequest_otherEntitlementId_idx" ON "LeaveRequest"("otherEntitlementId");

-- AddForeignKey (drop first if exists to avoid conflicts)
ALTER TABLE "LeaveRequest" DROP CONSTRAINT IF EXISTS "LeaveRequest_otherEntitlementId_fkey";
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_otherEntitlementId_fkey" FOREIGN KEY ("otherEntitlementId") REFERENCES "EmployeeOtherEntitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
