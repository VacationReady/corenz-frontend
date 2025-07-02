/*
  Warnings:

  - You are about to drop the column `description` on the `WorkingPattern` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "WorkingPattern_name_key";

-- AlterTable
ALTER TABLE "WorkingPattern" DROP COLUMN "description";
