-- CreateTable
CREATE TABLE "EventRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eventCategoryId" TEXT NOT NULL,
    "enforceEntitlement" BOOLEAN NOT NULL DEFAULT true,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "maxConcurrent" INTEGER,
    "blackoutDates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventRule_companyId_eventCategoryId_key" ON "EventRule"("companyId", "eventCategoryId");

-- AddForeignKey
ALTER TABLE "EventRule" ADD CONSTRAINT "EventRule_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
