-- AlterTable
ALTER TABLE "EmployeeOffboarding" ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);

-- Add index for efficient token expiry queries
CREATE INDEX "EmployeeOffboarding_tokenExpiresAt_idx" ON "EmployeeOffboarding"("tokenExpiresAt");
