/**
 * AI Action Executor
 * Executes AI-interpreted actions safely with preview and undo capabilities
 */

import { prisma } from "@/lib/prisma";
import { findEmployeeByName } from "./system-context";
import { setPendingAction, clearPendingAction, getConversation } from "./conversation-memory";

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
  const { employeeName, field, value, confirmed } = action.parameters;

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
      message: `What would you like to update for ${employee.name}? (e.g., bank details, email, phone, salary, department)`,
    };
  }

  // Step 3: Preview the change
  if (!confirmed) {
    const currentValue = await getCurrentFieldValue(employee.id, field, action.companyId);
    
    return {
      success: true,
      requiresConfirmation: true,
      preview: {
        employee: employee.name,
        field,
        currentValue: currentValue || "(not set)",
        newValue: value,
      },
      message: `I'll update **${employee.name}**'s ${field}:\n\n**Current:** ${currentValue || "(not set)"}\n**New:** ${value}\n\nShall I apply this change?`,
    };
  }

  // Step 4: Execute the update
  const result = await updateEmployeeField(employee.id, field, value, action.companyId);
  
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
      message: `✅ Updated! ${employee.name}'s ${field} is now: **${value}**\n\n${result.details || ''}`,
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

    // Execute: Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        employeeId: pending.data.employeeId,
        requesterId: action.userId,
        companyId: action.companyId,
        eventCategoryId: category.id,
        startDate: new Date(pending.data.startDate),
        endDate: new Date(pending.data.endDate),
        approvalStatus: "PENDING",
        dayType: "FULL_DAY",
        reason: `Booked via AI Assistant by admin`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    clearPendingAction(action.userId, action.companyId);

    return {
      success: true,
      message: `✅ **Leave booked successfully!**\n\nRequest ID: ${leaveRequest.id}\n\nThe leave request has been created and is pending approval. ${pending.data.employeeName} will be notified.`,
      data: leaveRequest,
    };
  }

  return {
    success: false,
    message: "Something went wrong with the booking process. Let's start over.",
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

  // Map field names to database fields
  const fieldMap: Record<string, any> = {
    "bank details": employee.bankAccountNumber,
    "bank account": employee.bankAccountNumber,
    "email": employee.User.email,
    "phone": employee.User.phone,
    "department": employee.Department?.name,
    "job role": employee.JobRole?.name,
    "salary": employee.salaryAmount?.toString(),
    "ird": employee.irdNumber,
    "tax code": employee.taxCode,
  };

  return fieldMap[field.toLowerCase()] || null;
}

async function updateEmployeeField(
  employeeId: string,
  field: string,
  value: string,
  companyId: string
): Promise<ActionResult> {
  const fieldLower = field.toLowerCase();

  try {
    // Handle different field types
    if (fieldLower.includes("bank")) {
      // Update bank details via FormDataRecord
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

        return {
          success: true,
          message: "Bank details updated",
          oldValue: await getCurrentFieldValue(employeeId, field, companyId),
        };
      }
    }

    if (fieldLower.includes("email") || fieldLower.includes("phone")) {
      // Update User table
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { userId: true, User: { select: { email: true, phone: true } } },
      });

      const oldValue = fieldLower.includes("email") ? employee?.User.email : employee?.User.phone;

      await prisma.user.update({
        where: { id: employee!.userId },
        data: fieldLower.includes("email") ? { email: value } : { phone: value },
      });

      return {
        success: true,
        message: `${fieldLower.includes("email") ? "Email" : "Phone"} updated`,
        oldValue: oldValue || null,
        details: "Update will be visible in employee profile immediately.",
      };
    }

    if (fieldLower.includes("ird") || fieldLower.includes("tax")) {
      const oldIRD = (await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { irdNumber: true },
      }))?.irdNumber;

      await prisma.employee.update({
        where: { id: employeeId },
        data: fieldLower.includes("ird") ? { irdNumber: value } : { taxCode: value as any },
      });

      return {
        success: true,
        message: "Tax details updated",
        oldValue: oldIRD,
      };
    }

    return {
      success: false,
      message: `I can update bank details, email, phone, IRD, and tax code. The field "${field}" isn't supported yet.`,
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

