-- Ensure SavedReport.sorts column exists for multi-sort support
ALTER TABLE "public"."SavedReport"
ADD COLUMN IF NOT EXISTS "sorts" JSONB;

COMMENT ON COLUMN "public"."SavedReport"."sorts" IS 'Array of SortConfig objects for multi-sort support. Each object has {field: string, direction: "asc"|"desc"}. The sort field is kept for backwards compatibility and represents the primary sort.';
