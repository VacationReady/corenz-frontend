-- CreateTable
CREATE TABLE "TenantFeatureToggle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantFeatureToggle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantFeatureToggle_companyId_idx" ON "TenantFeatureToggle"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantFeatureToggle_companyId_featureKey_key" ON "TenantFeatureToggle"("companyId", "featureKey");

-- AddForeignKey
ALTER TABLE "TenantFeatureToggle" ADD CONSTRAINT "TenantFeatureToggle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
