import { CSVImportDomainConfig } from "../types";

export const payrollDomainConfig: CSVImportDomainConfig = {
  id: "payroll",
  label: "Payroll",
  description: "Manage core payroll details including bank accounts, IRD numbers, and compensation.",
  icon: "dollar-sign",
  dependencies: "Requires employees core data to be imported first",
  defaultTemplateId: "payroll-template",
  templates: [
    {
      id: "payroll-template",
      title: "Payroll Template",
      description: "Update bank, tax, KiwiSaver, and compensation settings for existing employees",
      templateFile: "payroll_import_template.csv",
      keyNotes: [
        "Ensure employees are created before running payroll imports.",
        "Use valid NZ IRD tax codes (e.g. M, ME SL).",
      ],
      fieldGroups: [
        {
          title: "Employee matching",
          fields: [
            { key: "email", label: "email", required: true },
          ],
        },
        {
          title: "Banking & tax",
          fields: [
            { key: "bankAccountNumber", label: "bankAccountNumber" },
            { key: "irdNumber", label: "irdNumber" },
            { key: "taxCode", label: "taxCode" },
            { key: "kiwiSaverEnrolled", label: "kiwiSaverEnrolled" },
            { key: "kiwiSaverContribution", label: "kiwiSaverContribution" },
          ],
        },
        {
          title: "Compensation",
          fields: [
            { key: "salaryAmount", label: "salaryAmount" },
            { key: "hourlyRate", label: "hourlyRate" },
          ],
        },
      ],
    },
  ],
};
