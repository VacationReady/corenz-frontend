-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "requireAckFromNewStarters" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
