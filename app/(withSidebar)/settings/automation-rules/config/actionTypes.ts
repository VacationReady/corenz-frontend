// Action types that create tasks in the Action Items widget on employee dashboards
// Designed to AVOID duplicating existing auto-notifications and system behaviours

import React from "react";
import { 
  Mail, 
  User, 
  CheckCircle2, 
  FileText, 
  Paperclip, 
  PenSquare, 
  DoorOpen, 
  Edit, 
  Umbrella, 
  GraduationCap, 
  Star, 
  Lock, 
  Link as LinkIcon 
} from "lucide-react";

export const actionTypes = [
  // COMMUNICATION - send messages
  {
    id: "send_email",
    name: "Send Email",
    description: "Send a custom email to employee, manager, or HR",
    category: "Communication",
    icon: <Mail className="w-4 h-4" />,
    fields: [
      { key: "recipientType", label: "Send To", type: "select", required: true, options: [
        { value: "employee", label: "Employee (trigger subject)" },
        { value: "manager", label: "Employee's Manager" },
        { value: "hr", label: "HR Team" },
        { value: "specific", label: "Specific Email Addresses" }
      ]},
      { key: "recipients", label: "Email Addresses", type: "text", conditional: "recipientType=specific", placeholder: "user@company.com, another@company.com" },
      { key: "subject", label: "Subject", type: "text", required: true, placeholder: "Important: action required" },
      { key: "message", label: "Message", type: "textarea", required: true, placeholder: "Hi {{firstName}}, please..." },
    ],
  },
  {
    id: "send_manager_reminder",
    name: "Remind Manager",
    description: "Send a reminder to the employee's manager",
    category: "Communication",
    icon: <User className="w-4 h-4" />,
    fields: [
      { key: "subject", label: "Subject", type: "text", required: true, placeholder: "Action needed for {{employeeName}}" },
      { key: "message", label: "Message", type: "textarea", required: true },
      { key: "dueDays", label: "Set reminder for (days)", type: "number", placeholder: "3" },
    ],
  },
  
  // ACTION ITEMS - create tasks that appear in dashboard
  {
    id: "create_action_item",
    name: "Create Action Item",
    description: "Add a to-do in the employee's Action Items dashboard",
    category: "Action Items",
    icon: <CheckCircle2 className="w-4 h-4" />,
    fields: [
      { key: "title", label: "Task Title", type: "text", required: true, placeholder: "Complete probation review" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Review performance and confirm continuation" },
      { key: "assigneeType", label: "Assign To", type: "select", required: true, options: [
        { value: "employee", label: "Employee (trigger subject)" },
        { value: "manager", label: "Employee's Manager" },
        { value: "hr", label: "HR Team" },
        { value: "specific", label: "Specific User" }
      ]},
      { key: "assigneeId", label: "Specific User", type: "select", conditional: "assigneeType=specific" },
      { key: "dueDays", label: "Due in (days)", type: "number", placeholder: "7" },
      { key: "urgent", label: "Mark as urgent", type: "boolean", default: false },
    ],
  },
  
  // FORMS - assign forms (creates action item)
  {
    id: "assign_form",
    name: "Assign Form",
    description: "Assign a form → appears in Action Items until completed",
    category: "Forms & Documents",
    icon: <FileText className="w-4 h-4" />,
    fields: [
      { key: "formId", label: "Form", type: "select", required: true },
      { key: "dueDays", label: "Due in (days)", type: "number", placeholder: "7" },
      { key: "sendReminder", label: "Send email reminder", type: "boolean", default: true },
    ],
  },
  {
    id: "request_document_upload",
    name: "Request Document Upload",
    description: "Ask employee to upload a document → appears in Action Items",
    category: "Forms & Documents",
    icon: <Paperclip className="w-4 h-4" />,
    fields: [
      { key: "documentType", label: "Document Type", type: "select", required: true, options: [
        { value: "Passport", label: "Passport" },
        { value: "Right to Work", label: "Right to Work" },
        { value: "Visa", label: "Visa / Work Permit" },
        { value: "Driver License", label: "Driver License" },
        { value: "Training Certificate", label: "Training Certificate" },
        { value: "Police Check", label: "Police Check" },
        { value: "Bank Details", label: "Bank Details" },
        { value: "Emergency Contact", label: "Emergency Contact Form" },
        { value: "Other", label: "Other" }
      ]},
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "notifyManager", label: "CC Manager", type: "boolean", default: false },
    ],
  },
  {
    id: "request_document_acknowledgement",
    name: "Request Document Acknowledgement",
    description: "Ask employee to acknowledge/sign a document",
    category: "Forms & Documents",
    icon: <PenSquare className="w-4 h-4" />,
    fields: [
      { key: "documentId", label: "Document", type: "select", required: true },
      { key: "requireSignature", label: "Require Signature", type: "boolean", default: false },
      { key: "dueDays", label: "Due in (days)", type: "number", placeholder: "7" },
    ],
  },
  
  // OFFBOARDING - add tasks to checklist
  {
    id: "create_offboarding_task",
    name: "Add Offboarding Task",
    description: "Add a task to employee's offboarding checklist",
    category: "Offboarding",
    icon: <DoorOpen className="w-4 h-4" />,
    fields: [
      { key: "title", label: "Task Title", type: "text", required: true, placeholder: "Remove Slack access" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "category", label: "Category", type: "select", required: true, options: [
        { value: "ACCESS", label: "🔐 Access Removal" },
        { value: "ASSETS", label: "💻 Assets Return" },
        { value: "HANDOVER", label: "🤝 Handover" },
        { value: "PAYROLL", label: "💰 Payroll & Finance" },
        { value: "HR", label: "👥 HR Admin" },
        { value: "COMPLIANCE", label: "⚖️ Compliance" },
        { value: "OTHER", label: "Other" }
      ]},
      { key: "assignToType", label: "Assign To", type: "select", options: [
        { value: "it", label: "IT Team" },
        { value: "finance", label: "Finance Team" },
        { value: "hr", label: "HR Team" },
        { value: "manager", label: "Manager" },
        { value: "specific", label: "Specific User" }
      ]},
      { key: "dueDays", label: "Due in (days from last working day)", type: "number", placeholder: "-3" },
      { key: "isRequired", label: "Required task", type: "boolean", default: true },
    ],
  },
  
  // EMPLOYEE DATA UPDATES
  {
    id: "update_employee_field",
    name: "Update Employee Field",
    description: "Change employee details (department, role, etc.)",
    category: "Employee Updates",
    icon: <Edit className="w-4 h-4" />,
    fields: [
      { key: "field", label: "Field", type: "select", required: true, options: [
        { value: "department", label: "Department" },
        { value: "jobRole", label: "Job Role" },
        { value: "manager", label: "Reporting Manager" },
        { value: "workingPattern", label: "Working Pattern" },
        { value: "location", label: "Location" }
      ]},
      { key: "valueId", label: "New Value ID", type: "text", required: true, helpText: "ID of department/role/manager/pattern" },
    ],
  },
  {
    id: "adjust_leave_balance",
    name: "Adjust Leave Balance",
    description: "Add or subtract leave days (manual adjustment)",
    category: "Leave & Time Off",
    icon: <Umbrella className="w-4 h-4" />,
    fields: [
      { key: "leaveType", label: "Leave Type", type: "select", required: true },
      { key: "adjustmentDays", label: "Days to Add/Subtract", type: "number", required: true, helpText: "Use negative for deductions, e.g. -2" },
      { key: "reason", label: "Reason", type: "text", required: true, placeholder: "Carried over from previous year" },
      { key: "notifyEmployee", label: "Notify Employee", type: "boolean", default: true },
    ],
  },
  
  // TRAINING & DEVELOPMENT
  {
    id: "assign_training",
    name: "Assign Training Course",
    description: "Enroll employee in training → creates action item",
    category: "Training",
    icon: <GraduationCap className="w-4 h-4" />,
    fields: [
      { key: "courseId", label: "Course", type: "select", required: true },
      { key: "providerId", label: "Training Provider", type: "select" },
      { key: "dueDays", label: "Complete within (days)", type: "number", placeholder: "90" },
      { key: "notifyManager", label: "Notify Manager", type: "boolean", default: false },
    ],
  },
  {
    id: "schedule_review",
    name: "Schedule Performance Review",
    description: "Create a review task for manager → appears in Action Items",
    category: "Performance",
    icon: <Star className="w-4 h-4" />,
    fields: [
      { key: "reviewType", label: "Review Type", type: "select", options: [
        { value: "probation", label: "Probation Review" },
        { value: "30_day", label: "30-Day Check-in" },
        { value: "60_day", label: "60-Day Check-in" },
        { value: "90_day", label: "90-Day Check-in" },
        { value: "annual", label: "Annual Review" },
        { value: "mid_year", label: "Mid-Year Review" }
      ]},
      { key: "dueDays", label: "Schedule for (days)", type: "number", placeholder: "30" },
      { key: "assignToManager", label: "Assign to employee's manager", type: "boolean", default: true },
    ],
  },
  
  // PERMISSIONS & ACCESS
  {
    id: "update_permissions",
    name: "Update Permissions",
    description: "Change employee's permission profile or system access",
    category: "Security",
    icon: <Lock className="w-4 h-4" />,
    fields: [
      { key: "action", label: "Action", type: "select", required: true, options: [
        { value: "assign_profile", label: "Assign Permission Profile" },
        { value: "revoke_all", label: "Revoke All Access" }
      ]},
      { key: "permissionProfileId", label: "Permission Profile", type: "select", conditional: "action=assign_profile" },
      { key: "notifyEmployee", label: "Notify Employee of Change", type: "boolean", default: true },
    ],
  },
  
  // INTEGRATIONS
  {
    id: "webhook",
    name: "Call Webhook",
    description: "Trigger external system (Slack bot, Zapier, custom API)",
    category: "Integrations",
    icon: <LinkIcon className="w-4 h-4" />,
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "text", required: true, placeholder: "https://hooks.slack.com/services/..." },
      { key: "method", label: "HTTP Method", type: "select", options: [
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "PATCH", label: "PATCH" }
      ]},
      { key: "payloadTemplate", label: "JSON Payload", type: "textarea", placeholder: '{"text": "{{employeeName}} started today"}' },
      { key: "headers", label: "Custom Headers (JSON)", type: "textarea", placeholder: '{"Authorization": "Bearer xxx"}' },
    ],
  },
];

