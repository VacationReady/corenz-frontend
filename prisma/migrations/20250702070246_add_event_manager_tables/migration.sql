/*
  Warnings:

  - You are about to drop the column `sickReason` on the `LeaveRequest` table. All the data in the column will be lost.
  - The `paidStatus` column on the `LeaveRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('TIME_OFF', 'WORKING_EVENT');

-- CreateEnum
CREATE TYPE "PaidStatus" AS ENUM ('PAID', 'UNPAID');

-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "sickReason",
ADD COLUMN     "sickReasonId" TEXT,
DROP COLUMN "paidStatus",
ADD COLUMN     "paidStatus" "PaidStatus";

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "adminOnly" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSubcategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventCategoryId" TEXT NOT NULL,
    "defaultPaidStatus" "PaidStatus" NOT NULL DEFAULT 'PAID',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_name_key" ON "EventCategory"("name");

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_sickReasonId_fkey" FOREIGN KEY ("sickReasonId") REFERENCES "EventSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSubcategory" ADD CONSTRAINT "EventSubcategory_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
