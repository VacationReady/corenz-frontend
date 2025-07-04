-- AlterTable
ALTER TABLE "EventRule" ADD COLUMN     "carryoverExpiry" TIMESTAMP(3),
ADD COLUMN     "maxCarryoverDays" INTEGER;
