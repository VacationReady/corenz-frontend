/*
  Warnings:

  - You are about to drop the column `courseName` on the `TrainingRecord` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `TrainingRecord` table. All the data in the column will be lost.
  - Added the required column `courseId` to the `TrainingRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerId` to the `TrainingRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TrainingRecord" DROP COLUMN "courseName",
DROP COLUMN "provider",
ADD COLUMN     "courseId" TEXT NOT NULL,
ADD COLUMN     "providerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TrainingProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_name_key" ON "Course"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProvider_name_key" ON "TrainingProvider"("name");

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TrainingProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
