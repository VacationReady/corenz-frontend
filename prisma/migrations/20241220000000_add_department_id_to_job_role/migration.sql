-- AlterTable
ALTER TABLE "JobRole" ADD COLUMN "departmentId" TEXT;

-- CreateIndex
CREATE INDEX "JobRole_departmentId_idx" ON "JobRole"("departmentId");

-- AddForeignKey
ALTER TABLE "JobRole" ADD CONSTRAINT "JobRole_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
