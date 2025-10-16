import { CSVImportDomainConfig } from "../types";

export const payrollDomainConfig: CSVImportDomainConfig = {
  id: "payroll",
  label: "Payroll",
  description: "Manage payroll-specific imports including pay elements, tax, and bank details.",
  icon: "dollar-sign",
  dependencies: "Requires employees core data to be imported first",
  defaultTemplateId: "payroll-template",
  templates: [
    {
      id: "payroll-template",
      title: "Payroll Template",
      description: "Banking, tax, and payroll configuration for employees",
      templateFile: "payroll_import_template.csv",
      keyNotes: [
        "Ensure employees have been created before running payroll imports.",
        "Map tax codes according to IRD guidance for accurate deductions.",
      ],
      fieldGroups: [
        {
          title: "Employee matching",
          fields: [
            { key: "email", label: "email", required: true },
            { key: "employeeCode", label: "employeeCode" },
          ],
        },
        {
          title: "Banking",
          fields: [
            { key: "bankAccountNumber", label: "bankAccountNumber", required: true },
            { key: "bankBranch", label: "bankBranch" },
            { key: "bankSwift", label: "bankSwift" },
          ],
        },
        {
          title: "Tax & deductions",
          fields: [
            { key: "taxCode", label: "taxCode", required: true },
            { key: "kiwiSaverEnrolled", label: "kiwiSaverEnrolled" },
            { key: "kiwiSaverContribution", label: "kiwiSaverContribution" },
            { key: "studentLoan", label: "studentLoan" },
            { key: "childSupport", label: "childSupport" },
          ],
        },
        {
          title: "Pay configuration",
          fields: [
            { key: "salaryAmount", label: "salaryAmount" },
            { key: "hourlyRate", label: "hourlyRate" },
            { key: "overtimeRate", label: "overtimeRate" },
            { key: "allowance", label: "allowance" },
          ],
        },
      ],
    },
  ],
};
