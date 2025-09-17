-- CreateTable
CREATE TABLE "public"."TransactionalNotificationPreference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "notifyAdmin" BOOLEAN NOT NULL DEFAULT true,
    "notifyManager" BOOLEAN NOT NULL DEFAULT false,
    "notifyEmployee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionalNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionalNotificationPreference_companyId_section_idx" ON "public"."TransactionalNotificationPreference"("companyId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionalNotificationPreference_companyId_section_key" ON "public"."TransactionalNotificationPreference"("companyId", "section");

-- AddForeignKey
ALTER TABLE "public"."TransactionalNotificationPreference" ADD CONSTRAINT "TransactionalNotificationPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
