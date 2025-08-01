/*
  Warnings:

  - A unique constraint covering the columns `[companyId,name]` on the table `OnboardingTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OnboardingTemplate_companyId_name_key" ON "OnboardingTemplate"("companyId", "name");
