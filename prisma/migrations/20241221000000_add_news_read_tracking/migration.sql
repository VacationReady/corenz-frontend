-- CreateTable
CREATE TABLE "NewsRead" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsRead_companyId_postId_idx" ON "NewsRead"("companyId", "postId");

-- CreateIndex
CREATE INDEX "NewsRead_userId_idx" ON "NewsRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsRead_postId_userId_key" ON "NewsRead"("postId", "userId");

-- AddForeignKey
ALTER TABLE "NewsRead" ADD CONSTRAINT "NewsRead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsRead" ADD CONSTRAINT "NewsRead_postId_fkey" FOREIGN KEY ("postId") REFERENCES "NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsRead" ADD CONSTRAINT "NewsRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
