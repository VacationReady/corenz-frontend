-- CreateIndex
CREATE INDEX "Employee_companyId_isActive_idx" ON "Employee"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "Employee_companyId_departmentId_idx" ON "Employee"("companyId", "departmentId");

-- CreateIndex
CREATE INDEX "Employee_companyId_jobRoleId_idx" ON "Employee"("companyId", "jobRoleId");

-- CreateIndex
CREATE INDEX "Employee_companyId_userId_idx" ON "Employee"("companyId", "userId");
