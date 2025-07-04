-- AlterTable
ALTER TABLE "LeaveEntitlement" ADD COLUMN     "carryoverDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "carryoverExpiry" TIMESTAMP(3);
