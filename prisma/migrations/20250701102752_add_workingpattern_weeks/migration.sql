/*
  Warnings:

  - You are about to drop the column `workingPatternId` on the `WorkingPatternDay` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[day,workingPatternWeekId]` on the table `WorkingPatternDay` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workingPatternWeekId` to the `WorkingPatternDay` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "WorkingPatternDay" DROP CONSTRAINT "WorkingPatternDay_workingPatternId_fkey";

-- DropIndex
DROP INDEX "WorkingPatternDay_day_workingPatternId_key";

-- AlterTable
ALTER TABLE "WorkingPatternDay" DROP COLUMN "workingPatternId",
ADD COLUMN     "workingPatternWeekId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "WorkingPatternWeek" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "workingPatternId" TEXT NOT NULL,

    CONSTRAINT "WorkingPatternWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkingPatternWeek_weekNumber_workingPatternId_key" ON "WorkingPatternWeek"("weekNumber", "workingPatternId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingPatternDay_day_workingPatternWeekId_key" ON "WorkingPatternDay"("day", "workingPatternWeekId");

-- AddForeignKey
ALTER TABLE "WorkingPatternWeek" ADD CONSTRAINT "WorkingPatternWeek_workingPatternId_fkey" FOREIGN KEY ("workingPatternId") REFERENCES "WorkingPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingPatternDay" ADD CONSTRAINT "WorkingPatternDay_workingPatternWeekId_fkey" FOREIGN KEY ("workingPatternWeekId") REFERENCES "WorkingPatternWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
