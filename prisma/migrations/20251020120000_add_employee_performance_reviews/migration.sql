-- CreateTable
CREATE TABLE "EmployeePerformanceReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "rating" INTEGER,
    "summary" TEXT,
    "strengths" TEXT,
    "areasForImprovement" TEXT,
    "goals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeePerformanceReview_employeeId_reviewDate_idx" ON "EmployeePerformanceReview"("employeeId", "reviewDate");

-- CreateIndex
CREATE INDEX "EmployeePerformanceReview_companyId_idx" ON "EmployeePerformanceReview"("companyId");

-- AddForeignKey
ALTER TABLE "EmployeePerformanceReview" ADD CONSTRAINT "EmployeePerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePerformanceReview" ADD CONSTRAINT "EmployeePerformanceReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePerformanceReview" ADD CONSTRAINT "EmployeePerformanceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
