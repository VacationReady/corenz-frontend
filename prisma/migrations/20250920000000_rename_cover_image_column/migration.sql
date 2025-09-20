DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'NewsPost'
      AND column_name = 'coverImage'
  ) THEN
    EXECUTE 'ALTER TABLE "NewsPost" RENAME COLUMN "coverImage" TO "coverImageUrl"';
  END IF;
END
$$;

ALTER TABLE "NewsPost" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
