/*
  Warnings:

  - You are about to drop the column `employeeId` on the `ActivationToken` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedById` on the `LeaveRequest` table. All the data in the column will be lost.
  - Added the required column `userId` to the `ActivationToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ActivationToken" DROP CONSTRAINT "ActivationToken_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_reviewedById_fkey";

-- DropIndex
DROP INDEX "LeaveRequest_reviewedById_idx";

-- DropIndex
DROP INDEX "LeaveRequest_userId_idx";

-- AlterTable
ALTER TABLE "ActivationToken" DROP COLUMN "employeeId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedById",
ADD COLUMN     "reviewedBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managerId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationToken" ADD CONSTRAINT "ActivationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
