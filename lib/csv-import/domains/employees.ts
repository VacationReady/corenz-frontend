import { CSVImportDomainConfig } from "../types";

export const employeeDomainConfig: CSVImportDomainConfig = {
  id: "employees",
  label: "Employees",
  description:
    "Core employee record covering personal details, employment context, emergency contacts, and driver licensing",
  icon: "users",
  dependencies: "Requires departments, job roles, and working patterns",
  defaultTemplateId: "employees-all",
  templates: [
    {
      id: "employees-all",
      title: "Employee Master Template",
      description:
        "Comprehensive template covering core employee information, employment details, leave setup, emergency contacts, and driver licensing",
      templateFile: "04_employees_template.csv",
      keyNotes: [
        "Keep firstName and lastName as the first two columns in every CSV to guarantee accurate matching.",
        "Dates should use the ISO format YYYY-MM-DD. Leave cells blank if data is not yet available.",
        "When workingPatternName is provided it will create or update a dated working-pattern assignment using startDate (or the import date if no startDate is supplied).",
      ],
      fieldGroups: [
        {
          title: "Personal information",
          description: "Matches the Personal Info panel in the employee profile",
          fields: [
            { key: "firstName", label: "firstName", required: true },
            { key: "lastName", label: "lastName", required: true },
            { key: "email", label: "email", required: true },
            { key: "phoneNumber", label: "phoneNumber" },
            { key: "dateOfBirth", label: "dateOfBirth" },
            { key: "gender", label: "gender" },
            { key: "street", label: "street" },
            { key: "city", label: "city" },
            { key: "postcode", label: "postcode" },
            { key: "country", label: "country" },
            { key: "nationalId", label: "nationalId" },
            { key: "pronouns", label: "pronouns" },
            { key: "residencyStatus", label: "residencyStatus" },
          ],
        },
        {
          title: "Holiday & leave setup",
          description: "Seed Annual Leave balances ready for go-live",
          fields: [
            { key: "holidayTotalBalance", label: "holidayTotalBalance" },
            { key: "holidayCarryover", label: "holidayCarryover" },
            { key: "holidayCurrentBalance", label: "holidayCurrentBalance" },
            { key: "holidayYear", label: "holidayYear" },
          ],
        },
        {
          title: "Employment details",
          fields: [
            {
              key: "departmentName",
              label: "departmentName",
              note: "Must match an imported department",
            },
            {
              key: "jobRoleName",
              label: "jobRoleName",
              note: "Must match an imported job role",
            },
            { key: "employmentType", label: "employmentType" },
            { key: "contractType", label: "contractType" },
            {
              key: "siteLocation",
              label: "siteLocation",
              note: "Matched to an existing location name to assign locationId",
            },
            { key: "startDate", label: "startDate" },
            { key: "contractEndDate", label: "contractEndDate" },
            {
              key: "workingPatternName",
              label: "workingPatternName",
              note: "Must match an imported working pattern name; assignments default to startDate",
            },
            {
              key: "managerEmail",
              label: "managerEmail",
              note: "Email address of the employee's line manager (optional)",
            },
            {
              key: "lineManagerName",
              label: "lineManagerName",
              note: "Full name of the line manager used to build reporting lines",
            },
          ],
        },
        {
          title: "Emergency contacts",
          fields: [
            { key: "emergencyContactName", label: "emergencyContactName" },
            {
              key: "emergencyContactRelationship",
              label: "emergencyContactRelationship",
            },
            { key: "emergencyContactPhone", label: "emergencyContactPhone" },
            { key: "emergencyContactEmail", label: "emergencyContactEmail" },
          ],
        },
        {
          title: "Driver licence",
          fields: [
            { key: "driverLicenceType", label: "driverLicenceType" },
            { key: "driverLicenceNumber", label: "driverLicenceNumber" },
            { key: "driverLicenceIssueDate", label: "driverLicenceIssueDate" },
            { key: "driverLicenceExpiryDate", label: "driverLicenceExpiryDate" },
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
  subTemplates: [
    {
      id: "core",
      label: "Core Personal",
      description: "Focus on personal and contact information only",
      templateId: "employees-all",
      defaultSelected: true,
    },
    {
      id: "employment",
      label: "Employment",
      description: "Include employment details like department, job role, and working patterns",
      templateId: "employees-all",
    },
    {
      id: "compliance",
      label: "Compliance",
      description: "Include compliance information such as driver licence and employment checks",
      templateId: "employees-all",
    },
  ],
};
