-- Add companyId to NewsPost and backfill from User.companyId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'NewsPost'
      AND column_name = 'companyId'
  ) THEN
    ALTER TABLE "public"."NewsPost" ADD COLUMN "companyId" TEXT;
  END IF;
END
$$;

-- Backfill companyId using the author's companyId
UPDATE "public"."NewsPost" np
SET "companyId" = u."companyId"
FROM "public"."User" u
WHERE u."id" = np."authorId" AND np."companyId" IS NULL;

-- Add FK constraint if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'NewsPost'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'NewsPost_companyId_fkey'
  ) THEN
    ALTER TABLE "public"."NewsPost"
      ADD CONSTRAINT "NewsPost_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Helpful index for tenant scoping
CREATE INDEX IF NOT EXISTS "NewsPost_companyId_idx" ON "public"."NewsPost"("companyId");


