/*
  Warnings:

  - You are about to drop the column `annual` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - You are about to drop the column `bereavement` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - You are about to drop the column `sick` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeId,leaveType]` on the table `LeaveEntitlement` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `leaveType` to the `LeaveEntitlement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalDays` to the `LeaveEntitlement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LeaveEntitlement` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "LeaveEntitlement_employeeId_key";

-- AlterTable
ALTER TABLE "LeaveEntitlement" DROP COLUMN "annual",
DROP COLUMN "bereavement",
DROP COLUMN "sick",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "leaveType" "LeaveType" NOT NULL,
ADD COLUMN     "totalDays" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usedDays" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "LeaveEntitlement_employeeId_leaveType_key" ON "LeaveEntitlement"("employeeId", "leaveType");
