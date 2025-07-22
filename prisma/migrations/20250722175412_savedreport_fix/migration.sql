/*
  Warnings:

  - The primary key for the `SavedReport` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdById` on the `SavedReport` table. All the data in the column will be lost.
  - The `id` column on the `SavedReport` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `category` to the `SavedReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `SavedReport` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SavedReport" DROP CONSTRAINT "SavedReport_companyId_fkey";

-- DropForeignKey
ALTER TABLE "SavedReport" DROP CONSTRAINT "SavedReport_createdById_fkey";

-- AlterTable
ALTER TABLE "SavedReport" DROP CONSTRAINT "SavedReport_pkey",
DROP COLUMN "createdById",
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "fields" SET DATA TYPE TEXT,
ALTER COLUMN "companyId" DROP NOT NULL,
ADD CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
