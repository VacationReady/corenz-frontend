-- Drop global unique slug index so slugs can be reused across tenants
DROP INDEX IF EXISTS "public"."NewsPost_slug_key";

-- Enforce uniqueness per tenant
CREATE UNIQUE INDEX IF NOT EXISTS "NewsPost_companyId_slug_key" ON "public"."NewsPost"("companyId", "slug");
