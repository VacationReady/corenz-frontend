/*
  Warnings:

  - You are about to drop the column `type` on the `EventCategory` table. All the data in the column will be lost.
  - Added the required column `categoryType` to the `EventCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "EventCategory_name_key";

-- AlterTable
ALTER TABLE "EventCategory" DROP COLUMN "type",
ADD COLUMN     "categoryType" TEXT NOT NULL,
ADD COLUMN     "color" TEXT,
ALTER COLUMN "requiresApproval" DROP DEFAULT,
ALTER COLUMN "adminOnly" DROP DEFAULT;
