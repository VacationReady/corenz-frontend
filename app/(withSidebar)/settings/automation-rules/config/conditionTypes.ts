// Condition types for filtering who/what the workflow applies to
// Creates visual branching logic in the workflow builder

export const conditionTypes = [
  // WHO - Employee filters
  {
    id: "employee_department",
    name: "Filter by Department",
    description: "Only apply to employees in specific departments",
    category: "Employee Filters",
    icon: "🏢",
    fields: [
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "is", label: "Is" },
        { value: "is_not", label: "Is Not" },
        { value: "is_any_of", label: "Is Any Of" },
        { value: "is_none_of", label: "Is None Of" }
      ]},
      { key: "departmentIds", label: "Departments", type: "multiselect", required: true },
    ],
  },
  {
    id: "employee_job_role",
    name: "Filter by Job Role",
    description: "Only apply to employees with specific job roles",
    category: "Employee Filters",
    icon: "💼",
    fields: [
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "is", label: "Is" },
        { value: "is_not", label: "Is Not" },
        { value: "is_any_of", label: "Is Any Of" },
        { value: "is_none_of", label: "Is None Of" }
      ]},
      { key: "jobRoleIds", label: "Job Roles", type: "multiselect", required: true },
    ],
  },
  {
    id: "employee_location",
    name: "Filter by Location",
    description: "Only apply to employees at specific locations",
    category: "Employee Filters",
    icon: "📍",
    fields: [
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "is", label: "Is" },
        { value: "is_not", label: "Is Not" },
        { value: "is_any_of", label: "Is Any Of" }
      ]},
      { key: "locationIds", label: "Locations", type: "multiselect", required: true },
    ],
  },
  {
    id: "employee_manager",
    name: "Filter by Manager",
    description: "Only apply to employees who report to specific managers",
    category: "Employee Filters",
    icon: "👤",
    fields: [
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "reports_to", label: "Reports To" },
        { value: "does_not_report_to", label: "Does Not Report To" }
      ]},
      { key: "managerIds", label: "Managers", type: "multiselect", required: true },
    ],
  },
  {
    id: "employee_contract_type",
    name: "Filter by Contract Type",
    description: "Only apply to employees on specific contract types",
    category: "Employee Filters",
    icon: "📄",
    fields: [
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "is", label: "Is" },
        { value: "is_not", label: "Is Not" }
      ]},
      { key: "contractTypes", label: "Contract Types", type: "multiselect", required: true, options: [
        { value: "permanent", label: "Permanent" },
        { value: "fixed_term", label: "Fixed Term" },
        { value: "casual", label: "Casual" },
        { value: "contractor", label: "Contractor" }
      ]},
    ],
  },
  
  // WHEN - Time-based filters
  {
    id: "time_of_year",
    name: "Filter by Time of Year",
    description: "Only run during specific months or date ranges",
    category: "Time Filters",
    icon: "📅",
    fields: [
      { key: "months", label: "Months", type: "multiselect", options: [
        { value: "1", label: "January" },
        { value: "2", label: "February" },
        { value: "3", label: "March" },
        { value: "4", label: "April" },
        { value: "5", label: "May" },
        { value: "6", label: "June" },
        { value: "7", label: "July" },
        { value: "8", label: "August" },
        { value: "9", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" }
      ]},
    ],
  },
  {
    id: "days_since_start",
    name: "Filter by Days Since Start",
    description: "Only apply if employee started X days ago",
    category: "Time Filters",
    icon: "⏱️",
    fields: [
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "greater_than", label: "More Than" },
        { value: "less_than", label: "Less Than" },
        { value: "equals", label: "Exactly" },
        { value: "between", label: "Between" }
      ]},
      { key: "days", label: "Days", type: "number", required: true, placeholder: "90" },
      { key: "daysMax", label: "Max Days", type: "number", conditional: "operator=between", placeholder: "120" },
    ],
  },
  {
    id: "probation_status",
    name: "Filter by Probation Status",
    description: "Check if employee is in probation period",
    category: "Time Filters",
    icon: "🔍",
    fields: [
      { key: "status", label: "Status", type: "select", required: true, options: [
        { value: "in_probation", label: "Currently in Probation" },
        { value: "probation_ending_soon", label: "Probation Ending Soon (within 14 days)" },
        { value: "past_probation", label: "Past Probation" }
      ]},
    ],
  },
  
  // WHAT - Data/field conditions
  {
    id: "field_value",
    name: "Check Field Value",
    description: "Compare an employee field to a specific value",
    category: "Data Conditions",
    icon: "🔢",
    fields: [
      { key: "field", label: "Field", type: "select", required: true, options: [
        { value: "employmentType", label: "Employment Type" },
        { value: "isActive", label: "Is Active" },
        { value: "offboardingStatus", label: "Offboarding Status" },
        { value: "kiwiSaverEnrolled", label: "KiwiSaver Enrolled" },
        { value: "taxCode", label: "Tax Code" }
      ]},
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "equals", label: "Equals" },
        { value: "not_equals", label: "Not Equals" },
        { value: "is_empty", label: "Is Empty" },
        { value: "is_not_empty", label: "Is Not Empty" }
      ]},
      { key: "value", label: "Value", type: "text", conditional: "operator!=is_empty,is_not_empty" },
    ],
  },
  {
    id: "has_manager",
    name: "Has Manager Assigned",
    description: "Check if employee has a reporting manager",
    category: "Data Conditions",
    icon: "👥",
    fields: [
      { key: "hasManager", label: "Condition", type: "select", required: true, options: [
        { value: "yes", label: "Has a Manager" },
        { value: "no", label: "No Manager Assigned" }
      ]},
    ],
  },
  {
    id: "document_status",
    name: "Document Status Check",
    description: "Check if specific documents are uploaded/expiring",
    category: "Document Conditions",
    icon: "📋",
    fields: [
      { key: "documentType", label: "Document Type", type: "select", required: true, options: [
        { value: "Passport", label: "Passport" },
        { value: "Right to Work", label: "Right to Work" },
        { value: "Visa", label: "Visa" },
        { value: "Driver License", label: "Driver License" }
      ]},
      { key: "condition", label: "Condition", type: "select", required: true, options: [
        { value: "missing", label: "Missing/Not Uploaded" },
        { value: "expiring_soon", label: "Expiring Soon (30 days)" },
        { value: "expired", label: "Expired" },
        { value: "valid", label: "Valid & Current" }
      ]},
    ],
  },
  {
    id: "leave_balance",
    name: "Leave Balance Check",
    description: "Check if employee's leave balance meets criteria",
    category: "Leave Conditions",
    icon: "🏖️",
    fields: [
      { key: "leaveType", label: "Leave Type", type: "select", required: true },
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "greater_than", label: "Greater Than" },
        { value: "less_than", label: "Less Than" },
        { value: "equals", label: "Equals" }
      ]},
      { key: "days", label: "Days", type: "number", required: true, placeholder: "5" },
    ],
  },
  {
    id: "form_submitted",
    name: "Form Submission Check",
    description: "Check if employee has submitted a specific form",
    category: "Form Conditions",
    icon: "📝",
    fields: [
      { key: "formId", label: "Form", type: "select", required: true },
      { key: "condition", label: "Condition", type: "select", required: true, options: [
        { value: "submitted", label: "Has Submitted" },
        { value: "not_submitted", label: "Has Not Submitted" },
        { value: "overdue", label: "Submission Overdue" }
      ]},
    ],
  },
  
  // ADVANCED - Business logic
  {
    id: "working_hours",
    name: "Working Hours Check",
    description: "Only run during business hours (NZ timezone)",
    category: "Advanced",
    icon: "🕐",
    fields: [
      { key: "startHour", label: "Start Hour (24h)", type: "number", placeholder: "9", min: 0, max: 23 },
      { key: "endHour", label: "End Hour (24h)", type: "number", placeholder: "17", min: 0, max: 23 },
      { key: "timezone", label: "Timezone", type: "select", options: [
        { value: "Pacific/Auckland", label: "NZ - Auckland" },
        { value: "Pacific/Chatham", label: "NZ - Chatham Islands" }
      ]},
    ],
  },
  {
    id: "custom_field",
    name: "Custom Field Check",
    description: "Advanced: check any employee field with custom logic",
    category: "Advanced",
    icon: "⚙️",
    fields: [
      { key: "fieldPath", label: "Field Path", type: "text", required: true, placeholder: "employee.User.email", helpText: "Use dot notation" },
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { value: "equals", label: "Equals" },
        { value: "contains", label: "Contains" },
        { value: "starts_with", label: "Starts With" },
        { value: "regex", label: "Matches Regex" }
      ]},
      { key: "value", label: "Value", type: "text", required: true },
    ],
  },
];

