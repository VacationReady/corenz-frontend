/**
 * Enhanced Query Models
 * Comprehensive model definitions for AI querying across 80+ database tables
 */

export const ENHANCED_QUERY_MODELS = {
  // Core Employee & User
  employee: {
    description: "Employee records with personal and employment information",
    commonQueries: [
      "Show me all employees",
      "Find employees in [department]",
      "List employees without [field]",
      "Who reports to [manager]",
    ],
    fields: ["firstName", "lastName", "email", "phone", "department", "jobRole", "startDate", "contractEndDate", "salary", "irdNumber", "taxCode", "isActive", "contractType", "employmentType"],
  },
  
  // Leave & Absence
  leaveRequest: {
    description: "Leave and absence requests",
    commonQueries: [
      "Who is on leave next week?",
      "Show me pending leave requests",
      "List approved leave for [month]",
      "Who has the most leave booked?",
    ],
    fields: ["startDate", "endDate", "approvalStatus", "dayType", "reason", "paidStatus"],
  },
  
  leaveEntitlement: {
    description: "Employee leave balances and entitlements",
    commonQueries: [
      "Show leave balances for [employee]",
      "Who has less than 5 days remaining?",
      "List all leave entitlements",
    ],
    fields: ["totalDays", "usedDays", "balance", "eventCategoryId"],
  },
  
  // Documents & Compliance
  document: {
    description: "Company and employee documents",
    commonQueries: [
      "Show documents requiring signature",
      "List expiring documents",
      "Documents uploaded by [person]",
    ],
    fields: ["name", "category", "requiresSignature", "requiresAck", "signatureDueAt"],
  },
  
  employmentCheck: {
    description: "Employment verification checks (passport, work permit, etc.)",
    commonQueries: [
      "Show expiring employment checks",
      "List checks due this month",
      "Who needs passport renewal?",
    ],
    fields: ["typeOfCheck", "documentNumber", "dateOfIssue", "expiryDate"],
  },
  
  driverLicence: {
    description: "Driver license records",
    commonQueries: [
      "Show expiring driver licenses",
      "List all valid licenses",
    ],
    fields: ["type", "licenceNumber", "issueDate", "expiryDate"],
  },
  
  // Onboarding & Offboarding
  onboardingInstance: {
    description: "Active onboarding processes",
    commonQueries: [
      "Show pending onboarding",
      "Who is currently onboarding?",
      "List completed onboarding",
    ],
    fields: ["status", "startedAt", "completedAt", "progress"],
  },
  
  onboardingTemplate: {
    description: "Onboarding workflow templates",
    commonQueries: [
      "List all onboarding templates",
      "Show templates for [department]",
    ],
    fields: ["name", "description", "isActive", "targetDepartments", "targetJobRoles"],
  },
  
  employeeOffboarding: {
    description: "Employee exit and offboarding records",
    commonQueries: [
      "Show pending offboarding",
      "Who is leaving this month?",
      "List completed exits",
    ],
    fields: ["status", "lastWorkingDate", "resignationDate", "offboardingReason", "isVoluntary", "offboardingType"],
  },
  
  exitInterview: {
    description: "Exit interview scheduling and records",
    commonQueries: [
      "Show pending exit interviews",
      "List completed interviews",
    ],
    fields: ["scheduledAt", "completed", "interviewerId"],
  },
  
  // Performance & Training
  employeePerformanceReview: {
    description: "Performance review records",
    commonQueries: [
      "Show pending performance reviews",
      "List reviews for [employee]",
      "Reviews due this quarter",
    ],
    fields: ["reviewDate", "rating", "summary", "reviewerId", "goals"],
  },
  
  trainingRecord: {
    description: "Training completion and certification records",
    commonQueries: [
      "Show expiring training certifications",
      "List completed training for [employee]",
      "Who needs compliance training?",
    ],
    fields: ["courseId", "dateCompleted", "expiryDate", "providerId"],
  },
  
  course: {
    description: "Training courses available",
    commonQueries: [
      "List all training courses",
      "Show mandatory courses",
    ],
    fields: ["name", "description", "duration", "isActive"],
  },
  
  // Forms & Submissions
  form: {
    description: "Custom forms and data collection",
    commonQueries: [
      "List all active forms",
      "Show forms for [department]",
      "Which forms require completion?",
    ],
    fields: ["name", "description", "formType", "isActive", "visibleToDepartments", "visibleToJobRoles"],
  },
  
  formSubmission: {
    description: "Form submission records",
    commonQueries: [
      "Show recent form submissions",
      "List submissions for [form]",
      "Who submitted [form]?",
    ],
    fields: ["formId", "submittedAt", "data"],
  },
  
  formAssignment: {
    description: "Forms assigned to employees",
    commonQueries: [
      "Show pending form assignments",
      "List overdue forms",
      "Who needs to complete [form]?",
    ],
    fields: ["status", "dueDate", "completedAt", "assignedById"],
  },
  
  // Organization Structure
  department: {
    description: "Company departments",
    commonQueries: [
      "List all departments",
      "Show departments with [criteria]",
      "How many people in each department?",
    ],
    fields: ["name", "managerId", "isActive"],
  },
  
  jobRole: {
    description: "Job roles and positions",
    commonQueries: [
      "List all job roles",
      "Show roles in [department]",
      "How many [role] employees?",
    ],
    fields: ["name", "departmentId", "level", "description"],
  },
  
  location: {
    description: "Office locations",
    commonQueries: [
      "List all office locations",
      "Show employees at [location]",
    ],
    fields: ["name", "address", "city", "country"],
  },
  
  // Automation & Workflows
  automationRule: {
    description: "Automation rules and workflows",
    commonQueries: [
      "Show active workflows",
      "List automation rules",
      "Which workflows failed recently?",
    ],
    fields: ["name", "description", "isActive", "triggerType", "category", "executionCount", "successCount"],
  },
  
  automationExecution: {
    description: "Workflow execution history",
    commonQueries: [
      "Show recent workflow executions",
      "List failed automations",
      "Execution history for [workflow]",
    ],
    fields: ["status", "triggeredAt", "errorMessage", "executionLog"],
  },
  
  actionItem: {
    description: "Tasks and action items",
    commonQueries: [
      "Show my pending tasks",
      "List overdue action items",
      "Tasks assigned to [person]",
    ],
    fields: ["title", "description", "status", "priority", "dueDate", "assignedToId", "relatedEmployeeId"],
  },
  
  // News & Communication
  newsPost: {
    description: "Company news and announcements",
    commonQueries: [
      "Show recent news",
      "List published articles",
      "News from [department]",
    ],
    fields: ["title", "content", "publishedAt", "authorId", "isPinned", "isPublished", "visibility"],
  },
  
  // Permissions & Security
  permissionProfile: {
    description: "Permission profiles and roles",
    commonQueries: [
      "List all permission profiles",
      "Show profiles with [permission]",
    ],
    fields: ["name", "description", "isDefault", "permissions"],
  },
  
  // Approval Workflows
  approvalWorkflow: {
    description: "Approval workflow definitions",
    commonQueries: [
      "List approval workflows",
      "Show workflows for [type]",
    ],
    fields: ["name", "entityType", "isActive", "isDefault"],
  },
  
  leaveApprovalStage: {
    description: "Leave approval stages and decisions",
    commonQueries: [
      "Show pending approvals",
      "List my approval requests",
      "Approvals due for [person]",
    ],
    fields: ["status", "mode", "order", "isActive"],
  },
  
  // Emergency & Personal Info
  emergencyContact: {
    description: "Employee emergency contacts",
    commonQueries: [
      "Show emergency contacts for [employee]",
      "List employees without emergency contacts",
    ],
    fields: ["name", "relationship", "phone", "email"],
  },
  
  // Audit & Compliance
  employeeAuditLog: {
    description: "Audit trail of employee changes",
    commonQueries: [
      "Show recent changes to [employee]",
      "Audit log for [field]",
      "Changes made by [user]",
    ],
    fields: ["section", "field", "oldValue", "newValue", "reason", "changedById", "changedAt"],
  },
  
  globalAuditLog: {
    description: "System-wide audit log",
    commonQueries: [
      "Show recent system changes",
      "Audit trail for [action]",
    ],
    fields: ["action", "entityType", "entityId", "userId", "changes", "createdAt"],
  },
  
  // Notifications
  transactionalNotificationPreference: {
    description: "User notification preferences",
    commonQueries: [
      "Show notification settings for [user]",
      "Who has notifications enabled for [section]?",
    ],
    fields: ["section", "enabled", "roles", "departments", "jobRoles"],
  },
  
  // Reports
  savedReport: {
    description: "Saved report configurations",
    commonQueries: [
      "List all saved reports",
      "Show reports created by [user]",
    ],
    fields: ["name", "description", "config", "createdById", "isPublic"],
  },
  
  // Working Patterns
  workingPattern: {
    description: "Work schedule templates",
    commonQueries: [
      "List all working patterns",
      "Show patterns for [type]",
    ],
    fields: ["name", "description", "type", "isActive"],
  },
  
  // Expiry & Compliance Tracking
  expiryRule: {
    description: "Expiry notification rules",
    commonQueries: [
      "Show expiry rules",
      "List notification settings",
    ],
    fields: ["category", "daysBefore", "notifyAdmin", "notifyManager", "notifyEmployee"],
  },
};

// Generate natural language context for AI
export function buildEnhancedSchemaContext(): string {
  let context = "You can query data from these 30+ models:\n\n";
  
  Object.entries(ENHANCED_QUERY_MODELS).forEach(([model, info]) => {
    context += `**${model}**: ${info.description}\n`;
    context += `  Fields: ${info.fields.join(", ")}\n`;
    context += `  Example: "${info.commonQueries[0]}"\n\n`;
  });
  
  return context;
}

