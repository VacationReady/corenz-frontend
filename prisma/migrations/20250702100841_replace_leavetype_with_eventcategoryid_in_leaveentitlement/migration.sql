/*
  Warnings:

  - You are about to drop the column `leaveType` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeId,eventCategoryId]` on the table `LeaveEntitlement` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventCategoryId` to the `LeaveEntitlement` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "LeaveEntitlement_employeeId_leaveType_key";

-- AlterTable
ALTER TABLE "LeaveEntitlement" DROP COLUMN "leaveType",
ADD COLUMN     "eventCategoryId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LeaveEntitlement_employeeId_eventCategoryId_key" ON "LeaveEntitlement"("employeeId", "eventCategoryId");

-- AddForeignKey
ALTER TABLE "LeaveEntitlement" ADD CONSTRAINT "LeaveEntitlement_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
