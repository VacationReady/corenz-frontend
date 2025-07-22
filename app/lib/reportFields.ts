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
  { model: "leaveEntitlement", field: "eventCategory.name", label: "Leave Type", type: "string", filterable: true, join: "eventCategory" },
  { model: "leaveEntitlement", field: "totalDays", label: "Total Days", type: "number", filterable: true },
  { model: "leaveEntitlement", field: "usedDays", label: "Used Days", type: "number", filterable: true },
  { model: "leaveEntitlement", field: "daysAllocated", label: "Days Allocated", type: "number", filterable: true },
  { model: "leaveEntitlement", field: "carryoverDays", label: "Carryover Days", type: "number", filterable: true },
  { model: "leaveEntitlement", field: "carryoverExpiry", label: "Carryover Expiry", type: "date", filterable: true },
  { model: "leaveEntitlement", field: "createdAt", label: "Created At", type: "date", filterable: true },
  { model: "leaveEntitlement", field: "updatedAt", label: "Updated At", type: "date", filterable: true },
  // ✅ Computed Remaining Entitlement
  { model: "leaveEntitlement", field: "_computed.remainingEntitlement", label: "Remaining Entitlement", type: "number", filterable: false },

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
  { model: "employmentCheck", field: "employee.user.email", label: "Employee Email", type: "string", filterable: true, join: "employee.user" },
  { model: "employmentCheck", field: "checkType", label: "Check Type", type: "string", filterable: true },
  { model: "employmentCheck", field: "completedAt", label: "Check Completed At", type: "date", filterable: true },

  // Document Fields
  { model: "document", field: "employee.user.name", label: "Employee Name", type: "string", filterable: true, join: "employee.user" },
  { model: "document", field: "documentType", label: "Document Type", type: "string", filterable: true },
  { model: "document", field: "uploadedAt", label: "Uploaded At", type: "date", filterable: true },

  // WorkingPattern Fields
  { model: "workingPattern", field: "name", label: "Working Pattern Name", type: "string", filterable: true },

  // Company Fields
  { model: "company", field: "name", label: "Company Name", type: "string", filterable: true },
];
