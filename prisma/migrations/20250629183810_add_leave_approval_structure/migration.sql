/*
  Warnings:

  - You are about to drop the column `annualDays` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - You are about to drop the column `bereavementDays` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - You are about to drop the column `resetDate` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - You are about to drop the column `sickDays` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `LeaveEntitlement` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedBy` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `LeaveRequest` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_reviewedBy_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_userId_fkey";

-- AlterTable
ALTER TABLE "LeaveEntitlement" DROP COLUMN "annualDays",
DROP COLUMN "bereavementDays",
DROP COLUMN "createdAt",
DROP COLUMN "resetDate",
DROP COLUMN "sickDays",
DROP COLUMN "startDate",
DROP COLUMN "updatedAt",
ADD COLUMN     "annual" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bereavement" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sick" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "reviewedBy",
DROP COLUMN "status",
DROP COLUMN "userId",
ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL;

-- DropEnum
DROP TYPE "LeaveStatus";

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
