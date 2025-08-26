CREATE TABLE "ExitInterview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "offboardingId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "interviewerId" TEXT,
  "location" TEXT,
  "notes" TEXT,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExitInterview_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "EmployeeOffboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ExitInterview_offboardingId_key" ON "ExitInterview"("offboardingId");
CREATE INDEX "ExitInterview_offboardingId_idx" ON "ExitInterview"("offboardingId");
