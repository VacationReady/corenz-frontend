/*
  Warnings:

  - You are about to drop the column `departmentId` on the `Document` table. All the data in the column will be lost.
  - Made the column `active` on table `Department` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `Department` required. This step will fail if there are existing NULL values in that column.
  - Made the column `active` on table `JobRole` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `JobRole` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_departmentId_fkey";

-- AlterTable
ALTER TABLE "Department" ALTER COLUMN "active" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "departmentId";

-- AlterTable
ALTER TABLE "JobRole" ALTER COLUMN "active" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "_DocumentDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentDepartments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DocumentJobRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentJobRoles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DocumentDepartments_B_index" ON "_DocumentDepartments"("B");

-- CreateIndex
CREATE INDEX "_DocumentJobRoles_B_index" ON "_DocumentJobRoles"("B");

-- AddForeignKey
ALTER TABLE "_DocumentDepartments" ADD CONSTRAINT "_DocumentDepartments_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentDepartments" ADD CONSTRAINT "_DocumentDepartments_B_fkey" FOREIGN KEY ("B") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentJobRoles" ADD CONSTRAINT "_DocumentJobRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentJobRoles" ADD CONSTRAINT "_DocumentJobRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
