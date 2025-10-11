-- Add new employee-related entity types to AuditEntityType enum
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'EMPLOYEE';
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'EMERGENCY_CONTACT';
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'EMPLOYMENT_CHECK';
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'DRIVER_LICENSE';
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'TRAINING_RECORD';

-- Add GIN index for efficient employeeId filtering in GlobalAuditLog metadata
-- This supports queries that filter by metadata.employeeId using JSONB path operations
CREATE INDEX IF NOT EXISTS "GlobalAuditLog_metadata_employeeId_idx" 
ON "GlobalAuditLog" USING GIN ((metadata) jsonb_path_ops);
