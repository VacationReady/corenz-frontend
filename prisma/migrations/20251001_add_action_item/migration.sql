-- Create ActionItem table for workflow tasks and dashboard items
CREATE TABLE IF NOT EXISTS "ActionItem" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "priority" TEXT,
  "dueDate" TIMESTAMP,
  "assignedToId" TEXT,
  "relatedEmployeeId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  CONSTRAINT "ActionItem_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id"),
  CONSTRAINT "ActionItem_assignedTo_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id"),
  CONSTRAINT "ActionItem_relatedEmployee_fkey" FOREIGN KEY ("relatedEmployeeId") REFERENCES "Employee"("id")
);

CREATE INDEX IF NOT EXISTS "ActionItem_company_status_idx" ON "ActionItem"("companyId", "status");
CREATE INDEX IF NOT EXISTS "ActionItem_assignee_status_idx" ON "ActionItem"("assignedToId", "status");


