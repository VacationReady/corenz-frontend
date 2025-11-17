-- AlterTable
ALTER TABLE "SavedReport" ADD COLUMN "sorts" JSONB;

-- Add comment for documentation
COMMENT ON COLUMN "SavedReport"."sorts" IS 'Array of SortConfig objects for multi-sort support. Each object has {field: string, direction: "asc"|"desc"}. The sort field is kept for backwards compatibility and represents the primary sort.';
