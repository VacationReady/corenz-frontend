-- CreateEnum
CREATE TYPE "public"."AutomationJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."AutomationJob" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "triggerData" JSONB NOT NULL,
    "status" "public"."AutomationJobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "executionLog" JSONB,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationJob_companyId_status_scheduledAt_idx" ON "public"."AutomationJob"("companyId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AutomationJob_status_scheduledAt_idx" ON "public"."AutomationJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AutomationJob_ruleId_idx" ON "public"."AutomationJob"("ruleId");

-- AddForeignKey
ALTER TABLE "public"."AutomationJob" ADD CONSTRAINT "AutomationJob_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AutomationJob" ADD CONSTRAINT "AutomationJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
