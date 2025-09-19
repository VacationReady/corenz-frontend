-- AlterTable
ALTER TABLE "public"."NewsPost" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."NewsReaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsBookmark" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsReaction_companyId_postId_idx" ON "public"."NewsReaction"("companyId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsReaction_postId_userId_key" ON "public"."NewsReaction"("postId", "userId");

-- CreateIndex
CREATE INDEX "NewsBookmark_companyId_postId_idx" ON "public"."NewsBookmark"("companyId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsBookmark_postId_userId_key" ON "public"."NewsBookmark"("postId", "userId");

-- AddForeignKey
ALTER TABLE "public"."NewsReaction" ADD CONSTRAINT "NewsReaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsReaction" ADD CONSTRAINT "NewsReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsReaction" ADD CONSTRAINT "NewsReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsBookmark" ADD CONSTRAINT "NewsBookmark_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsBookmark" ADD CONSTRAINT "NewsBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."NewsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsBookmark" ADD CONSTRAINT "NewsBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

