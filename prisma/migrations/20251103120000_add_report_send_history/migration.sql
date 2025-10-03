-- CreateTable
CREATE TABLE "ReportSendHistory" (
    "id" TEXT NOT NULL,
    "reportId" INTEGER NOT NULL,
    "reportName" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientType" TEXT NOT NULL,
    "departments" JSONB,
    "jobRoles" JSONB,
    "recipientCount" INTEGER NOT NULL,
    "recipientEmails" JSONB NOT NULL,
    "format" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "messageBody" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "ReportSendHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportSendHistory_reportId_idx" ON "ReportSendHistory"("reportId");

-- CreateIndex
CREATE INDEX "ReportSendHistory_companyId_sentAt_idx" ON "ReportSendHistory"("companyId", "sentAt");

-- CreateIndex
CREATE INDEX "ReportSendHistory_sentBy_idx" ON "ReportSendHistory"("sentBy");

-- AddForeignKey
ALTER TABLE "ReportSendHistory" ADD CONSTRAINT "ReportSendHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SavedReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSendHistory" ADD CONSTRAINT "ReportSendHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSendHistory" ADD CONSTRAINT "ReportSendHistory_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

