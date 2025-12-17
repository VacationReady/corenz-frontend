-- AlterTable: Add first-class sick leave fields to LeaveRequest
-- leaveType: "SICK" for sick leave, NULL for category-based leave
-- sickReason: Text field for sick leave reason (moved from subcategory reference)

ALTER TABLE "LeaveRequest" ADD COLUMN "leaveType" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN "sickReason" TEXT;

-- Backfill leaveType for existing sick leave requests based on category name
-- This ensures backward compatibility with existing data
UPDATE "LeaveRequest" lr
SET "leaveType" = 'SICK'
FROM "EventCategory" ec
WHERE lr."eventCategoryId" = ec.id
  AND LOWER(ec.name) LIKE '%sick%';
