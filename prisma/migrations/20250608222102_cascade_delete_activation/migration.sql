/*
  Warnings:

  - The primary key for the `ActivationToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ActivationToken` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ActivationToken" DROP CONSTRAINT "ActivationToken_employeeId_fkey";

-- DropIndex
DROP INDEX "ActivationToken_token_key";

-- AlterTable
ALTER TABLE "ActivationToken" DROP CONSTRAINT "ActivationToken_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ActivationToken_pkey" PRIMARY KEY ("token");

-- AddForeignKey
ALTER TABLE "ActivationToken" ADD CONSTRAINT "ActivationToken_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
