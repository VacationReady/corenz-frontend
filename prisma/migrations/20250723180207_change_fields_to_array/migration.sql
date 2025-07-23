/*
  Warnings:

  - The `fields` column on the `SavedReport` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "SavedReport" DROP COLUMN "fields",
ADD COLUMN     "fields" TEXT[];
