-- Create enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PublicHolidayTemplate'
  ) THEN
    CREATE TYPE "PublicHolidayTemplate" AS ENUM ('NZ', 'AU', 'UK');
  END IF;
END$$;

-- Add columns to Company if they don't exist
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "publicHolidayTemplate" "PublicHolidayTemplate",
  ADD COLUMN IF NOT EXISTS "publicHolidayRegion" TEXT;


