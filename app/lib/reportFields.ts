export const reportFields = [
  // Employee Fields
  { model: "employee", field: "user.name", label: "Employee Name", type: "string", filterable: true, join: "user" },
  { model: "employee", field: "user.email", label: "Employee Email", type: "string", filterable: true, join: "user" },
  { model: "employee", field: "department.name", label: "Department Name", type: "string", filterable: true, join: "department" },
  { model: "employee", field: "isActive", label: "Active Status", type: "boolean", filterable: true },

  // LeaveRequest Fields
  { model: "leaveRequest", field: "employee.user.name", label: "Employee Name", type: "string", filterable: true, join: "employee.user" },
  { model: "leaveRequest", field: "startDate", label: "Leave Start Date", type: "date", filterable: true },
  { model: "leaveRequest", field: "endDate", label: "Leave End Date", type: "date", filterable: true },
  { model: "leaveRequest", field: "status", label: "Leave Status", type: "string", filterable: true },

  // LeaveEntitlement Fields
  { model: "leaveEntitlement", field: "employee.user.name", label: "Employee Name", type: "string", filterable: true, join: "employee.user" },
  { model: "leaveEntitlement", field: "leaveType", label: "Leave Type", type: "string", filterable: true },
  { model: "leaveEntitlement", field: "totalEntitlement", label: "Total Entitlement", type: "number", filterable: true },
  { model: "leaveEntitlement", field: "remainingEntitlement", label: "Remaining Entitlement", type: "number", filterable: true },

  // DriverLicence Fields
{ model: "driverLicence", field: "employee.user.name", label: "Employee Name", type: "string", filterable: true, join: "employee.user" },
{ model: "driverLicence", field: "category", label: "Licence Category", type: "string", filterable: true },
{ model: "driverLicence", field: "expiryDate", label: "Licence Expiry Date", type: "date", filterable: true },

  // TrainingRecord Fields
  { model: "trainingRecord", field: "employee.user.name", label: "Employee Name", type: "string", filterable: true, join: "employee.user" },
  { model: "trainingRecord", field: "trainingName", label: "Training Name", type: "string", filterable: true },
  { model: "trainingRecord", field: "expiryDate", label: "Training Expiry Date", type: "date", filterable: true },

  // EmploymentCheck Fields
  { model: "employmentCheck", field: "employee.user.name", label: "Employee Name", type: "string", filterable: true, join: "employee.user" },
  { model: "employmentCheck", field: "checkType", label: "Check Type", type: "string", filterable: true },
  { model: "employmentCheck", field: "completedAt", label: "Check Completed At", type: "date", filterable: true },

  // Document Fields
  { model: "document", field: "employee.user.name", label: "Employee Name", type: "string", filterable: true, join: "employee.user" },
  { model: "document", field: "documentType", label: "Document Type", type: "string", filterable: true },
  { model: "document", field: "uploadedAt", label: "Uploaded At", type: "date", filterable: true },

  // WorkingPattern Fields
  { model: "workingPattern", field: "name", label: "Working Pattern Name", type: "string", filterable: true },

  // EmploymentCheck Fields
  { model: "employmentCheck", field: "employee.user.email", label: "Employee Email", type: "string", filterable: true, join: "employee.user" },

  // Company Fields
  { model: "company", field: "name", label: "Company Name", type: "string", filterable: true },
];
