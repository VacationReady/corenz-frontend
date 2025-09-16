// Enhanced HR-focused report fields with categories and metadata
export type HRReportField = {
  model: string;
  field: string;
  label: string;
  type: "string" | "number" | "date" | "boolean" | "enum";
  category: string;
  subcategory?: string;
  filterable: boolean;
  sortable: boolean;
  join?: string;
  dependsOn?: string[];
  description?: string;
  enumValues?: string[];
  isRequired?: boolean;
  isPII?: boolean; // Personal Identifiable Information
};

export type HRCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
};

export const hrCategories: HRCategory[] = [
  {
    id: "people",
    name: "People & Demographics",
    description: "Personal information, contact details, and demographics",
    icon: "👥",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    order: 1,
  },
  {
    id: "employment",
    name: "Employment Details",
    description: "Job roles, departments, working patterns, and employment status",
    icon: "💼",
    color: "bg-green-50 text-green-700 border-green-200",
    order: 2,
  },
  {
    id: "time-off",
    name: "Time Off & Leave",
    description: "Leave requests, entitlements, and time off balances",
    icon: "📅",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    order: 3,
  },
  {
    id: "documents",
    name: "Documents & Compliance",
    description: "Employment checks, training records, and document management",
    icon: "📋",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    order: 4,
  },
  {
    id: "performance",
    name: "Performance & Training",
    description: "Training records, performance data, and development tracking",
    icon: "📈",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    order: 5,
  },
];

export const hrReportFields: HRReportField[] = [
  // People & Demographics
  {
    model: "User",
    field: "User.firstName",
    label: "First Name",
    type: "string",
    category: "people",
    filterable: true,
    sortable: true,
    description: "Employee's first name",
    isPII: true,
  },
  {
    model: "User",
    field: "User.lastName",
    label: "Last Name",
    type: "string",
    category: "people",
    filterable: true,
    sortable: true,
    description: "Employee's last name",
    isPII: true,
  },
  {
    model: "User",
    field: "User.email",
    label: "Email Address",
    type: "string",
    category: "people",
    filterable: true,
    sortable: true,
    description: "Primary email address",
    isPII: true,
  },
  {
    model: "User",
    field: "User.phone",
    label: "Phone Number",
    type: "string",
    category: "people",
    filterable: true,
    sortable: true,
    description: "Primary phone number",
    isPII: true,
  },
  {
    model: "User",
    field: "User.createdAt",
    label: "Date Added",
    type: "date",
    category: "people",
    filterable: true,
    sortable: true,
    description: "Date when user was added to the system",
  },

  // Employment Details
  {
    model: "Employee",
    field: "Employee.isActive",
    label: "Employment Status",
    type: "boolean",
    category: "employment",
    filterable: true,
    sortable: true,
    description: "Whether the employee is currently active",
  },
  {
    model: "User",
    field: "User.department.name",
    label: "Department",
    type: "string",
    category: "employment",
    filterable: true,
    sortable: true,
    description: "Employee's department",
  },
  {
    model: "User",
    field: "User.jobRole.name",
    label: "Job Role",
    type: "string",
    category: "employment",
    filterable: true,
    sortable: true,
    description: "Employee's job role/title",
  },
  {
    model: "WorkingPattern",
    field: "WorkingPattern.name",
    label: "Working Pattern",
    type: "string",
    category: "employment",
    filterable: true,
    sortable: true,
    join: "Employee.workingPatternId = WorkingPattern.id",
    description: "Employee's working pattern",
  },
  {
    model: "User",
    field: "User.managerId",
    label: "Manager ID",
    type: "string",
    category: "employment",
    filterable: true,
    sortable: true,
    description: "ID of the employee's manager",
  },

  // Time Off & Leave
  {
    model: "LeaveRequest",
    field: "LeaveRequest.startDate",
    label: "Leave Start Date",
    type: "date",
    category: "time-off",
    filterable: true,
    sortable: true,
    description: "Start date of leave request",
  },
  {
    model: "LeaveRequest",
    field: "LeaveRequest.endDate",
    label: "Leave End Date",
    type: "date",
    category: "time-off",
    filterable: true,
    sortable: true,
    description: "End date of leave request",
  },
  {
    model: "LeaveRequest",
    field: "LeaveRequest.reason",
    label: "Leave Reason",
    type: "string",
    category: "time-off",
    filterable: true,
    sortable: true,
    description: "Reason for leave request",
  },
  {
    model: "EventCategory",
    field: "EventCategory.name",
    label: "Leave Type",
    type: "string",
    category: "time-off",
    filterable: true,
    sortable: true,
    join: "LeaveRequest.eventCategoryId = EventCategory.id",
    description: "Type of leave (Annual, Sick, etc.)",
  },
  {
    model: "LeaveEntitlement",
    field: "LeaveEntitlement.totalDays",
    label: "Total Leave Days",
    type: "number",
    category: "time-off",
    filterable: true,
    sortable: true,
    description: "Total leave days allocated",
  },
  {
    model: "LeaveEntitlement",
    field: "LeaveEntitlement.usedDays",
    label: "Used Leave Days",
    type: "number",
    category: "time-off",
    filterable: true,
    sortable: true,
    description: "Leave days already used",
  },
  {
    model: "LeaveEntitlement",
    field: "LeaveEntitlement.carryoverDays",
    label: "Carryover Days",
    type: "number",
    category: "time-off",
    filterable: true,
    sortable: true,
    description: "Leave days carried over from previous period",
  },

  // Documents & Compliance
  {
    model: "EmploymentCheck",
    field: "EmploymentCheck.typeOfCheck",
    label: "Employment Check Type",
    type: "string",
    category: "documents",
    filterable: true,
    sortable: true,
    description: "Type of employment check performed",
  },
  {
    model: "EmploymentCheck",
    field: "EmploymentCheck.dateOfIssue",
    label: "Check Issue Date",
    type: "date",
    category: "documents",
    filterable: true,
    sortable: true,
    description: "Date when employment check was issued",
  },
  {
    model: "EmploymentCheck",
    field: "EmploymentCheck.expiryDate",
    label: "Check Expiry Date",
    type: "date",
    category: "documents",
    filterable: true,
    sortable: true,
    description: "Date when employment check expires",
  },
  {
    model: "DriverLicence",
    field: "DriverLicence.type",
    label: "License Type",
    type: "string",
    category: "documents",
    filterable: true,
    sortable: true,
    description: "Type of driver's license",
  },
  {
    model: "DriverLicence",
    field: "DriverLicence.expiryDate",
    label: "License Expiry Date",
    type: "date",
    category: "documents",
    filterable: true,
    sortable: true,
    description: "Date when driver's license expires",
  },

  // Performance & Training
  {
    model: "TrainingRecord",
    field: "TrainingRecord.dateCompleted",
    label: "Training Completion Date",
    type: "date",
    category: "performance",
    filterable: true,
    sortable: true,
    description: "Date when training was completed",
  },
  {
    model: "TrainingRecord",
    field: "TrainingRecord.expiryDate",
    label: "Training Expiry Date",
    type: "date",
    category: "performance",
    filterable: true,
    sortable: true,
    description: "Date when training expires",
  },
  {
    model: "Course",
    field: "Course.name",
    label: "Course Name",
    type: "string",
    category: "performance",
    filterable: true,
    sortable: true,
    join: "TrainingRecord.courseId = Course.id",
    description: "Name of the training course",
  },
  {
    model: "TrainingProvider",
    field: "TrainingProvider.name",
    label: "Training Provider",
    type: "string",
    category: "performance",
    filterable: true,
    sortable: true,
    join: "TrainingRecord.providerId = TrainingProvider.id",
    description: "Name of the training provider",
  },
];

// Helper functions
export function getFieldsByCategory(categoryId: string): HRReportField[] {
  return hrReportFields.filter(field => field.category === categoryId);
}

export function getCategoryById(categoryId: string): HRCategory | undefined {
  return hrCategories.find(cat => cat.id === categoryId);
}

export function getFieldByKey(fieldKey: string): HRReportField | undefined {
  return hrReportFields.find(field => field.field === fieldKey);
}

export function groupFieldsByCategory(): Record<string, HRReportField[]> {
  const grouped: Record<string, HRReportField[]> = {};
  
  hrCategories.forEach(category => {
    grouped[category.id] = getFieldsByCategory(category.id);
  });
  
  return grouped;
}

// Report templates for common HR use cases
export type ReportTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  defaultFields: string[];
  suggestedFilters?: Array<{
    field: string;
    operator: string;
    value?: any;
  }>;
};

export const hrReportTemplates: ReportTemplate[] = [
  {
    id: "employee-directory",
    name: "Employee Directory",
    description: "Complete list of all active employees with contact information",
    category: "people",
    icon: "👥",
    defaultFields: [
      "User.firstName",
      "User.lastName", 
      "User.email",
      "User.phone",
      "User.department.name",
      "User.jobRole.name",
      "Employee.isActive"
    ],
    suggestedFilters: [
      { field: "Employee.isActive", operator: "equals", value: true }
    ],
  },
  {
    id: "leave-summary",
    name: "Leave Summary Report",
    description: "Overview of leave balances and usage across the organization",
    category: "time-off",
    icon: "📅",
    defaultFields: [
      "User.firstName",
      "User.lastName",
      "User.department.name",
      "LeaveEntitlement.totalDays",
      "LeaveEntitlement.usedDays",
      "LeaveEntitlement.carryoverDays"
    ],
  },
  {
    id: "compliance-tracker",
    name: "Compliance Tracker",
    description: "Track employment checks and document expiry dates",
    category: "documents",
    icon: "📋",
    defaultFields: [
      "User.firstName",
      "User.lastName",
      "EmploymentCheck.typeOfCheck",
      "EmploymentCheck.expiryDate",
      "DriverLicence.type",
      "DriverLicence.expiryDate"
    ],
  },
  {
    id: "training-report",
    name: "Training Report",
    description: "Overview of employee training completion and upcoming renewals",
    category: "performance",
    icon: "📈",
    defaultFields: [
      "User.firstName",
      "User.lastName",
      "Course.name",
      "TrainingRecord.dateCompleted",
      "TrainingRecord.expiryDate",
      "TrainingProvider.name"
    ],
  },
  {
    id: "department-overview",
    name: "Department Overview",
    description: "Departmental breakdown of employees and key metrics",
    category: "employment",
    icon: "🏢",
    defaultFields: [
      "User.department.name",
      "User.firstName",
      "User.lastName",
      "User.jobRole.name",
      "Employee.isActive",
      "WorkingPattern.name"
    ],
  },
];

