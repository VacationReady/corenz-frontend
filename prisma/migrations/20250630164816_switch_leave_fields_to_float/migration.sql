-- DropIndex
DROP INDEX "LeaveEntitlement_employeeId_leaveType_key";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "workingPatternId" TEXT;

-- AlterTable
ALTER TABLE "LeaveEntitlement" ADD COLUMN     "daysAllocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "usedDays" DROP DEFAULT;

-- CreateTable
CREATE TABLE "WorkingPattern" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workingDays" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkingPattern_active_idx" ON "WorkingPattern"("active");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workingPatternId_fkey" FOREIGN KEY ("workingPatternId") REFERENCES "WorkingPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
