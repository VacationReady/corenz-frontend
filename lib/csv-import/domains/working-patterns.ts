import { CSVImportDomainConfig } from "../types";

export const workingPatternsDomainConfig: CSVImportDomainConfig = {
  id: "working-patterns",
  label: "Working Patterns",
  description: "Standard hours templates, shifts, and flexible schedules",
  icon: "clock",
  dependencies: "None – can be imported independently",
  defaultTemplateId: "working-patterns-template",
  templates: [
    {
      id: "working-patterns-template",
      title: "Working Patterns Template",
      description: "Define employees' weekly working hours and pattern metadata",
      templateFile: "03_working_patterns_template.csv",
      keyNotes: [
        "Enter hours as decimal values (e.g. 7.5 for 7 hours 30 minutes).",
        "Leave a day blank or set to 0 if no hours are worked on that day.",
      ],
      fieldGroups: [
        {
          title: "Pattern meta",
          fields: [
            { key: "name", label: "name", required: true },
            { key: "description", label: "description" },
            { key: "patternType", label: "patternType" },
            { key: "active", label: "active" },
          ],
        },
        {
          title: "Weekly hours",
          description: "Number of hours worked on each day of the week",
          fields: [
            { key: "mondayHours", label: "mondayHours" },
            { key: "tuesdayHours", label: "tuesdayHours" },
            { key: "wednesdayHours", label: "wednesdayHours" },
            { key: "thursdayHours", label: "thursdayHours" },
            { key: "fridayHours", label: "fridayHours" },
            { key: "saturdayHours", label: "saturdayHours" },
            { key: "sundayHours", label: "sundayHours" },
          ],
        },
      ],
    },
  ],
};
