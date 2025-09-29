export {}

import { type HRReportField, hrReportFields } from "@/lib/hrReportFields";
import type { ReportFilter, SortConfig } from "@/lib/reportFilters";

export interface ReportLibraryEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  engine: "dynamic" | "custom";
  defaultFields: string[];
  suggestedFilters?: ReportFilter[];
  defaultSort?: SortConfig;
  reportType?: string;
}

export const reportLibrary: ReportLibraryEntry[] = [
  {
    id: "annual-leave-balances",
    name: "Annual Leave Balances",
    description:
      "Current balances by employee, including carryover and remaining entitlement.",
    category: "time-off",
    icon: "🌴",
    engine: "custom",
    defaultFields: [
      "Employee.User.firstName",
      "Employee.User.lastName",
      "Employee.Department.name",
      "Employee.JobRole.name",
      "LeaveEntitlement.EventCategory.name",
      "LeaveEntitlement.totalDays",
      "LeaveEntitlement.usedDays",
      "LeaveEntitlement.carryoverDays",
      "_computed.remainingEntitlement",
    ],
    suggestedFilters: [
      { field: "Employee.isActive", operator: "equals", value: true },
    ],
    defaultSort: { field: "_computed.remainingEntitlement", direction: "asc" },
    reportType: "annualLeaveBalances",
  },
  {
    id: "on-leave-today",
    name: "Staff on Leave Today",
    description:
      "Approved leave requests that cover today, with employee and department context.",
    category: "time-off",
    icon: "📆",
    engine: "dynamic",
    defaultFields: [
      "LeaveRequest.Employee.User.firstName",
      "LeaveRequest.Employee.User.lastName",
      "LeaveRequest.Employee.Department.name",
      "LeaveRequest.EventCategory.name",
      "LeaveRequest.startDate",
      "LeaveRequest.endDate",
      "_computed.durationDays",
      "LeaveRequest.approvalStatus",
    ],
    suggestedFilters: [
      { field: "LeaveRequest.approvalStatus", operator: "equals", value: "APPROVED" },
      { field: "LeaveRequest.startDate", operator: "date_before", value: new Date().toISOString() },
      { field: "LeaveRequest.endDate", operator: "date_after", value: new Date().toISOString() },
    ],
    defaultSort: { field: "LeaveRequest.startDate", direction: "asc" },
  },
  {
    id: "upcoming-leave",
    name: "Upcoming Leave (30 days)",
    description: "Future approved leave in the next 30 days for roster planning.",
    category: "time-off",
    icon: "🗓️",
    engine: "dynamic",
    defaultFields: [
      "LeaveRequest.Employee.User.firstName",
      "LeaveRequest.Employee.User.lastName",
      "LeaveRequest.Employee.Department.name",
      "LeaveRequest.EventCategory.name",
      "LeaveRequest.startDate",
      "LeaveRequest.endDate",
      "_computed.durationDays",
      "LeaveRequest.approvalStatus",
    ],
    suggestedFilters: [
      { field: "LeaveRequest.approvalStatus", operator: "equals", value: "APPROVED" },
      {
        field: "LeaveRequest.startDate",
        operator: "date_in_next",
        value: { amount: 30, unit: "days" },
      },
    ],
    defaultSort: { field: "LeaveRequest.startDate", direction: "asc" },
  },
  {
    id: "pending-leave-approvals",
    name: "Pending Leave Approvals",
    description:
      "Leave requests waiting on approval, including requester and approver details.",
    category: "time-off",
    icon: "🛠️",
    engine: "dynamic",
    defaultFields: [
      "LeaveRequest.Employee.User.firstName",
      "LeaveRequest.Employee.User.lastName",
      "LeaveRequest.Employee.Department.name",
      "LeaveRequest.EventCategory.name",
      "LeaveRequest.startDate",
      "LeaveRequest.endDate",
      "LeaveRequest.approvalStatus",
      "_computed.requesterFullName",
      "_computed.approverFullName",
    ],
    suggestedFilters: [
      { field: "LeaveRequest.approvalStatus", operator: "equals", value: "PENDING" },
    ],
    defaultSort: { field: "LeaveRequest.createdAt", direction: "asc" },
  },
  {
    id: "low-leave-balances",
    name: "Low Leave Balances",
    description: "Employees with 2 days or fewer remaining leave entitlement.",
    category: "time-off",
    icon: "⚠️",
    engine: "custom",
    defaultFields: [
      "Employee.User.firstName",
      "Employee.User.lastName",
      "Employee.Department.name",
      "Employee.JobRole.name",
      "LeaveEntitlement.EventCategory.name",
      "LeaveEntitlement.totalDays",
      "LeaveEntitlement.usedDays",
      "LeaveEntitlement.carryoverDays",
      "_computed.remainingEntitlement",
    ],
    suggestedFilters: [
      { field: "Employee.isActive", operator: "equals", value: true },
    ],
    defaultSort: { field: "_computed.remainingEntitlement", direction: "asc" },
    reportType: "annualLeaveBalances",
  },
  {
    id: "sick-leave-usage",
    name: "Sick Leave Usage YTD",
    description:
      "Total sick leave days taken per employee in the current calendar year.",
    category: "time-off",
    icon: "🤒",
    engine: "custom",
    defaultFields: [
      "Employee.User.firstName",
      "Employee.User.lastName",
      "Employee.Department.name",
      "Employee.JobRole.name",
      "sickLeaveTaken",
    ],
    suggestedFilters: [
      { field: "Employee.isActive", operator: "equals", value: true },
    ],
    defaultSort: { field: "sickLeaveTaken", direction: "desc" },
    reportType: "sickLeaveUsageYTD",
  },
  {
    id: "new-starters",
    name: "New Starters (Next 30 days)",
    description: "Employees starting soon to support onboarding planning.",
    category: "employment",
    icon: "✨",
    engine: "dynamic",
    defaultFields: [
      "Employee.User.firstName",
      "Employee.User.lastName",
      "Employee.User.email",
      "Employee.Department.name",
      "Employee.JobRole.name",
      "Employee.startDate",
    ],
    suggestedFilters: [
      {
        field: "Employee.startDate",
        operator: "date_in_next",
        value: { amount: 30, unit: "days" },
      },
      { field: "Employee.isActive", operator: "equals", value: true },
    ],
    defaultSort: { field: "Employee.startDate", direction: "asc" },
  },
  {
    id: "missing-payroll-details",
    name: "Missing Payroll Details",
    description: "Employees missing IRD or bank details for payroll readiness.",
    category: "compensation",
    icon: "💳",
    engine: "dynamic",
    defaultFields: [
      "Employee.User.firstName",
      "Employee.User.lastName",
      "Employee.User.email",
      "Employee.Department.name",
      "Employee.JobRole.name",
      "Employee.irdNumber",
      "Employee.bankAccountNumber",
    ],
    suggestedFilters: [
      { field: "Employee.isActive", operator: "equals", value: true },
      { field: "Employee.irdNumber", operator: "is_null" },
    ],
    defaultSort: { field: "Employee.Department.name", direction: "asc" },
  },
  {
    id: "kiwisaver-summary",
    name: "KiwiSaver Summary",
    description: "Shows who is enrolled in KiwiSaver and their contribution rates.",
    category: "compensation",
    icon: "🥝",
    engine: "dynamic",
    defaultFields: [
      "Employee.User.firstName",
      "Employee.User.lastName",
      "Employee.User.email",
      "Employee.Department.name",
      "Employee.JobRole.name",
      "Employee.kiwiSaverEnrolled",
      "Employee.kiwiSaverContribution",
    ],
    suggestedFilters: [
      { field: "Employee.isActive", operator: "equals", value: true },
    ],
    defaultSort: { field: "Employee.Department.name", direction: "asc" },
  },
  {
    id: "right-to-work-expiries",
    name: "Right to Work Expiries",
    description: "Employment check expiries in the next 90 days for visa compliance.",
    category: "documents",
    icon: "🛂",
    engine: "dynamic",
    defaultFields: [
      "EmploymentCheck.Employee.User.firstName",
      "EmploymentCheck.Employee.User.lastName",
      "EmploymentCheck.Employee.Department.name",
      "EmploymentCheck.typeOfCheck",
      "EmploymentCheck.documentNumber",
      "EmploymentCheck.expiryDate",
      "EmploymentCheck.documentUrl",
    ],
    suggestedFilters: [
      {
        field: "EmploymentCheck.expiryDate",
        operator: "date_in_next",
        value: { amount: 90, unit: "days" },
      },
    ],
    defaultSort: { field: "EmploymentCheck.expiryDate", direction: "asc" },
  },
  {
    id: "driver-licence-expiries",
    name: "Driver Licence Expiries",
    description: "Upcoming driver licence expiries for safety-critical roles.",
    category: "documents",
    icon: "🚗",
    engine: "dynamic",
    defaultFields: [
      "DriverLicence.Employee.User.firstName",
      "DriverLicence.Employee.User.lastName",
      "DriverLicence.Employee.Department.name",
      "DriverLicence.type",
      "DriverLicence.licenceNumber",
      "DriverLicence.expiryDate",
    ],
    suggestedFilters: [
      {
        field: "DriverLicence.expiryDate",
        operator: "date_in_next",
        value: { amount: 90, unit: "days" },
      },
    ],
    defaultSort: { field: "DriverLicence.expiryDate", direction: "asc" },
  },
  {
    id: "training-expiries",
    name: "Training Expiries",
    description: "Training records expiring soon to keep compliance on track.",
    category: "performance",
    icon: "🎓",
    engine: "dynamic",
    defaultFields: [
      "TrainingRecord.Employee.User.firstName",
      "TrainingRecord.Employee.User.lastName",
      "TrainingRecord.Employee.Department.name",
      "Course.name",
      "TrainingRecord.dateCompleted",
      "TrainingRecord.expiryDate",
      "TrainingProvider.name",
    ],
    suggestedFilters: [
      {
        field: "TrainingRecord.expiryDate",
        operator: "date_in_next",
        value: { amount: 90, unit: "days" },
      },
    ],
    defaultSort: { field: "TrainingRecord.expiryDate", direction: "asc" },
  },
  {
    id: "department-roster",
    name: "Department Roster",
    description: "Active employees with department, job role, contact, and pattern.",
    category: "employment",
    icon: "🏢",
    engine: "dynamic",
    defaultFields: [
      "Employee.User.firstName",
      "Employee.User.lastName",
      "Employee.User.email",
      "Employee.User.phone",
      "Employee.Department.name",
      "Employee.JobRole.name",
      "Employee.isActive",
      "Employee.startDate",
      "WorkingPattern.name",
    ],
    suggestedFilters: [
      { field: "Employee.isActive", operator: "equals", value: true },
    ],
    defaultSort: { field: "Employee.Department.name", direction: "asc" },
  },
  {
    id: "headcount-by-department",
    name: "Headcount by Department",
    description: "Active headcount totals by department for snapshot reporting.",
    category: "employment",
    icon: "📊",
    engine: "custom",
    defaultFields: [
      "departmentName",
      "headcount",
      "activeHeadcount",
    ],
    defaultSort: { field: "headcount", direction: "desc" },
    reportType: "headcountByDepartment",
  },
  {
    id: "offboarding-pipeline",
    name: "Offboarding Pipeline",
    description: "Employees in offboarding with key steps and dates.",
    category: "offboarding",
    icon: "🚪",
    engine: "dynamic",
    defaultFields: [
      "EmployeeOffboarding.Employee.User.firstName",
      "EmployeeOffboarding.Employee.User.lastName",
      "EmployeeOffboarding.status",
      "EmployeeOffboarding.lastWorkingDate",
      "EmployeeOffboarding.offboardingReason",
      "EmployeeOffboarding.assetsReturned",
      "EmployeeOffboarding.handoverCompleted",
      "EmployeeOffboarding.accessRemovedAt",
    ],
    suggestedFilters: [
      { field: "EmployeeOffboarding.status", operator: "not_equals", value: "COMPLETED" },
    ],
    defaultSort: { field: "EmployeeOffboarding.lastWorkingDate", direction: "asc" },
  },
];

export function getReportLibrary() {
  return reportLibrary;
}

export function resolveFields(fieldKeys: string[]): HRReportField[] {
  return fieldKeys
    .map((key) => hrReportFields.find((field) => field.field === key))
    .filter((field): field is HRReportField => Boolean(field));
}

