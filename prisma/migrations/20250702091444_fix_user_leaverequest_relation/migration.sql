/*
  Warnings:

  - You are about to drop the column `createdById` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `LeaveRequest` table. All the data in the column will be lost.
  - Added the required column `dayType` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventCategoryId` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requesterId` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_createdById_fkey";

-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "createdById",
DROP COLUMN "type",
ADD COLUMN     "dayType" "DayType" NOT NULL,
ADD COLUMN     "eventCategoryId" TEXT NOT NULL,
ADD COLUMN     "requesterId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
