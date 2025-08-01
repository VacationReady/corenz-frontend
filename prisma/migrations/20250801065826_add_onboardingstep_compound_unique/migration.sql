/*
  Warnings:

  - A unique constraint covering the columns `[templateId,label]` on the table `OnboardingStep` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStep_templateId_label_key" ON "OnboardingStep"("templateId", "label");
