/*
  Warnings:

  - You are about to drop the column `workingDays` on the `WorkingPattern` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('FULL_DAY', 'HALF_DAY_AM', 'HALF_DAY_PM');

-- AlterTable
ALTER TABLE "WorkingPattern" DROP COLUMN "workingDays";

-- CreateTable
CREATE TABLE "WorkingPatternDay" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "type" "DayType" NOT NULL,
    "workingPatternId" TEXT NOT NULL,

    CONSTRAINT "WorkingPatternDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkingPatternDay_day_workingPatternId_key" ON "WorkingPatternDay"("day", "workingPatternId");

-- AddForeignKey
ALTER TABLE "WorkingPatternDay" ADD CONSTRAINT "WorkingPatternDay_workingPatternId_fkey" FOREIGN KEY ("workingPatternId") REFERENCES "WorkingPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;
