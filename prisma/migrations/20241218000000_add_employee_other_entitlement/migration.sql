-- CreateTable
CREATE TABLE "EmployeeOtherEntitlement" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" DECIMAL(8,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'days',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeOtherEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeOtherEntitlement_companyId_employeeId_idx" ON "EmployeeOtherEntitlement"("companyId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeOtherEntitlement_employeeId_name_key" ON "EmployeeOtherEntitlement"("employeeId", "name");

-- AddForeignKey
ALTER TABLE "EmployeeOtherEntitlement" ADD CONSTRAINT "EmployeeOtherEntitlement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOtherEntitlement" ADD CONSTRAINT "EmployeeOtherEntitlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
