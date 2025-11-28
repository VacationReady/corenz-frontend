-- Drop the old unique constraint on name only
DROP INDEX IF EXISTS "Location_name_key";

-- Create the new composite unique constraint on name + companyId
-- This allows different tenants to have locations with the same name
CREATE UNIQUE INDEX "Location_name_companyId_key" ON "Location"("name", "companyId");

