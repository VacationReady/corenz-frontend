CREATE TYPE "OnboardingNotificationType" AS ENUM ('KICKOFF', 'STEP_UPDATE');

CREATE TABLE "OnboardingNotificationPreference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "notificationType" "OnboardingNotificationType" NOT NULL,
    "notifyManagers" BOOLEAN NOT NULL DEFAULT true,
    "notifyTaskOwners" BOOLEAN NOT NULL DEFAULT true,
    "notifyHiringManagers" BOOLEAN NOT NULL DEFAULT false,
    "notifyEmployee" BOOLEAN NOT NULL DEFAULT false,
    "notifyAdmins" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OnboardingNotificationPreference_companyId_notificationType_idx" ON "OnboardingNotificationPreference"("companyId", "notificationType");
CREATE INDEX "OnboardingNotificationPreference_companyId_templateId_idx" ON "OnboardingNotificationPreference"("companyId", "templateId");
CREATE UNIQUE INDEX "OnboardingNotificationPreference_companyId_templateId_notificationType_key" ON "OnboardingNotificationPreference"("companyId", "templateId", "notificationType");

ALTER TABLE "OnboardingNotificationPreference" ADD CONSTRAINT "OnboardingNotificationPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnboardingNotificationPreference" ADD CONSTRAINT "OnboardingNotificationPreference_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
