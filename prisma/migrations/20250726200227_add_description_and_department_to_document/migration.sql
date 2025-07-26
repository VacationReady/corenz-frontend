-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "description" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
