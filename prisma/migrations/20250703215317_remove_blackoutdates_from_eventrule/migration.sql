/*
  Warnings:

  - You are about to drop the column `blackoutDates` on the `EventRule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventRule" DROP COLUMN "blackoutDates";

-- CreateTable
CREATE TABLE "BlackoutDay" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "allEvents" BOOLEAN NOT NULL DEFAULT false,
    "eventCategoryIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlackoutDay_pkey" PRIMARY KEY ("id")
);
