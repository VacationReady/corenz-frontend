-- CreateTable
CREATE TABLE "EmployeeWorkingPatternAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workingPatternId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeWorkingPatternAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeWorkingPatternAssignment_employeeId_effectiveDate_idx" ON "EmployeeWorkingPatternAssignment"("employeeId", "effectiveDate");

-- AddForeignKey
ALTER TABLE "EmployeeWorkingPatternAssignment" ADD CONSTRAINT "EmployeeWorkingPatternAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeWorkingPatternAssignment" ADD CONSTRAINT "EmployeeWorkingPatternAssignment_workingPatternId_fkey" FOREIGN KEY ("workingPatternId") REFERENCES "WorkingPattern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
