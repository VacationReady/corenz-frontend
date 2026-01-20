-- Add performance indexes for leave request queries
-- These optimize the department colleagues query and approval status lookups

-- Index for finding overlapping leave requests in same department
CREATE INDEX "LeaveRequest_companyId_departmentId_startDate_endDate_status_idx" 
ON "LeaveRequest"("companyId", "employeeId", "startDate", "endDate", "approvalStatus");

-- Index for approval status filtering
CREATE INDEX "LeaveRequest_approvalStatus_startDate_idx" 
ON "LeaveRequest"("approvalStatus", "startDate");

-- Index for employee leave queries
CREATE INDEX "LeaveRequest_employeeId_startDate_idx" 
ON "LeaveRequest"("employeeId", "startDate");

-- Index for company-wide leave queries
CREATE INDEX "LeaveRequest_companyId_approvalStatus_idx" 
ON "LeaveRequest"("companyId", "approvalStatus");
