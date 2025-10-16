import { CSVImportDomainConfig } from "../types";

export const trainingDomainConfig: CSVImportDomainConfig = {
  id: "training",
  label: "Training",
  description:
    "Import employee training history, certifications, and upcoming renewal dates.",
  icon: "graduation-cap",
  dependencies: "Requires employees core data",
  defaultTemplateId: "training-template",
  templates: [
    {
      id: "training-template",
      title: "Training Template",
      description: "Capture completed courses and compliance requirements",
      templateFile: "training_import_template.csv",
      keyNotes: [
        "Include one row per training completion per employee for detailed history.",
        "Leave expiry dates blank for training that does not expire.",
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
          title: "Training details",
          fields: [
            { key: "trainingCourse", label: "trainingCourse", required: true },
            { key: "trainingProvider", label: "trainingProvider" },
            { key: "trainingDateCompleted", label: "trainingDateCompleted" },
            { key: "trainingExpiryDate", label: "trainingExpiryDate" },
          ],
        },
        {
          title: "Compliance records",
          fields: [
            { key: "employmentCheckType", label: "employmentCheckType" },
            {
              key: "employmentCheckDocumentNumber",
              label: "employmentCheckDocumentNumber",
            },
            {
              key: "employmentCheckIssueDate",
              label: "employmentCheckIssueDate",
            },
            {
              key: "employmentCheckExpiryDate",
              label: "employmentCheckExpiryDate",
            },
          ],
        },
      ],
    },
  ],
};
