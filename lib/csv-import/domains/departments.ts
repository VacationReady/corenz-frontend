import { CSVImportDomainConfig } from "../types";

export const departmentsDomainConfig: CSVImportDomainConfig = {
  id: "departments",
  label: "Departments",
  description: "Organisational units, cost centres, and reporting structures",
  icon: "building",
  dependencies: "None – foundational data",
  defaultTemplateId: "departments-template",
  templates: [
    {
      id: "departments-template",
      title: "Departments Template",
      description: "Create foundational structures for reporting and permissions",
      templateFile: "01_departments_template.csv",
      fieldGroups: [
        {
          title: "Core details",
          fields: [
            { key: "name", label: "name", required: true },
            { key: "description", label: "description" },
            {
              key: "headEmail",
              label: "headEmail",
              note: "Must match an existing user",
            },
            { key: "code", label: "code" },
            { key: "active", label: "active" },
          ],
        },
      ],
    },
  ],
};
