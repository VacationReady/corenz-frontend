-- CreateTable
CREATE TABLE "ExpiryRule" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "notifyAdmin" BOOLEAN NOT NULL DEFAULT true,
    "notifyManager" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmployee" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpiryRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpiryRule_category_key" ON "ExpiryRule"("category");
