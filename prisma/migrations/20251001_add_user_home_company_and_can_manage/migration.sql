-- Add homeCompanyId and canManageTenants to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "homeCompanyId" TEXT,
  ADD COLUMN IF NOT EXISTS "canManageTenants" BOOLEAN DEFAULT false;


