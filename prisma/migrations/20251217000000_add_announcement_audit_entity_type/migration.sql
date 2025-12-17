-- Add ANNOUNCEMENT entity type to AuditEntityType enum
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT';
