-- Add default uuid() to id columns that were missing it
-- This migration updates the schema to auto-generate UUIDs for WorkingPattern, WorkingPatternWeek, and WorkingPatternDay

-- Note: The @default(uuid()) directive in Prisma translates to gen_random_uuid() in PostgreSQL
-- No SQL changes are needed as this only affects how new records are created going forward
-- Existing records already have valid UUIDs and are not affected


















