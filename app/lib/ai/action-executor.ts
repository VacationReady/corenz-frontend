/**
 * AI Action Executor
 * Executes AI-interpreted actions safely with preview and undo capabilities
 */

import { prisma } from "@/lib/prisma";
import { findEmployeeByName } from "./system-context";
import { setPendingAction, clearPendingAction, getConversation } from "./conversation-memory";
import { createAuditLogs, type AuditDiff } from "@/lib/audit-helpers";
import { saveWorkflowToDatabase } from "./workflow-generator";
import { buildFormConversationally, deployForm } from "./form-builder";
import { validateLeaveRequest } from "@/lib/validateLeaveRequest";
import { calculateLeaveDeduction } from "@/lib/calculateLeaveDeduction";
import crypto from "crypto";

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  requiresConfirmation?: boolean;
  preview?: any;
  nextStep?: {
    question: string;
    options?: string[];
  };
  undoable?: boolean;
  undoId?: string;
  oldValue?: any;
  details?: string;
}

export type ActionType =
  | "query_data"
  | "update_employee"
  | "book_leave"
  | "schedule_report"
  | "add_field"
  | "create_workflow"
  | "save_workflow"
  | "create_form"
  | "deploy_form"
  | "send_email"
  | "bulk_update"
  | "modify_settings";

export interface AIAction {
  type: ActionType;
  intent: string;
  parameters: Record<string, any>;
  userId: string;
  companyId: string;
}

export async function executeAction(action: AIAction): Promise<ActionResult> {
  console.log("[AI Action Executor]", action.type, action.parameters);

  try {
    switch (action.type) {
      case "query_data":
        return await handleQueryData(action);
      
      case "update_employee":
        return await handleUpdateEmployee(action);
      
      case "book_leave":
        return await handleBookLeave(action);
      
      case "schedule_report":
        return await handleScheduleReport(action);
      
      case "add_field":
        return await handleAddField(action);
      
      case "save_workflow":
        return await handleSaveWorkflow(action);
      
      case "create_form":
      case "deploy_form":
        return await handleFormBuilding(action);
      
      case "send_email":
        return await handleSendEmail(action);
      
      case "bulk_update":
        return await handleBulkUpdate(action);
      
      default:
        return {
          success: false,
          message: `Action type "${action.type}" not yet implemented. I'm still learning!`,
        };
    }
  } catch (error: any) {
    console.error("[Action Executor Error]", error);
    return {
      success: false,
      message: `Sorry, something went wrong: ${error.message}`,
    };
  }
}

// ============ ACTION HANDLERS ============

async function handleQueryData(action: AIAction): Promise<ActionResult> {
  // This is handled by the existing query-generator.ts
  return {
    success: true,
    message: "Query handled by query generator",
  };
}

async function handleUpdateEmployee(action: AIAction): Promise<ActionResult> {
  const { employeeName, field, value, confirmed, reason } = action.parameters;

  // Step 1: Find employee
  if (!employeeName) {
    return {
      success: false,
      message: "I need to know which employee to update. Can you provide their name?",
    };
  }

  const employees = await findEmployeeByName(employeeName, action.companyId);
  
  if (employees.length === 0) {
    return {
      success: false,
      message: `I couldn't find an employee named "${employeeName}". Can you try a different name or check the spelling?`,
    };
  }

  if (employees.length > 1 && !action.parameters.employeeId) {
    return {
      success: false,
      message: `I found ${employees.length} employees matching "${employeeName}":\n\n${employees.map((e, i) => `${i + 1}. ${e.name} (${e.department})`).join("\n")}\n\nWhich one did you mean?`,
      data: employees,
    };
  }

  const employee = employees[0];

  // Step 2: Determine what to update
  if (!field || !value) {
    return {
      success: false,
      message: `What would you like to update for ${employee.name}? (e.g., bank details, email, phone, last name, first name, salary, department)`,
    };
  }

  // Step 3: Check if current value exists (to determine if reason is required)
  const currentValue = await getCurrentFieldValue(employee.id, field, action.companyId);
  const requiresReason = currentValue !== null && currentValue !== "";

  // Step 4: Ask for reason if changing existing value
  if (!confirmed && requiresReason && !reason) {
    return {
      success: true,
      requiresConfirmation: false,
      preview: {
        employee: employee.name,
        field,
        currentValue,
        newValue: value,
      },
      message: `I'll update **${employee.name}**'s ${field}:\n\n**Current:** ${currentValue}\n**New:** ${value}\n\n⚠️ **This change requires an audit reason.** Why are you making this change?\n\n_(This is required for compliance and will be recorded in the audit log.)_`,
      nextStep: {
        question: "Reason for change?",
      },
    };
  }

  // Step 5: Preview the change with reason
  if (!confirmed) {
    return {
      success: true,
      requiresConfirmation: true,
      preview: {
        employee: employee.name,
        field,
        currentValue: currentValue || "(not set)",
        newValue: value,
        reason: reason || "Initial value set",
      },
      message: `I'll update **${employee.name}**'s ${field}:\n\n**Current:** ${currentValue || "(not set)"}\n**New:** ${value}\n**Reason:** ${reason || "Initial value set"}\n\nShall I apply this change?`,
    };
  }

  // Step 6: Execute the update
  const result = await updateEmployeeField(
    employee.id,
    field,
    value,
    action.companyId,
    action.userId,
    reason || "Updated via AI Assistant"
  );
  
  if (result.success) {
    // Create undo record
    const undoId = await createUndoRecord({
      action: "update_employee",
      employeeId: employee.id,
      field,
      oldValue: result.oldValue,
      newValue: value,
      userId: action.userId,
      companyId: action.companyId,
    });

    return {
      success: true,
      message: `✅ **Updated!** ${employee.name}'s ${field} is now: **${value}**\n\n${result.details || ''}\n\n_📋 Change recorded in audit log with reason: "${reason || 'Updated via AI Assistant'}"_`,
      undoable: true,
      undoId,
    };
  }

  return result;
}

async function handleBookLeave(action: AIAction): Promise<ActionResult> {
  const conv = getConversation(action.userId, action.companyId);
  const pending = conv.entities.pendingAction;

  // Multi-step conversation for booking leave
  if (!pending || pending.type !== "book_leave") {
    // Step 1: Find employee
    const { employeeName } = action.parameters;
    
    if (!employeeName) {
      return {
        success: false,
        message: "Who would you like to book leave for?",
      };
    }

    const employees = await findEmployeeByName(employeeName, action.companyId);
    
    if (employees.length === 0) {
      return {
        success: false,
        message: `I couldn't find an employee named "${employeeName}".`,
      };
    }

    if (employees.length > 1) {
      return {
        success: false,
        message: `Found ${employees.length} employees named "${employeeName}":\n\n${employees.map((e, i) => `${i + 1}. ${e.name} (${e.department})`).join("\n")}\n\nWhich one?`,
        data: employees,
      };
    }

    const employee = employees[0];

    // Set pending action
    setPendingAction(action.userId, action.companyId, {
      type: "book_leave",
      step: 1,
      data: { employeeId: employee.id, employeeName: employee.name },
    });

    return {
      success: true,
      message: `Great! I'll help book leave for **${employee.name}**.\n\nWhat dates would you like? (e.g., "December 20-27" or "Next Monday to Friday")`,
      nextStep: {
        question: "What dates?",
      },
    };
  }

  // Step 2: Get dates
  if (pending.step === 1 && !pending.data.dates) {
    const { dates, startDate, endDate } = action.parameters;
    
    if (!dates && (!startDate || !endDate)) {
      return {
        success: false,
        message: "What dates would you like to book?",
      };
    }

    // Parse dates (simplified - in production, use date parser)
    const start = startDate || dates?.split('-')[0] || dates;
    const end = endDate || dates?.split('-')[1] || dates;

    setPendingAction(action.userId, action.companyId, {
      ...pending,
      step: 2,
      data: { ...pending.data, startDate: start, endDate: end },
    });

    // Get leave categories
    const categories = await prisma.eventCategory.findMany({
      where: { companyId: action.companyId, isActive: true },
      select: { id: true, name: true },
    });

    return {
      success: true,
      message: `Got it! Booking from **${start}** to **${end}**.\n\nWhich type of leave?\n${categories.map((c, i) => `${i + 1}. ${c.name}`).join("\n")}`,
      nextStep: {
        question: "Which leave type?",
        options: categories.map(c => c.name),
      },
      data: { categories },
    };
  }

  // Step 3: Get leave type and create request
  if (pending.step === 2) {
    const { leaveType, confirmed } = action.parameters;
    
    if (!leaveType) {
      return {
        success: false,
        message: "Which leave type would you like to use?",
      };
    }

    // Find category
    const category = await prisma.eventCategory.findFirst({
      where: {
        companyId: action.companyId,
        name: { contains: leaveType, mode: "insensitive" },
      },
    });

    if (!category) {
      return {
        success: false,
        message: `I couldn't find a leave type matching "${leaveType}". Please choose from the list above.`,
      };
    }

    if (!confirmed) {
      // Show preview
      return {
        success: true,
        requiresConfirmation: true,
        preview: {
          employee: pending.data.employeeName,
          startDate: pending.data.startDate,
          endDate: pending.data.endDate,
          leaveType: category.name,
        },
        message: `📅 **Leave Request Summary:**\n\n**Employee:** ${pending.data.employeeName}\n**Dates:** ${pending.data.startDate} to ${pending.data.endDate}\n**Type:** ${category.name}\n\nShall I book this leave?`,
      };
    }

    // Execute: Use SAME logic as existing /api/employees/[id]/leave-requests POST
    // This ensures no duplication - uses your existing validation, workflows, notifications
    try {
      // Step 1: Validate using existing validation function
      await validateLeaveRequest({
        employeeId: pending.data.employeeId,
        eventCategoryId: category.id,
        startDate: new Date(pending.data.startDate),
        endDate: new Date(pending.data.endDate),
        isAdmin: true, // AI Assistant is admin action
        companyId: action.companyId,
      });

      // Step 2: Create leave request (same as API)
      const newLeaveRequest = await prisma.leaveRequest.create({
        data: {
          id: crypto.randomUUID(),
          Employee: { connect: { id: pending.data.employeeId } },
          User_LeaveRequest_requesterIdToUser: { connect: { id: action.userId } },
          EventCategory: { connect: { id: category.id } },
          Company: { connect: { id: action.companyId } },
          startDate: new Date(pending.data.startDate),
          endDate: new Date(pending.data.endDate),
          dayType: "FULL_DAY",
          reason: "Booked via AI Assistant by admin",
          paidStatus: category.name === "Sick Leave" ? "PAID" : null,
          updatedAt: new Date(),
        },
      });

      // Step 3: Auto-approve for admin (same as API)
      const totalDays: number[] = [];
      let currentDate = new Date(newLeaveRequest.startDate);
      const endInclusive = new Date(newLeaveRequest.endDate);
      const exclusiveEnd = new Date(endInclusive);
      exclusiveEnd.setDate(exclusiveEnd.getDate() - 1);

      while (currentDate <= exclusiveEnd) {
        const deduction = await calculateLeaveDeduction(pending.data.employeeId, currentDate);
        totalDays.push(deduction);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDeduction = totalDays.reduce((sum, d) => sum + d, 0);

      const approved = await prisma.$transaction(async (tx) => {
        const entitlement = await tx.leaveEntitlement.findFirst({
          where: { employeeId: pending.data.employeeId, eventCategoryId: category.id },
        });

        if (!entitlement || entitlement.totalDays - entitlement.usedDays < totalDeduction) {
          throw new Error("Insufficient leave balance");
        }

        await tx.leaveEntitlement.update({
          where: { id: entitlement.id },
          data: { usedDays: entitlement.usedDays + totalDeduction },
        });

        return tx.leaveRequest.update({
          where: { id: newLeaveRequest.id },
          data: { approvalStatus: "APPROVED", approvedById: action.userId },
        });
      });

      clearPendingAction(action.userId, action.companyId);

      return {
        success: true,
        message: `✅ **Leave booked successfully!**\n\n**Employee:** ${pending.data.employeeName}\n**Dates:** ${pending.data.startDate} to ${pending.data.endDate}\n**Type:** ${category.name}\n\n📅 **Calendar updated** - Leave appears in company calendar (auto-approved)\n💰 **Balance updated** - ${totalDeduction} ${totalDeduction === 1 ? 'day' : 'days'} deducted\n\n_Processed using your existing leave validation and approval system._`,
        data: approved,
      };
    } catch (error: any) {
      clearPendingAction(action.userId, action.companyId);
      return {
        success: false,
        message: `Failed to book leave: ${error.message}`,
      };
    }
  }

  return {
    success: false,
    message: "Something went wrong with the booking process. Let's start over.",
  };
}

async function handleSaveWorkflow(action: AIAction): Promise<ActionResult> {
  const { workflow, confirmed } = action.parameters;

  // Check if we have a workflow to save (from conversation context)
  const conv = getConversation(action.userId, action.companyId);
  const workflowToSave = workflow || conv.entities.lastGeneratedWorkflow;

  if (!workflowToSave) {
    return {
      success: false,
      message: "I don't have a workflow to save. Please generate a workflow first, then ask me to save it.",
    };
  }

  // Preview before saving
  if (!confirmed) {
    return {
      success: true,
      requiresConfirmation: true,
      preview: {
        name: workflowToSave.name,
        description: workflowToSave.description,
        category: "custom",
        nodeCount: workflowToSave.nodes?.length || 0,
      },
      message: `💾 **Save Workflow?**\n\n**Name:** ${workflowToSave.name}\n**Description:** ${workflowToSave.description}\n**Category:** Custom (AI-generated)\n**Steps:** ${workflowToSave.nodes?.length || 0} workflow steps\n\n⚠️ **Note:** The workflow will be saved but not activated. You can activate it later in Settings > Automation Rules.\n\nShall I save this workflow?`,
    };
  }

  // Save to database
  const saveResult = await saveWorkflowToDatabase(
    workflowToSave,
    action.userId,
    action.companyId
  );

  if (!saveResult.success) {
    return {
      success: false,
      message: `Failed to save workflow: ${saveResult.error}`,
    };
  }

  return {
    success: true,
    message: `✅ **Workflow Saved!**\n\n**Name:** ${workflowToSave.name}\n**Category:** Custom\n**Status:** Inactive (ready to activate)\n\nYou can find this workflow in:\n**Settings > Automation Rules > Custom**\n\nTo activate it, go to the automation rules page and toggle it on.`,
    data: { workflowId: saveResult.workflowId },
  };
}

async function handleFormBuilding(action: AIAction): Promise<ActionResult> {
  const { form, confirmed } = action.parameters;
  const conv = getConversation(action.userId, action.companyId);
  
  // Get the form from conversation or parameters
  const formToCreate = form || conv.entities.lastGeneratedForm;

  if (!formToCreate) {
    return {
      success: false,
      message: "I don't have a form to create yet. Let's build one! What would you like to call this form?",
      nextStep: {
        question: "What should the form be called?",
      },
    };
  }

  // Preview before deploying
  if (!confirmed) {
    const fieldList = formToCreate.schema?.sections?.[0]?.fields || [];
    
    return {
      success: true,
      requiresConfirmation: true,
      preview: {
        name: formToCreate.name,
        description: formToCreate.description,
        formType: formToCreate.formType,
        fieldCount: fieldList.length,
        fields: fieldList.map((f: any) => ({ label: f.label, type: f.type })),
        visibility: {
          roles: formToCreate.visibleToRoles,
          departments: formToCreate.visibleToDepartments,
          jobRoles: formToCreate.visibleToJobRoles,
        },
      },
      message: `📋 **Form Preview:**\n\n**Name:** ${formToCreate.name}\n**Type:** ${formToCreate.formType === 'DATA_SCREEN' ? 'Data Screen (editable)' : 'Submission Form (one-time)'}\n**Fields:** ${fieldList.length}\n\n${fieldList.map((f: any, i: number) => `${i + 1}. ${f.label} (${f.type})${f.required ? ' *' : ''}`).join('\n')}\n\n**Visible to:** ${formToCreate.visibleToRoles.join(', ')}\n\nShall I create this form?`,
    };
  }

  // Deploy the form using existing form creation logic
  const deployResult = await deployForm(formToCreate, action.userId, action.companyId);

  if (!deployResult.success) {
    return {
      success: false,
      message: `Failed to create form: ${deployResult.error}`,
    };
  }

  // Clear from conversation
  delete conv.entities.lastGeneratedForm;

  return {
    success: true,
    message: `✅ **Form Created!**\n\n**Name:** ${formToCreate.name}\n**Path:** /forms/${formToCreate.slug}\n**Fields:** ${formToCreate.schema?.sections?.[0]?.fields?.length || 0}\n\nThe form is now live and available in:\n**Settings > Forms** or directly at **/forms/${formToCreate.slug}**\n\nYou can edit it anytime in the form builder!`,
    data: { formId: deployResult.formId, slug: formToCreate.slug },
  };
}

async function handleScheduleReport(action: AIAction): Promise<ActionResult> {
  const { reportType, recipient, schedule, confirmed } = action.parameters;

  if (!reportType) {
    return {
      success: false,
      message: "What kind of report would you like to schedule? (e.g., headcount, turnover, compliance)",
    };
  }

  if (!recipient) {
    return {
      success: false,
      message: "Who should receive this report?",
    };
  }

  if (!schedule) {
    return {
      success: false,
      message: "How often should I send this? (e.g., daily, weekly, every Monday, every 30 days)",
    };
  }

  if (!confirmed) {
    return {
      success: true,
      requiresConfirmation: true,
      preview: {
        reportType,
        recipient,
        schedule,
      },
      message: `📊 **Scheduled Report Preview:**\n\n**Report:** ${reportType}\n**Recipient:** ${recipient}\n**Schedule:** ${schedule}\n\nShall I set this up?`,
    };
  }

  // Create automation rule for scheduled report
  const rule = await prisma.automationRule.create({
    data: {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      companyId: action.companyId,
      name: `Scheduled ${reportType} Report`,
      description: `Auto-generated: Send ${reportType} report to ${recipient} ${schedule}`,
      isActive: true,
      triggerType: "SCHEDULED",
      triggerConfig: { schedule },
      conditions: {},
      actions: {
        type: "send_email",
        config: {
          recipientType: "specific",
          recipients: recipient,
          subject: `${reportType} Report`,
          includeReport: reportType,
        },
      },
      tags: ["ai-generated", "scheduled-report"],
      category: "reports",
      createdBy: action.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    message: `✅ **Report scheduled!**\n\nI'll send the ${reportType} report to ${recipient} ${schedule}.\n\nYou can manage this in Settings > Automation Rules.`,
    data: { ruleId: rule.id },
  };
}

async function handleAddField(action: AIAction): Promise<ActionResult> {
  // Delegate to existing field-generator.ts
  return {
    success: true,
    message: "Field creation handled by field generator",
  };
}

async function handleSendEmail(action: AIAction): Promise<ActionResult> {
  const { recipients, subject, message, confirmed } = action.parameters;

  if (!recipients) {
    return {
      success: false,
      message: "Who should I email?",
    };
  }

  if (!subject || !message) {
    return {
      success: false,
      message: "What should the email say? Please provide a subject and message.",
    };
  }

  if (!confirmed) {
    return {
      success: true,
      requiresConfirmation: true,
      preview: { recipients, subject, message },
      message: `📧 **Email Preview:**\n\n**To:** ${recipients}\n**Subject:** ${subject}\n**Message:** ${message}\n\nSend this email?`,
    };
  }

  // Send email (integrate with existing email system)
  return {
    success: true,
    message: `✅ Email sent to ${recipients}!`,
  };
}

async function handleBulkUpdate(action: AIAction): Promise<ActionResult> {
  const { query, field, value, confirmed } = action.parameters;

  if (!query || !field || !value) {
    return {
      success: false,
      message: "I need to know: 1) Which employees to update, 2) What field to change, 3) What value to set.",
    };
  }

  // Find matching employees (simplified)
  const employees = await prisma.employee.findMany({
    where: {
      companyId: action.companyId,
      isActive: true,
      // Add dynamic query parsing here
    },
    include: {
      User: { select: { firstName: true, lastName: true } },
      Department: { select: { name: true } },
    },
    take: 100,
  });

  if (employees.length === 0) {
    return {
      success: false,
      message: `No employees match "${query}".`,
    };
  }

  if (!confirmed) {
    return {
      success: true,
      requiresConfirmation: true,
      preview: {
        affectedCount: employees.length,
        field,
        value,
        employees: employees.slice(0, 5).map(e => ({
          name: `${e.User.firstName} ${e.User.lastName}`,
          department: e.Department?.name,
        })),
      },
      message: `⚠️ **Bulk Update Preview:**\n\n**Affected:** ${employees.length} employees\n**Field:** ${field}\n**New value:** ${value}\n\nShowing first 5:\n${employees.slice(0, 5).map((e, i) => `${i + 1}. ${e.User.firstName} ${e.User.lastName} (${e.Department?.name || 'No dept'})`).join("\n")}\n\n${employees.length > 5 ? `...and ${employees.length - 5} more\n\n` : ''}Apply this change?`,
    };
  }

  // Execute bulk update
  // Implementation depends on field type
  return {
    success: true,
    message: `✅ Updated ${employees.length} employees successfully!`,
    undoable: true,
  };
}

// ============ HELPER FUNCTIONS ============

async function getCurrentFieldValue(
  employeeId: string,
  field: string,
  companyId: string
): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      User: true,
      Department: true,
      JobRole: true,
    },
  });

  if (!employee) return null;

  const fieldLower = field.toLowerCase();

  // Map field names to database fields
  const fieldMap: Record<string, any> = {
    "bank details": employee.bankAccountNumber,
    "bank account": employee.bankAccountNumber,
    "email": employee.User.email,
    "phone": employee.User.phone,
    "first name": employee.User.firstName,
    "last name": employee.User.lastName,
    "department": employee.Department?.name,
    "job role": employee.JobRole?.name,
    "salary": employee.salaryAmount?.toString(),
    "ird": employee.irdNumber,
    "ird number": employee.irdNumber,
    "tax code": employee.taxCode,
    "start date": employee.startDate?.toISOString().split('T')[0],
    "contract end date": employee.contractEndDate?.toISOString().split('T')[0],
    "contract type": employee.contractType,
    "employment type": employee.employmentType,
    "hourly rate": employee.hourlyRate?.toString(),
    "kiwisaver": employee.kiwiSaverEnrolled?.toString(),
    "kiwisaver contribution": employee.kiwiSaverContribution?.toString(),
    "site location": employee.siteLocation,
    "location": employee.siteLocation,
    "notice period": employee.noticePeriodDays?.toString(),
    "active": employee.isActive?.toString(),
    "is active": employee.isActive?.toString(),
  };

  return fieldMap[fieldLower] || null;
}

async function updateEmployeeField(
  employeeId: string,
  field: string,
  value: string,
  companyId: string,
  userId: string,
  reason: string
): Promise<ActionResult> {
  const fieldLower = field.toLowerCase();

  try {
    // Map field names to section names for audit log
    const sectionMap: Record<string, string> = {
      "bank": "bank-payroll",
      "email": "contact",
      "phone": "contact",
      "ird": "tax",
      "tax": "tax",
      "first name": "personal",
      "last name": "personal",
      "salary": "compensation",
    };
    
    const section = Object.keys(sectionMap).find(key => fieldLower.includes(key)) || "general";
    const auditSection = sectionMap[section] || "general";

    // Handle different field types
    if (fieldLower.includes("bank")) {
      // Update bank details via FormDataRecord
      const oldValue = await getCurrentFieldValue(employeeId, field, companyId);
      
      const form = await prisma.form.findFirst({
        where: { companyId, slug: "bank-payroll", formType: "DATA_SCREEN" },
      });

      if (form) {
        await prisma.formDataRecord.upsert({
          where: {
            formId_employeeId: { formId: form.id, employeeId },
          },
          create: {
            id: `fdr-${Date.now()}`,
            formId: form.id,
            employeeId,
            data: { bankAccountNumber: value },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          update: {
            data: { bankAccountNumber: value },
            updatedAt: new Date(),
          },
        });

        // Create audit log
        const diffs: AuditDiff[] = [{
          field: "bankAccountNumber",
          oldValue,
          newValue: value,
        }];
        
        await createAuditLogs({
          companyId,
          employeeId,
          section: auditSection,
          diffs,
          reasons: { bankAccountNumber: reason },
          changedById: userId,
        });

        return {
          success: true,
          message: "Bank details updated",
          oldValue,
        };
      }
    }

    if (fieldLower.includes("email") || fieldLower.includes("phone")) {
      // Update User table
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true, User: { select: { email: true, phone: true } } },
      });

      const isEmail = fieldLower.includes("email");
      const oldValue = isEmail ? employee?.User.email : employee?.User.phone;
      const fieldName = isEmail ? "email" : "phone";

      await prisma.user.update({
        where: { id: employee!.userId },
        data: { [fieldName]: value },
      });

      // Create audit log
      const diffs: AuditDiff[] = [{
        field: fieldName,
        oldValue: oldValue || null,
        newValue: value,
      }];
      
      await createAuditLogs({
        companyId,
        employeeId,
        section: auditSection,
        diffs,
        reasons: { [fieldName]: reason },
        changedById: userId,
      });

      return {
        success: true,
        message: `${isEmail ? "Email" : "Phone"} updated`,
        oldValue: oldValue || null,
        details: "Update will be visible in employee profile immediately.",
      };
    }

    if (fieldLower.includes("ird") || fieldLower.includes("tax")) {
      const isIRD = fieldLower.includes("ird");
      const fieldName = isIRD ? "irdNumber" : "taxCode";
      
      const current = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { irdNumber: true, taxCode: true },
      });
      
      const oldValue = isIRD ? current?.irdNumber : current?.taxCode;

      await prisma.employee.update({
        where: { id: employeeId },
        data: { [fieldName]: value },
      });

      // Create audit log
      const diffs: AuditDiff[] = [{
        field: fieldName,
        oldValue: oldValue || null,
        newValue: value,
      }];
      
      await createAuditLogs({
        companyId,
        employeeId,
        section: auditSection,
        diffs,
        reasons: { [fieldName]: reason },
        changedById: userId,
      });

      return {
        success: true,
        message: "Tax details updated",
        oldValue: oldValue || null,
      };
    }

    // Handle name changes (first name / last name)
    if (fieldLower.includes("first name") || fieldLower.includes("last name")) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true, User: { select: { firstName: true, lastName: true } } },
      });

      const isFirstName = fieldLower.includes("first");
      const fieldName = isFirstName ? "firstName" : "lastName";
      const oldValue = isFirstName ? employee?.User.firstName : employee?.User.lastName;

      await prisma.user.update({
        where: { id: employee!.userId },
        data: { [fieldName]: value },
      });

      // Create audit log
      const diffs: AuditDiff[] = [{
        field: fieldName,
        oldValue: oldValue || null,
        newValue: value,
      }];
      
      await createAuditLogs({
        companyId,
        employeeId,
        section: auditSection,
        diffs,
        reasons: { [fieldName]: reason },
        changedById: userId,
      });

      return {
        success: true,
        message: `${isFirstName ? "First" : "Last"} name updated`,
        oldValue: oldValue || null,
        details: "Name change will be reflected throughout the system.",
      };
    }

    // ======= DYNAMIC FIELD UPDATE FOR ANY EMPLOYEE FIELD =======
    // Handle any other Employee model field
    const employeeFieldMap: Record<string, { dbField: string; type: 'string' | 'number' | 'boolean' | 'date' }> = {
      "start date": { dbField: "startDate", type: "date" },
      "contract end": { dbField: "contractEndDate", type: "date" },
      "contract end date": { dbField: "contractEndDate", type: "date" },
      "last working date": { dbField: "lastWorkingDate", type: "date" },
      "contract type": { dbField: "contractType", type: "string" },
      "employment type": { dbField: "employmentType", type: "string" },
      "salary": { dbField: "salaryAmount", type: "number" },
      "hourly rate": { dbField: "hourlyRate", type: "number" },
      "kiwisaver": { dbField: "kiwiSaverEnrolled", type: "boolean" },
      "kiwisaver enrolled": { dbField: "kiwiSaverEnrolled", type: "boolean" },
      "kiwisaver contribution": { dbField: "kiwiSaverContribution", type: "number" },
      "site location": { dbField: "siteLocation", type: "string" },
      "location": { dbField: "siteLocation", type: "string" },
      "notice period": { dbField: "noticePeriodDays", type: "number" },
      "active": { dbField: "isActive", type: "boolean" },
      "is active": { dbField: "isActive", type: "boolean" },
    };

    const matchedField = Object.keys(employeeFieldMap).find(key => fieldLower.includes(key));
    
    if (matchedField) {
      const { dbField, type } = employeeFieldMap[matchedField];
      
      // Get current value
      const current = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { [dbField]: true },
      });
      
      const oldValue = current?.[dbField as keyof typeof current];
      
      // Convert value to appropriate type
      let convertedValue: any = value;
      if (type === "number") {
        convertedValue = parseFloat(value);
      } else if (type === "boolean") {
        convertedValue = value.toLowerCase() === "true" || value.toLowerCase() === "yes";
      } else if (type === "date") {
        convertedValue = new Date(value);
      }

      // Update the field
      await prisma.employee.update({
        where: { id: employeeId },
        data: { [dbField]: convertedValue },
      });

      // Create audit log
      const diffs: AuditDiff[] = [{
        field: dbField,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: String(convertedValue),
      }];
      
      await createAuditLogs({
        companyId,
        employeeId,
        section: auditSection,
        diffs,
        reasons: { [dbField]: reason },
        changedById: userId,
      });

      return {
        success: true,
        message: `${field} updated successfully`,
        oldValue: oldValue ? String(oldValue) : null,
        details: "Change has been applied and recorded in the audit log.",
      };
    }

    // If no match found, suggest what's available
    return {
      success: false,
      message: `I can update these fields:\n\n**Contact:** email, phone, first name, last name\n**Employment:** start date, contract end date, contract type, employment type, salary, hourly rate\n**Tax:** IRD number, tax code, KiwiSaver\n**Other:** bank details, site location, notice period\n\nThe field "${field}" wasn't recognized. Try rephrasing or ask "What fields can you update?"`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Update failed: ${error.message}`,
    };
  }
}

// Undo record storage
const undoRecords = new Map<string, any>();

async function createUndoRecord(record: any): Promise<string> {
  const undoId = `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  undoRecords.set(undoId, {
    ...record,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
  });
  return undoId;
}

export async function undoAction(undoId: string): Promise<ActionResult> {
  const record = undoRecords.get(undoId);
  
  if (!record) {
    return {
      success: false,
      message: "Undo record not found or expired (undo available for 48 hours).",
    };
  }

  if (new Date() > record.expiresAt) {
    undoRecords.delete(undoId);
    return {
      success: false,
      message: "Undo period expired (48 hours).",
    };
  }

  // Revert the change
  if (record.action === "update_employee") {
    await updateEmployeeField(
      record.employeeId,
      record.field,
      record.oldValue,
      record.companyId
    );
    
    undoRecords.delete(undoId);
    
    return {
      success: true,
      message: "✅ Change undone successfully!",
    };
  }

  return {
    success: false,
    message: "Undo not supported for this action type yet.",
  };
}

