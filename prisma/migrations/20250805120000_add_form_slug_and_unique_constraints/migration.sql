-- Add slug column with temporary default value
ALTER TABLE "public"."Form" ADD COLUMN "slug" TEXT;

-- Update existing forms with slug based on name (convert to lowercase, replace spaces with hyphens)
UPDATE "public"."Form"
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
WHERE "slug" IS NULL;

-- Handle potential slug duplicates by appending numbers
WITH numbered_forms AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY "companyId", slug ORDER BY "createdAt") as rn
  FROM "public"."Form"
)
UPDATE "public"."Form"
SET "slug" = CASE
  WHEN numbered_forms.rn = 1 THEN numbered_forms.slug
  ELSE numbered_forms.slug || '-' || numbered_forms.rn
END
FROM numbered_forms
WHERE "public"."Form".id = numbered_forms.id;

-- Handle potential name duplicates by appending numbers
WITH numbered_names AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY "companyId", name ORDER BY "createdAt") as rn
  FROM "public"."Form"
)
UPDATE "public"."Form"
SET "name" = CASE
  WHEN numbered_names.rn = 1 THEN numbered_names.name
  ELSE numbered_names.name || ' (' || numbered_names.rn || ')'
END
FROM numbered_names
WHERE "public"."Form".id = numbered_names.id AND numbered_names.rn > 1;

-- Make slug column required
ALTER TABLE "public"."Form" ALTER COLUMN "slug" SET NOT NULL;

-- Create unique constraints
CREATE UNIQUE INDEX "Form_companyId_slug_key" ON "public"."Form"("companyId", "slug");
CREATE UNIQUE INDEX "Form_companyId_name_key" ON "public"."Form"("companyId", "name");
