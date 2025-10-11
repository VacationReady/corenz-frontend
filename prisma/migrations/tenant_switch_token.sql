-- CreateTable
CREATE TABLE "TenantSwitchToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TenantSwitchToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSwitchToken_token_key" ON "TenantSwitchToken"("token");

-- CreateIndex
CREATE INDEX "TenantSwitchToken_token_expiresAt_idx" ON "TenantSwitchToken"("token", "expiresAt");

-- CreateIndex
CREATE INDEX "TenantSwitchToken_companyId_idx" ON "TenantSwitchToken"("companyId");

-- AddForeignKey
ALTER TABLE "TenantSwitchToken" ADD CONSTRAINT "TenantSwitchToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSwitchToken" ADD CONSTRAINT "TenantSwitchToken_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
