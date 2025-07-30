-- CreateTable
CREATE TABLE "_OnboardingTemplateDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OnboardingTemplateDepartments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OnboardingTemplateJobRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OnboardingTemplateJobRoles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OnboardingTemplateDepartments_B_index" ON "_OnboardingTemplateDepartments"("B");

-- CreateIndex
CREATE INDEX "_OnboardingTemplateJobRoles_B_index" ON "_OnboardingTemplateJobRoles"("B");

-- AddForeignKey
ALTER TABLE "_OnboardingTemplateDepartments" ADD CONSTRAINT "_OnboardingTemplateDepartments_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OnboardingTemplateDepartments" ADD CONSTRAINT "_OnboardingTemplateDepartments_B_fkey" FOREIGN KEY ("B") REFERENCES "OnboardingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OnboardingTemplateJobRoles" ADD CONSTRAINT "_OnboardingTemplateJobRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OnboardingTemplateJobRoles" ADD CONSTRAINT "_OnboardingTemplateJobRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "OnboardingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
