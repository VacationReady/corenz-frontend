/*
  Warnings:

  - You are about to drop the column `carryoverExpiry` on the `EventRule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventRule" DROP COLUMN "carryoverExpiry",
ADD COLUMN     "carryoverExpiryMonths" INTEGER;
