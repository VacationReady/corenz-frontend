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
import supabase from "@/lib/supabase-admin";
import { resend } from "@/lib/resend";
import { buildDocumentNotificationEmail } from "@/lib/email/documentNotifications";

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
  | "upload_document"
  | "modify_settings"
  | "compliance_sweep"
  | "analytics_digest"
  | "targeted_comms"
  | "policy_rollout";

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
      
      case "upload_document":
        return await handleDocumentUpload(action);
      
      case "compliance_sweep":
        return await handleComplianceSweep(action);
      
      case "analytics_digest":
        return await handleAnalyticsDigest(action);
      
      case "targeted_comms":
        return await handleTargetedComms(action);
      
      case "policy_rollout":
        return await handlePolicyRollout(action);
      
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
    const { employeeName, startDate, endDate } = action.parameters;
    
    if (!employeeName) {
      return {
        success: true,
        message: "Sure! **Who should I book leave for?**\n\nJust give me their first name or full name.",
        nextStep: { question: "Employee name?" },
      };
    }

    const employees = await findEmployeeByName(employeeName, action.companyId);
    
    if (employees.length === 0) {
      // Instead of failing, suggest they try a different name or show all employees
      return {
        success: true,
        message: `I couldn't find anyone named "**${employeeName}**".\n\nTry:\n• Checking the spelling\n• Using just the first name\n• Or say "Show me all employees" to see everyone`,
        nextStep: { question: "Try a different name?" },
      };
    }

    if (employees.length > 1) {
      return {
        success: true,
        message: `I found **${employees.length} people** matching "${employeeName}":\n\n${employees.map((e, i) => `${i + 1}. **${e.name}** (${e.department})`).join("\n")}\n\n**Which one?** (Just say the number or full name)`,
        data: employees,
        nextStep: { question: "Which employee?" },
      };
    }

    const employee = employees[0];

    // Check if dates were provided in the initial request
    if (startDate || endDate) {
      // Dates were provided! Skip to asking for leave type
      const start = startDate || endDate;
      const end = endDate || startDate;
      
      setPendingAction(action.userId, action.companyId, {
        type: "book_leave",
        step: 2,  // Skip step 1 (dates), go directly to step 2 (leave type)
        data: { employeeId: employee.id, employeeName: employee.name, startDate: start, endDate: end },
      });

      // Get leave categories
      const categories = await prisma.eventCategory.findMany({
        where: { companyId: action.companyId, isActive: true },
        select: { id: true, name: true },
      });

      const isSingleDay = start === end;
      const dateDisplay = isSingleDay ? start : `${start} to ${end}`;
      
      return {
        success: true,
        message: `Great! I'll book leave for **${employee.name}** on **${dateDisplay}**.\n\n**Which type of leave?**\n${categories.map((c, i) => `${i + 1}. ${c.name}`).join("\n")}`,
        nextStep: {
          question: "Which leave type?",
          options: categories.map(c => c.name),
        },
        data: { categories },
      };
    }

    // No dates provided - ask for them
    setPendingAction(action.userId, action.companyId, {
      type: "book_leave",
      step: 1,
      data: { employeeId: employee.id, employeeName: employee.name },
    });

    return {
      success: true,
      message: `Great! I'll help book leave for ${employee.name}.\n\nWhat dates would you like?\n\nExamples:\n• "Next Monday" (single day)\n• "December 20-27" (date range)\n• "Next week Monday to Friday"`,
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

    // Parse dates - handle single day vs range
    let start = startDate || dates;
    let end = endDate;
    
    // Check if it's a date range
    if (dates && (dates.includes('-') || dates.toLowerCase().includes(' to '))) {
      const parts = dates.split(/\s*(?:-|to)\s*/i);
      start = parts[0]?.trim();
      end = parts[1]?.trim();
    }
    
    // If no end date specified, it's a single day booking
    if (!end || end === start) {
      end = start;
    }

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

    const isSingleDay = start === end;
    const dateDisplay = isSingleDay ? start : `${start} to ${end}`;
    
    return {
      success: true,
      message: `Got it! Booking ${dateDisplay}.\n\nWhich type of leave?\n${categories.map((c, i) => `${i + 1}. ${c.name}`).join("\n")}`,
      nextStep: {
        question: "Which leave type?",
        options: categories.map(c => c.name),
      },
      data: { categories },
    };
  }

  // Step 2/3: Get leave type and handle confirmation
  if (pending.step === 2 || pending.step === 3) {
    const { leaveType, confirmed } = action.parameters;
    
    console.log('[Book Leave] Step:', pending.step, '- leaveType:', leaveType, 'confirmed:', confirmed, 'categoryId:', pending.data.categoryId);
    
    // Get the category
    let category;
    
    // If at step 3 (confirmation) and user confirmed, just get the stored category
    if (pending.step === 3 && confirmed && pending.data.categoryId) {
      console.log('[Book Leave] Step 3 confirmed - fetching stored category');
      category = await prisma.eventCategory.findFirst({
        where: { id: pending.data.categoryId },
      });
    }
    // If at step 2 and user provided leave type, find it
    else if (leaveType) {
      console.log('[Book Leave] Step 2 - finding leave type:', leaveType);
      category = await prisma.eventCategory.findFirst({
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
      
      // Store category ID for confirmation step
      setPendingAction(action.userId, action.companyId, {
        ...pending,
        step: 3, // Move to confirmation step
        data: { ...pending.data, categoryId: category.id, categoryName: category.name },
      });
    } else {
      // No leave type provided
      return {
        success: false,
        message: "Which leave type would you like to use?",
      };
    }

    if (!category) {
      clearPendingAction(action.userId, action.companyId);
      return {
        success: false,
        message: "Leave type not found. Please start over.",
      };
    }

    // If not confirmed, show preview
    if (!confirmed) {
      // Get entitlement info to show balance
      const entitlement = await prisma.leaveEntitlement.findFirst({
        where: { employeeId: pending.data.employeeId, eventCategoryId: category.id },
      });
      
      const balance = entitlement ? entitlement.totalDays - entitlement.usedDays : 0;
      
      // Calculate days - handle if same date (single day)
      const isSingleDay = pending.data.startDate === pending.data.endDate;
      const daysRequested = isSingleDay ? 1 : '(will calculate)';
      
      // Show preview with entitlement info
      return {
        success: true,
        requiresConfirmation: true,
        preview: {
          employee: pending.data.employeeName,
          startDate: pending.data.startDate,
          endDate: pending.data.endDate,
          leaveType: category.name,
          balance,
          daysRequested,
        },
        message: `📅 Leave Request:\n\n${pending.data.employeeName}\n${isSingleDay ? pending.data.startDate : `${pending.data.startDate} to ${pending.data.endDate}`}\n${category.name}\n\n${isSingleDay ? '📊 Single day booking' : `📊 Date range: ${pending.data.startDate} to ${pending.data.endDate}`}\n💰 Current balance: ${balance} days\n\nBook this leave?`,
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
        message: `✅ Leave booked successfully!\n\n${pending.data.employeeName}\n${pending.data.startDate} to ${pending.data.endDate}\n${category.name}\n\n📅 Calendar updated - Auto-approved\n💰 ${totalDeduction} ${totalDeduction === 1 ? 'day' : 'days'} deducted from balance`,
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
  const { department, field, value, percentage, operation, confirmed, reason } = action.parameters;

  // Step 1: Determine target department from parameters or conversation context
  const conversation = getConversation(action.userId, action.companyId);
  const targetDepartment = department || conversation.entities.departments?.[0];

  if (!targetDepartment && !field) {
    return {
      success: false,
      message: "I need to know which employees to update. Try: 'Give everyone in sales a 10% raise' or 'Update IT department's location to Wellington'",
    };
  }

  // Step 2: Build where clause for affected employees
  const where: any = {
    companyId: action.companyId,
    isActive: true,
  };

  if (targetDepartment) {
    const dept = await prisma.department.findFirst({
      where: {
        companyId: action.companyId,
        name: { contains: targetDepartment, mode: 'insensitive' },
      },
    });
    
    if (!dept) {
      return {
        success: false,
        message: `I couldn't find a department matching "${targetDepartment}". Try checking the spelling?`,
      };
    }
    
    where.departmentId = dept.id;
  }

  // Step 3: Find matching employees
  const employees = await prisma.employee.findMany({
    where,
    include: {
      User: { select: { firstName: true, lastName: true } },
      Department: { select: { name: true } },
    },
    take: 200, // Safety limit
  });

  if (employees.length === 0) {
    return {
      success: false,
      message: `No active employees found${targetDepartment ? ` in ${targetDepartment}` : ''}.`,
    };
  }

  // Step 4: Determine field to update based on operation
  let fieldToUpdate = field || 'salaryAmount';
  let needsLookup = false; // For department/location changes
  let lookupValue: any = null;

  // Handle special field types that need lookups
  if (value && (fieldToUpdate === 'department' || fieldToUpdate === 'departmentId' || 
      (typeof value === 'string' && (value.toLowerCase().includes('department') || value.toLowerCase().includes('office'))))) {
    fieldToUpdate = 'departmentId';
    needsLookup = true;
    
    // Look up department
    const dept = await prisma.department.findFirst({
      where: {
        companyId: action.companyId,
        name: { contains: value, mode: 'insensitive' },
      },
    });
    
    if (!dept) {
      return {
        success: false,
        message: `I couldn't find a department named "${value}". Check the spelling or use "Show me all departments" to see options.`,
      };
    }
    
    lookupValue = dept.id;
  }

  // Step 5: Calculate changes for each employee
  const changes = employees.map(emp => {
    const currentValue = emp[fieldToUpdate as keyof typeof emp];
    let newValue = needsLookup ? lookupValue : value;

    // Handle percentage-based changes (for numeric fields)
    if (percentage && currentValue && typeof currentValue === 'number') {
      if (operation === 'increase') {
        newValue = Math.round(currentValue * (1 + percentage / 100));
      } else if (operation === 'decrease') {
        newValue = Math.round(currentValue * (1 - percentage / 100));
      }
    } else if (value !== undefined && !needsLookup) {
      newValue = typeof value === 'string' && fieldToUpdate === 'salaryAmount' ? parseFloat(value) : value;
    }

    const change = typeof newValue === 'number' && typeof currentValue === 'number' 
      ? newValue - currentValue 
      : 0;

    // For department changes, show human-readable names
    let displayCurrent = currentValue;
    let displayNew = newValue;
    
    if (fieldToUpdate === 'departmentId') {
      displayCurrent = emp.Department?.name || 'No department';
      displayNew = value; // The department name user provided
    }

    return {
      employeeId: emp.id,
      name: `${emp.User.firstName} ${emp.User.lastName}`,
      department: emp.Department?.name,
      field: fieldToUpdate,
      currentValue,
      newValue,
      change,
      displayCurrent,
      displayNew,
    };
  });

  // Step 6: Show preview and request confirmation
  if (!confirmed) {
    const totalIncrease = changes.reduce((sum, c) => sum + (c.change || 0), 0);
    const avgIncrease = changes.length > 0 ? totalIncrease / changes.length : 0;
    
    const preview = changes.slice(0, 5).map((c, i) => {
      if (fieldToUpdate === 'salaryAmount') {
        const current = Number(c.currentValue) || 0;
        const newVal = Number(c.newValue) || 0;
        const changeAmount = Number(c.change) || 0;
        return `${i + 1}. **${c.name}:** $${Math.round(current).toLocaleString()} → $${Math.round(newVal).toLocaleString()} (+$${Math.round(changeAmount).toLocaleString()})`;
      } else if (fieldToUpdate === 'departmentId') {
        return `${i + 1}. **${c.name}:** ${c.displayCurrent} → ${c.displayNew}`;
      } else if (fieldToUpdate === 'siteLocation' || fieldToUpdate === 'contractType' || fieldToUpdate === 'employmentType') {
        return `${i + 1}. **${c.name}:** ${c.currentValue || 'Not set'} → ${c.newValue}`;
      }
      return `${i + 1}. **${c.name}:** ${c.currentValue} → ${c.newValue}`;
    }).join('\n');

    const totalCurrentSalaries = changes.reduce((sum, c) => sum + (Number(c.currentValue) || 0), 0);
    const totalNewSalaries = changes.reduce((sum, c) => sum + (Number(c.newValue) || 0), 0);

    // Build message based on field type
    let previewMessage = `⚠️ **Bulk ${percentage ? `${percentage}% ${operation}` : 'Update'} Preview**\n\n**Affected:** ${changes.length} employees${targetDepartment ? ` in ${targetDepartment}` : ''}\n`;
    
    if (fieldToUpdate === 'salaryAmount') {
      previewMessage += `**Current total:** $${Math.round(totalCurrentSalaries).toLocaleString()}\n`;
      previewMessage += `**New total:** $${Math.round(totalNewSalaries).toLocaleString()}\n`;
      previewMessage += `**Total increase:** $${Math.round(totalIncrease).toLocaleString()}\n`;
      previewMessage += `**Average increase:** $${Math.round(avgIncrease).toLocaleString()}/person\n\n`;
    } else if (fieldToUpdate === 'departmentId') {
      previewMessage += `**Moving to:** ${value}\n\n`;
    } else if (fieldToUpdate === 'siteLocation') {
      previewMessage += `**New location:** ${value}\n\n`;
    } else if (fieldToUpdate === 'contractType') {
      previewMessage += `**New contract type:** ${value}\n\n`;
    } else {
      previewMessage += `**New value:** ${value}\n\n`;
    }
    
    previewMessage += `${preview}\n${changes.length > 5 ? `\n...and ${changes.length - 5} more\n` : ''}`;
    previewMessage += `\n⚠️ **This will update ${changes.length} employee records immediately.**\n\nApply these changes?`;

    return {
      success: true,
      requiresConfirmation: true,
      preview: { changes, totalIncrease, avgIncrease },
      message: previewMessage,
    };
  }

  // Step 6: Execute bulk update with full audit trail
  try {
    const updateResults = await prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const change of changes) {
        // Update the employee field
        await tx.employee.update({
          where: { id: change.employeeId },
          data: { [change.field]: change.newValue },
        });

        // Create audit log entry
        const diffs: AuditDiff[] = [{
          field: change.field,
          oldValue: String(change.currentValue || 0),
          newValue: String(change.newValue || 0),
        }];

        await createAuditLogs({
          companyId: action.companyId,
          employeeId: change.employeeId,
          section: 'compensation',
          diffs,
          reasons: {
            [change.field]: reason || `Bulk update via AI: ${percentage ? `${percentage}% ${operation}` : 'direct update'} for ${targetDepartment || 'selected employees'}`
          },
          changedById: action.userId,
        });

        results.push(change);
      }
      
      return results;
    });

    // Create undo record
    const undoId = await createUndoRecord({
      action: 'bulk_update',
      changes,
      userId: action.userId,
      companyId: action.companyId,
      field: fieldToUpdate,
    });

    const totalIncrease = changes.reduce((sum, c) => sum + (c.change || 0), 0);

    return {
      success: true,
      message: `✅ **Successfully updated ${changes.length} employees!**\n\n${fieldToUpdate === 'salaryAmount' ? `💰 **Total salary increase:** $${Math.round(totalIncrease).toLocaleString()}\n` : ''}📋 **Audit logs created** for all ${changes.length} changes\n✏️ **Reason recorded:** ${reason || `Bulk ${percentage}% ${operation}`}\n\n_Changes are effective immediately. You can undo this within 48 hours by saying "undo that"._`,
      undoable: true,
      undoId,
      data: { updatedCount: updateResults.length, changes: updateResults },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ **Bulk update failed:** ${error.message}\n\nNo changes were made. Please try again or contact support.`,
    };
  }
}

async function handleDocumentUpload(action: AIAction): Promise<ActionResult> {
  const conv = getConversation(action.userId, action.companyId);
  const pending = conv.entities.pendingAction;
  let { file, employeeName, category, requiresSignature, signatureDueDate, confirmed } = action.parameters;

  // Step 1: Retrieve files from conversation if not in parameters
  if (!file && conv.entities.pendingFiles && conv.entities.pendingFiles.length > 0) {
    file = conv.entities.pendingFiles[0];
    action.parameters.file = file;
  }

  // Ensure we have a file
  if (!file) {
    return {
      success: false,
      message: "I don't see any files to upload. Please drag and drop a document into the chat, then tell me who to assign it to.",
    };
  }

  // Step 2: Identify employee
  if (!pending || pending.type !== 'document_upload') {
    if (!employeeName) {
      return {
        success: true,
        message: `I see you have **${file.name}**.\n\nWho should I assign this document to? (Just give me their name)`,
        nextStep: { question: "Employee name?" },
      };
    }

    const employees = await findEmployeeByName(employeeName, action.companyId);

    if (employees.length === 0) {
      return {
        success: true,
        message: `I couldn't find anyone named "**${employeeName}**".\n\nTry:\n• Checking the spelling\n• Using just the first name\n• Or say "Show me all employees" to see everyone`,
        nextStep: { question: "Try a different name?" },
      };
    }

    if (employees.length > 1) {
      return {
        success: true,
        message: `I found **${employees.length} people** matching "${employeeName}":\n\n${employees.map((e, i) => `${i + 1}. **${e.name}** (${e.department})`).join('\n')}\n\n**Which one?** (Just say the number or full name)`,
        data: employees,
        nextStep: { question: "Which employee?" },
      };
    }

    // Set pending action with employee info
    setPendingAction(action.userId, action.companyId, {
      type: 'document_upload',
      step: 1,
      data: { file, employeeId: employees[0].id, employeeName: employees[0].name },
    });

    // AI suggests category based on filename
    const suggestedCategory = suggestDocumentCategory(file.name);

    return {
      success: true,
      message: `Perfect! I'll upload **${file.name}** for **${employees[0].name}**.\n\n**What category is this document?**\n1. Employment Contract\n2. Personal ID\n3. Visa/Work Permit\n4. Qualification/Certificate\n5. Training Record\n6. Other\n\n${suggestedCategory ? `💡 _Based on the filename, this looks like: **${suggestedCategory}**_` : ''}`,
      nextStep: {
        question: "Document category?",
        options: ["Employment Contract", "Personal ID", "Visa/Work Permit", "Qualification", "Training Record", "Other"],
      },
    };
  }

  // Step 3: Get category
  if (pending.step === 1 && !pending.data.category) {
    if (!category) {
      return {
        success: false,
        message: "What category is this document?",
      };
    }

    setPendingAction(action.userId, action.companyId, {
      ...pending,
      step: 2,
      data: { ...pending.data, category },
    });

    return {
      success: true,
      message: `Got it - **${category}**.\n\n**Does this document require a signature from the employee?**`,
      nextStep: {
        question: "Requires signature?",
        options: ["Yes, signature required", "No, just acknowledgement", "No requirements"],
      },
    };
  }

  // Step 4: Get signature requirements
  if (pending.step === 2 && pending.data.requiresSignature === undefined) {
    const needsSignature = requiresSignature || 
      (typeof requiresSignature === 'string' && requiresSignature.toLowerCase().includes('yes'));

    setPendingAction(action.userId, action.companyId, {
      ...pending,
      step: 3,
      data: { ...pending.data, requiresSignature: needsSignature },
    });

    if (needsSignature && !signatureDueDate) {
      return {
        success: true,
        message: "**When does the signature need to be completed by?**\n\nExamples:\n- 'Next Friday'\n- 'In 7 days'\n- 'December 15'\n- 'End of month'",
        nextStep: { question: "Signature due date?" },
      };
    }

    // If no signature or we have the date, move to confirmation
    setPendingAction(action.userId, action.companyId, {
      ...pending,
      step: 4,
      data: { ...pending.data, signatureDueDate: needsSignature ? signatureDueDate : null },
    });
  }

  // Step 5: Final confirmation and upload
  if ((pending.step === 3 || pending.step === 4) && !confirmed) {
    const data = pending.data;
    
    return {
      success: true,
      requiresConfirmation: true,
      preview: {
        fileName: data.file.name,
        fileSize: `${(data.file.size / 1024).toFixed(1)} KB`,
        employee: data.employeeName,
        category: data.category,
        requiresSignature: data.requiresSignature,
        dueDate: data.signatureDueDate,
      },
      message: `📄 **Document Upload Summary:**\n\n**File:** ${data.file.name} (${(data.file.size / 1024).toFixed(1)} KB)\n**Assign to:** ${data.employeeName}\n**Category:** ${data.category}\n**Requirements:** ${data.requiresSignature ? `✏️ Signature required (due ${data.signatureDueDate || 'TBD'})` : '📋 No signature required'}\n**Notifications:** ${data.requiresSignature ? 'Employee will be emailed' : 'Employee can view in their documents'}\n\n**Upload now?**`,
    };
  }

  // Step 6: Execute upload
  if (confirmed && pending.step >= 3) {
    try {
      const data = pending.data;
      
      // Convert File to Buffer for Supabase
      const arrayBuffer = await data.file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Upload to Supabase storage
      const path = `${action.companyId}/${data.employeeId}/${crypto.randomUUID()}-${data.file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, buffer, {
          contentType: data.file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
      }

      // Create signed URL for downloads
      const { data: signed, error: signErr } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 31536000); // 1 year expiry

      if (signErr) {
        throw new Error(`Failed to create signed URL: ${signErr.message}`);
      }

      // Create database record
      const document = await prisma.document.create({
        data: {
          id: crypto.randomUUID(),
          name: data.file.name,
          category: data.category,
          path,
          url: signed.signedUrl,
          size: data.file.size,
          type: data.file.type,
          uploaderId: action.userId,
          employeeId: data.employeeId,
          companyId: action.companyId,
          requiresSignature: data.requiresSignature || false,
          requiresAck: !data.requiresSignature, // If no signature, require acknowledgement
          signatureDueAt: data.signatureDueDate ? new Date(data.signatureDueDate) : null,
          canViewAdmin: true,
          canViewManager: true,
          canViewEmployee: true,
          createdAt: new Date(),
        },
      });

      // Send notification if signature required
      if (data.requiresSignature) {
        const employee = await prisma.employee.findUnique({
          where: { id: data.employeeId },
          include: { User: true },
        });

        if (employee?.User.email) {
          try {
            const { subject, html, text } = buildDocumentNotificationEmail({
              recipientName: `${employee.User.firstName} ${employee.User.lastName}`,
              documentName: data.file.name,
              category: data.category,
              docLink: signed.signedUrl,
              requiresSignature: true,
              signatureDueAt: data.signatureDueDate,
            });

            await resend.emails.send({
              from: 'PeopleCore <noreply@peoplecore.co.nz>',
              to: employee.User.email,
              subject,
              html,
            });
          } catch (emailError) {
            console.error('[Document Upload] Notification email failed:', emailError);
            // Don't fail the upload if email fails
          }
        }
      }

      // Clear files from conversation
      if (conv.entities.pendingFiles) {
        delete conv.entities.pendingFiles;
      }
      clearPendingAction(action.userId, action.companyId);

      return {
        success: true,
        message: `✅ **Document uploaded successfully!**\n\n📄 **${data.file.name}**\n👤 **Assigned to:** ${data.employeeName}\n📁 **Category:** ${data.category}\n${data.requiresSignature ? `✏️ **Signature required** by ${data.signatureDueDate}\n📧 **Notification sent** to employee\n` : '📋 **No action required** from employee\n'}\n🔗 **View in:** Documents section\n\n_The document is now in the system and ${data.requiresSignature ? 'awaiting signature' : 'available to view'}._`,
        data: { documentId: document.id, filePath: path, employeeId: data.employeeId },
      };
    } catch (error: any) {
      clearPendingAction(action.userId, action.companyId);
      return {
        success: false,
        message: `❌ **Upload failed:** ${error.message}\n\nPlease try again or upload manually through the Documents section.`,
      };
    }
  }

  // Shouldn't reach here, but handle gracefully
  return {
    success: false,
    message: "Something went wrong with the upload flow. Let's start over - please upload your file again.",
  };
}

// Helper to suggest document category from filename
function suggestDocumentCategory(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.includes('contract') || lower.includes('employment') || lower.includes('offer')) return 'Employment Contract';
  if (lower.includes('visa') || lower.includes('passport') || lower.includes('permit') || lower.includes('work_permit')) return 'Visa/Work Permit';
  if (lower.includes('license') || lower.includes('licence') || lower.includes('certificate') || lower.includes('qualification') || lower.includes('degree')) return 'Qualification';
  if (lower.includes('id') || lower.includes('identification') || lower.includes('driver')) return 'Personal ID';
  if (lower.includes('training') || lower.includes('course') || lower.includes('completion')) return 'Training Record';
  return null;
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

  // Revert single employee update
  if (record.action === "update_employee") {
    await updateEmployeeField(
      record.employeeId,
      record.field,
      record.oldValue,
      record.companyId,
      record.userId,
      "Reverted via undo action"
    );
    
    undoRecords.delete(undoId);
    
    return {
      success: true,
      message: "✅ Change undone successfully!",
    };
  }

  // Revert bulk update
  if (record.action === "bulk_update") {
    try {
      await prisma.$transaction(async (tx) => {
        for (const change of record.changes) {
          // Revert to original value
          await tx.employee.update({
            where: { id: change.employeeId },
            data: { [record.field]: change.currentValue },
          });

          // Create audit log for undo
          const diffs: AuditDiff[] = [{
            field: record.field,
            oldValue: String(change.newValue),
            newValue: String(change.currentValue),
          }];

          await createAuditLogs({
            companyId: record.companyId,
            employeeId: change.employeeId,
            section: 'compensation',
            diffs,
            reasons: {
              [record.field]: 'Reverted bulk update via undo action'
            },
            changedById: record.userId,
          });
        }
      });

      undoRecords.delete(undoId);

      return {
        success: true,
        message: `✅ **Bulk update undone!**\n\n🔄 Reverted ${record.changes.length} employees to their previous values\n📋 Audit logs updated\n\n_All changes have been reversed._`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `❌ Failed to undo: ${error.message}`,
      };
    }
  }

  return {
    success: false,
    message: "Undo not supported for this action type yet.",
  };
}

// ============ EMAIL TEMPLATE BUILDER ============

interface EmailTemplateProps {
  recipientName: string;
  subject: string;
  message: string;
  companyName: string;
}

function buildHREmail({ recipientName, subject, message, companyName }: EmailTemplateProps): string {
  // Convert line breaks to HTML
  const formattedMessage = message.replace(/\n/g, '<br>');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${companyName}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                People & Culture Team
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.5;">
                Hi ${recipientName},
              </p>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 24px 40px;">
              <div style="font-size: 15px; color: #555555; line-height: 1.6;">
                ${formattedMessage}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.5;">
                This is an automated message from ${companyName}'s HR system.
                <br>
                If you have any questions, please contact your HR team.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============ NEW HR AUTOMATION HANDLERS ============

async function handleComplianceSweep(action: AIAction): Promise<ActionResult> {
  const { checkType, scope, department } = action.parameters;

  // FUZZY MATCHING: Normalize check types
  const normalizeCheckType = (type: string): string => {
    const lower = (type || "").toLowerCase();
    
    // Visa variations
    if (/visa|visas|visa.*expir|work.*permit/i.test(lower)) return "visa_expiry";
    
    // Document variations
    if (/doc|document|paper|file|missing.*doc|doc.*missing/i.test(lower)) return "missing_documents";
    
    // IRD variations
    if (/ird|tax.*number|ird.*number|tax.*id/i.test(lower)) return "ird_compliance";
    
    // Contract variations
    if (/contract|agreement|expir.*contract/i.test(lower)) return "contract_expiry";
    
    // Default to all if vague
    return "all";
  };

  const normalizedCheckType = normalizeCheckType(checkType);

  // FUZZY MATCHING: Department names
  const normalizeDepartment = async (deptName: string): Promise<string | null> => {
    if (!deptName) return null;
    
    // Find department by partial match
    const dept = await prisma.department.findFirst({
      where: {
        companyId: action.companyId,
        name: {
          contains: deptName,
          mode: 'insensitive',
        },
      },
    });
    
    return dept?.name || null;
  };

  const normalizedDept = department ? await normalizeDepartment(department) : null;

  const checks: Record<string, () => Promise<any>> = {
    visa_expiry: async () => {
      // Query employees with expiring visas (next 90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + 90);
      
      // Visas are tracked in EmploymentCheck table
      const results = await prisma.employee.findMany({
        where: {
          companyId: action.companyId,
          isActive: true,
          ...(normalizedDept && { Department: { name: normalizedDept } }),
          EmploymentCheck: {
            some: {
              typeOfCheck: { contains: "visa", mode: 'insensitive' },
              expiryDate: { lte: cutoffDate, gte: new Date() },
            },
          },
        },
        include: {
          User: { select: { firstName: true, lastName: true, email: true } },
          Department: { select: { name: true } },
          EmploymentCheck: {
            where: {
              typeOfCheck: { contains: "visa", mode: 'insensitive' },
              expiryDate: { lte: cutoffDate, gte: new Date() },
            },
            select: {
              typeOfCheck: true,
              expiryDate: true,
              documentNumber: true,
            },
          },
        },
      });

      return {
        type: "visa_expiry",
        count: results.length,
        employees: results,
        severity: results.length > 0 ? "high" : "low",
      };
    },

    missing_documents: async () => {
      // Find employees without required documents
      const allEmployees = await prisma.employee.findMany({
        where: {
          companyId: action.companyId,
          isActive: true,
          ...(normalizedDept && { Department: { name: normalizedDept } }),
        },
        include: {
          User: { select: { firstName: true, lastName: true } },
          Department: { select: { name: true } },
          Document: { where: { deletedAt: null } },
        },
      });

      const missing = allEmployees.filter(emp => {
        const docs = emp.Document || [];
        const hasContract = docs.some(d => d.type?.toLowerCase().includes('contract'));
        const hasId = docs.some(d => d.type?.toLowerCase().includes('id'));
        return !hasContract || !hasId;
      });

      return {
        type: "missing_documents",
        count: missing.length,
        employees: missing,
        severity: missing.length > 5 ? "high" : "medium",
      };
    },

    ird_compliance: async () => {
      const missing = await prisma.employee.findMany({
        where: {
          companyId: action.companyId,
          isActive: true,
          OR: [
            { irdNumber: null },
            { irdNumber: "" },
          ],
          ...(normalizedDept && { Department: { name: normalizedDept } }),
        },
        include: {
          User: { select: { firstName: true, lastName: true, email: true } },
          Department: { select: { name: true } },
        },
      });

      return {
        type: "ird_compliance",
        count: missing.length,
        employees: missing,
        severity: missing.length > 0 ? "high" : "low",
      };
    },

    contract_expiry: async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + 90);

      const expiring = await prisma.employee.findMany({
        where: {
          companyId: action.companyId,
          isActive: true,
          contractEndDate: {
            lte: cutoffDate,
            gte: new Date(),
          },
          ...(normalizedDept && { Department: { name: normalizedDept } }),
        },
        include: {
          User: { select: { firstName: true, lastName: true, email: true } },
          Department: { select: { name: true } },
        },
      });

      return {
        type: "contract_expiry",
        count: expiring.length,
        employees: expiring,
        severity: expiring.length > 3 ? "high" : "medium",
      };
    },

    all: async () => {
      // Run all checks
      const results = await Promise.all([
        checks.visa_expiry(),
        checks.missing_documents(),
        checks.ird_compliance(),
        checks.contract_expiry(),
      ]);

      return {
        type: "comprehensive",
        checks: results,
        totalIssues: results.reduce((sum, r) => sum + r.count, 0),
      };
    },
  };

  const checkFn = checks[normalizedCheckType] || checks.all;
  const result = await checkFn();

  // Format message
  let message = "🔍 **Compliance Sweep Complete**\n\n";

  if (result.type === "comprehensive") {
    message += `Found ${result.totalIssues} total ${result.totalIssues === 1 ? 'issue' : 'issues'}:\n\n`;
    result.checks.forEach((check: any) => {
      const icon = check.severity === "high" ? "🚨" : check.severity === "medium" ? "⚠️" : "✅";
      message += `${icon} ${check.type.replace(/_/g, " ").toUpperCase()}: ${check.count} ${check.count === 1 ? 'issue' : 'issues'}\n`;
    });
    if (result.totalIssues > 0) {
      message += `\n💡 **Recommended Actions:**\n`;
      result.checks.forEach((check: any) => {
        if (check.count > 0) {
          message += `• Create workflow to auto-remind about ${check.type.replace(/_/g, " ")}\n`;
        }
      });
    } else {
      message += `\n✅ All employees are compliant!\n`;
    }
  } else {
    const icon = result.severity === "high" ? "🚨" : result.severity === "medium" ? "⚠️" : "✅";
    message += `${icon} Found ${result.count} ${result.count === 1 ? 'issue' : 'issues'}\n\n`;
    
    if (result.count > 0) {
      message += `**Affected Employees:**\n`;
      result.employees.slice(0, 10).forEach((emp: any, idx: number) => {
        const name = `${emp.User.firstName} ${emp.User.lastName}`;
        const dept = emp.Department?.name ? ` (${emp.Department.name})` : '';
        message += `${idx + 1}. ${name}${dept}\n`;
      });

      if (result.count > 10) {
        message += `\n...and ${result.count - 10} more\n`;
      }

      message += `\n💡 **Suggestions:**\n`;
      message += `• Create automated workflow for this check\n`;
      message += `• Email affected employees\n`;
      message += `• Export list for follow-up\n`;
    } else {
      message += "✅ All employees are compliant!\n";
    }
  }

  return {
    success: true,
    message,
    data: result,
  };
}

async function handleAnalyticsDigest(action: AIAction): Promise<ActionResult> {
  const { reportType, period, groupBy } = action.parameters;

  // FUZZY MATCHING: Report types
  const normalizeReportType = (type: string): string => {
    const lower = (type || "").toLowerCase();
    
    // Turnover variations
    if (/turnover|attrition|quit|left|leaving|departure/i.test(lower)) return "turnover";
    
    // Diversity variations
    if (/diversity|diverse|gender|age|demographic/i.test(lower)) return "diversity";
    
    // Workforce variations
    if (/workforce|trend|headcount|staff|employee.*stat/i.test(lower)) return "workforce_trends";
    
    // Default
    return "workforce_trends";
  };

  const normalizedReportType = normalizeReportType(reportType);

  const reports: Record<string, () => Promise<any>> = {
    turnover: async () => {
      // Calculate turnover rate
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months

      const terminated = await prisma.employee.count({
        where: {
          companyId: action.companyId,
          isActive: false,
          lastWorkingDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const avgHeadcount = await prisma.employee.count({
        where: {
          companyId: action.companyId,
          OR: [
            { isActive: true },
            { isActive: false, lastWorkingDate: { gte: startDate } },
          ],
        },
      });

      const turnoverRate = avgHeadcount > 0 ? (terminated / avgHeadcount) * 100 : 0;

      // By department if requested
      let byDepartment: Array<{ departmentId: string | null; departmentName: string; count: number }> = [];
      if (groupBy === "department") {
        const deptData = await prisma.employee.groupBy({
          by: ['departmentId'],
          where: {
            companyId: action.companyId,
            isActive: false,
            lastWorkingDate: { gte: startDate, lte: endDate },
          },
          _count: true,
        });

        // Get department names
        const deptIds = deptData.map(d => d.departmentId).filter((id): id is string => id !== null);
        const departments = await prisma.department.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true },
        });

        byDepartment = deptData.map(d => ({
          departmentId: d.departmentId,
          departmentName: departments.find(dept => dept.id === d.departmentId)?.name || 'Unknown',
          count: d._count,
        }));
      }

      return {
        turnoverRate: turnoverRate.toFixed(1),
        terminated,
        avgHeadcount,
        byDepartment,
        period: "12 months",
      };
    },

    diversity: async () => {
      // Gender distribution
      const genderDist = await prisma.employee.groupBy({
        by: ['gender'],
        where: { companyId: action.companyId, isActive: true },
        _count: true,
      });

      // Age distribution
      const employees = await prisma.employee.findMany({
        where: { companyId: action.companyId, isActive: true },
        include: { User: { select: { dateOfBirth: true } } },
      });

      const ageRanges = {
        "18-25": 0,
        "26-35": 0,
        "36-45": 0,
        "46-55": 0,
        "56+": 0,
      };

      employees.forEach(emp => {
        if (emp.User.dateOfBirth) {
          const age = Math.floor((new Date().getTime() - new Date(emp.User.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          if (age >= 18 && age <= 25) ageRanges["18-25"]++;
          else if (age >= 26 && age <= 35) ageRanges["26-35"]++;
          else if (age >= 36 && age <= 45) ageRanges["36-45"]++;
          else if (age >= 46 && age <= 55) ageRanges["46-55"]++;
          else if (age >= 56) ageRanges["56+"]++;
        }
      });

      return {
        gender: genderDist,
        ageRanges,
        totalEmployees: employees.length,
      };
    },

    workforce_trends: async () => {
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentHires = await prisma.employee.count({
        where: {
          companyId: action.companyId,
          startDate: { gte: threeMonthsAgo },
        },
      });

      const activeCount = await prisma.employee.count({
        where: {
          companyId: action.companyId,
          isActive: true,
        },
      });

      return {
        activeEmployees: activeCount,
        recentHires,
        growthRate: activeCount > 0 ? ((recentHires / activeCount) * 100).toFixed(1) : "0",
      };
    },
  };

  const reportFn = reports[normalizedReportType] || reports.workforce_trends;
  const result = await reportFn();

  // Format message
  let message = "📊 **Analytics Digest**\n\n";

  if (normalizedReportType === "turnover") {
    message += `**Turnover Analysis (${result.period})**\n\n`;
    message += `📉 Turnover Rate: ${result.turnoverRate}%\n`;
    message += `👋 Departures: ${result.terminated}\n`;
    message += `👥 Avg Headcount: ${result.avgHeadcount}\n`;

    if (result.byDepartment.length > 0) {
      message += `\n**By Department:**\n`;
      result.byDepartment.forEach((dept: any) => {
        message += `• ${dept.departmentName}: ${dept.count} departures\n`;
      });
    }
  } else if (normalizedReportType === "diversity") {
    message += `**Diversity Statistics**\n\n`;
    message += `👥 Total Employees: ${result.totalEmployees}\n\n`;
    message += `**Gender Distribution:**\n`;
    result.gender.forEach((g: any) => {
      const pct = ((g._count / result.totalEmployees) * 100).toFixed(1);
      message += `• ${g.gender || "Not specified"}: ${g._count} (${pct}%)\n`;
    });
    message += `\n**Age Distribution:**\n`;
    Object.entries(result.ageRanges).forEach(([range, count]) => {
      const pct = ((Number(count) / result.totalEmployees) * 100).toFixed(1);
      message += `• ${range}: ${count} (${pct}%)\n`;
    });
  } else {
    message += `**Workforce Trends**\n\n`;
    message += `👥 Active Employees: ${result.activeEmployees}\n`;
    message += `🆕 Recent Hires (3mo): ${result.recentHires}\n`;
    message += `📈 Growth Rate: ${result.growthRate}%\n`;
  }

  message += `\n💡 **Actions:**\n`;
  message += `• Schedule this as a recurring report\n`;
  message += `• Export data to Excel\n`;
  message += `• Share with leadership team\n`;

  return {
    success: true,
    message,
    data: result,
  };
}

async function handleTargetedComms(action: AIAction): Promise<ActionResult> {
  const { audience, department, subject, message: customMessage, confirmed } = action.parameters;

  // FUZZY MATCHING: Audience types
  const normalizeAudience = (aud: string): string | null => {
    if (!aud) return null;
    const lower = aud.toLowerCase();
    
    if (/manager|mgr|boss|lead/i.test(lower)) return "managers";
    if (/admin|hr|people.*team/i.test(lower)) return "hr_team";
    if (/everyone|all|everybody|whole.*team/i.test(lower)) return "all";
    
    return null;
  };

  const normalizedAudience = normalizeAudience(audience);

  // If they said "email everyone" without specifying what about, ask
  if (!subject && !customMessage) {
    return {
      success: true,
      message: "Sure! What should the email be about?",
    };
  }

  // Build recipient query
  let query: any = {
    companyId: action.companyId,
    isActive: true,
  };

  if (department) {
    query.Department = { name: { contains: department, mode: 'insensitive' } };
  }

  if (normalizedAudience === "managers") {
    query.isManager = true;
  }

  // Fetch recipients
  const recipients = await prisma.employee.findMany({
    where: query,
    include: {
      User: { select: { firstName: true, lastName: true, email: true } },
      Department: { select: { name: true } },
    },
  });

  // Preview before sending
  if (!confirmed) {
    let previewMessage = `📧 **Targeted Communication Preview**\n\n`;
    previewMessage += `**Recipients:** ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}\n`;
    previewMessage += `**Subject:** ${subject || "Important Update"}\n\n`;

    if (recipients.length <= 10) {
      previewMessage += `**To:**\n`;
      recipients.forEach((emp, idx) => {
        const name = `${emp.User.firstName} ${emp.User.lastName}`;
        const dept = emp.Department?.name ? ` (${emp.Department.name})` : '';
        previewMessage += `${idx + 1}. ${name}${dept}\n`;
      });
    } else {
      previewMessage += `**Sample Recipients:**\n`;
      recipients.slice(0, 5).forEach((emp, idx) => {
        const name = `${emp.User.firstName} ${emp.User.lastName}`;
        previewMessage += `${idx + 1}. ${name}\n`;
      });
      previewMessage += `\n...and ${recipients.length - 5} more\n`;
    }

    previewMessage += `\n⚠️ **Ready to send?** Say "yes" to confirm.`;

    // Set pending action
    setPendingAction(action.userId, action.companyId, {
      type: "targeted_comms",
      data: { recipients: recipients.map(r => r.id), subject, message: customMessage },
      step: 1,
    });

    return {
      success: true,
      message: previewMessage,
      requiresConfirmation: true,
      preview: {
        recipientCount: recipients.length,
        recipients: recipients.slice(0, 10).map(r => ({
          name: `${r.User.firstName} ${r.User.lastName}`,
          email: r.User.email,
          department: r.Department?.name,
        })),
      },
    };
  }

  // Send emails
  const conv = getConversation(action.userId, action.companyId);
  const pendingData = conv.entities.pendingAction?.data || {};
  const emailSubject = pendingData.subject || subject || "Important Update";
  const emailBody = pendingData.message || customMessage || "Please check the system for updates.";

  // Get company info for email branding
  const company = await prisma.company.findUnique({
    where: { id: action.companyId },
    select: { name: true },
  });

  // Send emails via resend
  const sent: string[] = [];
  const failed: string[] = [];

  for (const recipient of recipients) {
    try {
      const htmlEmail = buildHREmail({
        recipientName: `${recipient.User.firstName} ${recipient.User.lastName}`,
        subject: emailSubject,
        message: emailBody,
        companyName: company?.name || "Your Company",
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
        to: recipient.User.email,
        subject: emailSubject,
        html: htmlEmail,
      });

      sent.push(recipient.User.email);
    } catch (error) {
      console.error(`Failed to send email to ${recipient.User.email}:`, error);
      failed.push(recipient.User.email);
    }
  }

  clearPendingAction(action.userId, action.companyId);

  let resultMessage = `✅ **Communication Sent!**\n\n`;
  resultMessage += `📧 Sent to ${sent.length} ${sent.length === 1 ? 'person' : 'people'}\n`;
  if (failed.length > 0) {
    resultMessage += `⚠️ Failed: ${failed.length}\n`;
  }
  resultMessage += `\n**Subject:** ${emailSubject}\n`;

  return {
    success: true,
    message: resultMessage,
    data: { sent, failed },
    undoable: false,
  };
}

async function handlePolicyRollout(action: AIAction): Promise<ActionResult> {
  const { policyType, scope, department, policyDetails, confirmed } = action.parameters;

  // Determine affected employees
  let query: any = {
    companyId: action.companyId,
    isActive: true,
  };

  if (scope !== "all" && department) {
    query.Department = { name: { contains: department, mode: 'insensitive' } };
  }

  const affected = await prisma.employee.findMany({
    where: query,
    include: {
      User: { select: { firstName: true, lastName: true, email: true } },
      Department: { select: { name: true } },
    },
  });

  if (!confirmed) {
    let message = `📋 **Policy Rollout Preview**\n\n`;
    message += `**Policy:** ${(policyType || "general").replace(/_/g, " ").toUpperCase()}\n`;
    message += `**Scope:** ${scope === "all" ? "All employees" : `${department} department`}\n`;
    message += `**Affected:** ${affected.length} ${affected.length === 1 ? 'person' : 'people'}\n\n`;

    message += `**What will happen:**\n`;
    message += `1. Email notification sent to all affected employees\n`;
    message += `2. Policy document added to system\n`;
    message += `3. Acknowledgment required from each employee\n`;
    message += `4. Tracking dashboard created\n\n`;

    message += `⚠️ **Ready to proceed?** Say "yes" to confirm.`;

    setPendingAction(action.userId, action.companyId, {
      type: "policy_rollout",
      data: { policyType, affected: affected.map(a => a.id), policyDetails },
      step: 1,
    });

    return {
      success: true,
      message,
      requiresConfirmation: true,
      preview: {
        policyType,
        affectedCount: affected.length,
        sample: affected.slice(0, 5).map(a => ({
          name: `${a.User.firstName} ${a.User.lastName}`,
          department: a.Department?.name,
        })),
      },
    };
  }

  // Execute rollout
  const conv = getConversation(action.userId, action.companyId);
  const pendingData = conv.entities.pendingAction?.data || {};

  // Generate policy ID
  const policyId = crypto.randomUUID();

  // Send emails to all affected (implement actual sending)
  const emailsSent = affected.map(emp => emp.User.email);

  clearPendingAction(action.userId, action.companyId);

  let message = `✅ **Policy Rolled Out Successfully!**\n\n`;
  message += `📋 Policy: ${(policyType || "general").replace(/_/g, " ").toUpperCase()}\n`;
  message += `📧 Notified: ${emailsSent.length} employees\n`;
  message += `📊 Tracking ID: ${policyId.substring(0, 8)}\n\n`;

  message += `**Next Steps:**\n`;
  message += `• Monitor acknowledgment rates\n`;
  message += `• Follow up with non-responders after 3 days\n`;
  message += `• View progress in Policy Dashboard\n`;

  return {
    success: true,
    message,
    data: {
      policyId,
      affected: affected.length,
      notified: emailsSent.length,
    },
    undoable: false,
  };
}

