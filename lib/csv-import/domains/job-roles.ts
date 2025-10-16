import { CSVImportDomainConfig } from "../types";

export const jobRolesDomainConfig: CSVImportDomainConfig = {
  id: "job-roles",
  label: "Job Roles",
  description: "Job titles, levels, and pay bands for your organisation",
  icon: "users",
  dependencies: "Requires departments to be imported first",
  defaultTemplateId: "job-roles-template",
  templates: [
    {
      id: "job-roles-template",
      title: "Job Roles Template",
      description: "Define the job structure for your organisation",
      templateFile: "02_job_roles_template.csv",
      fieldGroups: [
        {
          title: "Role definition",
          fields: [
            { key: "name", label: "name", required: true },
            {
              key: "departmentName",
              label: "departmentName",
              required: true,
              note: "Must match a department",
            },
            { key: "description", label: "description" },
            { key: "level", label: "level" },
            { key: "payGrade", label: "payGrade" },
            { key: "active", label: "active" },
          ],
        },
      ],
    },
  ],
};
