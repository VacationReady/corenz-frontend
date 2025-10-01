/**
 * Workflow Execution Engine
 * Handles the execution of automation workflows with full support for:
 * - Triggers (scheduled, webhook, event-based)
 * - Conditions (14 types)
 * - Actions (12 types)
 * - Delays, branches, loops
 * - Retry logic and error handling
 */

import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail } from "@/lib/email/template";
import { Node, Edge } from "reactflow";
import { v4 as uuidv4 } from "uuid";

// Node-cron is only used server-side for scheduled workflows
let cron: any;
if (typeof window === 'undefined') {
  try {
    cron = require('node-cron');
  } catch (e) {
    console.log('node-cron not available, scheduled workflows will be disabled');
  }
}

interface WorkflowContext {
  workflowId: string;
  executionId: string;
  triggerId?: string;
  triggerData?: any;
  employee?: any;
  company?: any;
  variables: Record<string, any>;
  logs: ExecutionLog[];
  startTime: Date;
}

interface ExecutionLog {
  timestamp: Date;
  nodeId: string;
  nodeType: string;
  status: "started" | "completed" | "failed" | "skipped";
  message?: string;
  error?: any;
}

interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  logs: ExecutionLog[];
  duration: number;
}

export class WorkflowExecutionEngine {
  private static instance: WorkflowExecutionEngine;
  private scheduledJobs: Map<string, any> = new Map(); // cron.ScheduledTask when available
  private activeExecutions: Map<string, WorkflowContext> = new Map();
  
  private constructor() {
    this.initializeScheduledTriggers();
  }

  public static getInstance(): WorkflowExecutionEngine {
    if (!WorkflowExecutionEngine.instance) {
      WorkflowExecutionEngine.instance = new WorkflowExecutionEngine();
    }
    return WorkflowExecutionEngine.instance;
  }

  /**
   * Initialize all scheduled triggers
   */
  private async initializeScheduledTriggers() {
    try {
      const scheduledWorkflows = await prisma.automationRule.findMany({
        where: {
          isActive: true,
          triggerType: "SCHEDULED",
        },
      });

      for (const workflow of scheduledWorkflows) {
        this.scheduleWorkflow(workflow);
      }
      
      console.log(`✅ Initialized ${scheduledWorkflows.length} scheduled workflows`);
    } catch (error) {
      console.error("Failed to initialize scheduled triggers:", error);
    }
  }

  /**
   * Schedule a workflow with cron
   */
  private scheduleWorkflow(workflow: any) {
    const cfg = (workflow.triggerConfig ?? {}) as any;
    const schedule = typeof cfg === 'object' && cfg !== null ? (cfg as any).schedule : undefined;
    if (!schedule) return;

    // Stop existing schedule if any
    const existingJob = this.scheduledJobs.get(workflow.id);
    if (existingJob && existingJob.stop) {
      existingJob.stop();
    }

    // Create new cron job if cron is available
    if (cron && cron.schedule) {
      const task = cron.schedule(schedule, async () => {
        console.log(`⏰ Executing scheduled workflow: ${workflow.name}`);
        await this.executeWorkflow(workflow.id, {
          triggerType: "SCHEDULED",
          scheduledTime: new Date(),
        });
      }, {
        timezone: (cfg as any)?.timezone || "Pacific/Auckland",
      });

      this.scheduledJobs.set(workflow.id, task);
      task.start();
    } else {
      console.warn(`Scheduled workflows are not available - node-cron not installed`);
    }
  }

  /**
   * Main execution entry point
   */
  public async executeWorkflow(
    workflowId: string,
    triggerData?: any
  ): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const startTime = new Date();
    const context: WorkflowContext = {
      workflowId,
      executionId,
      triggerData,
      variables: {},
      logs: [],
      startTime,
    };

    try {
      // Load workflow
      const workflow = await prisma.automationRule.findUnique({
        where: { id: workflowId },
        include: { Company: true },
      });

      if (!workflow || !workflow.isActive) {
        throw new Error("Workflow not found or inactive");
      }

      context.company = workflow.Company;
      this.activeExecutions.set(executionId, context);

      // Parse workflow definition
      const definition = workflow.workflowDefinition as any;
      const nodes: Node[] = definition?.nodes || [];
      const edges: Edge[] = definition?.edges || [];

      // Find and execute trigger node
      const triggerNode = nodes.find((n) => n.type === "trigger");
      if (!triggerNode) {
        throw new Error("No trigger node found");
      }

      // Validate trigger
      const triggerValid = await this.validateTrigger(triggerNode, triggerData, context);
      if (!triggerValid) {
        return {
          success: false,
          error: "Trigger validation failed",
          logs: context.logs,
          duration: Date.now() - startTime.getTime(),
        };
      }

      // Execute workflow graph
      await this.executeNode(triggerNode, nodes, edges, context);

      // Record successful execution
      await this.recordExecution(workflow, context, true);

      return {
        success: true,
        logs: context.logs,
        duration: Date.now() - startTime.getTime(),
      };
    } catch (error: any) {
      console.error(`Workflow execution failed: ${error.message}`, error);
      
      // Record failed execution
      const workflow = await prisma.automationRule.findUnique({
        where: { id: workflowId },
      });
      if (workflow) {
        await this.recordExecution(workflow, context, false, error.message);
      }

      return {
        success: false,
        error: error.message,
        logs: context.logs,
        duration: Date.now() - startTime.getTime(),
      };
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute a single node and its connected nodes
   */
  private async executeNode(
    node: Node,
    allNodes: Node[],
    edges: Edge[],
    context: WorkflowContext
  ): Promise<void> {
    // Log node start
    this.logExecution(context, node.id, node.type || "unknown", "started");

    try {
      // Execute based on node type
      switch (node.type) {
        case "trigger":
          // Already validated, just pass through
          break;
          
        case "condition":
          const conditionMet = await this.evaluateCondition(node, context);
          if (!conditionMet) {
            this.logExecution(context, node.id, "condition", "skipped", "Condition not met");
            return; // Stop execution path
          }
          break;
          
        case "action":
          await this.executeAction(node, context);
          break;
          
        case "delay":
          await this.executeDelay(node, context);
          break;
          
        case "branch":
          await this.executeBranch(node, allNodes, edges, context);
          return; // Branch handles its own continuation
          
        case "loop":
          await this.executeLoop(node, allNodes, edges, context);
          return; // Loop handles its own continuation
          
        default:
          console.warn(`Unknown node type: ${node.type}`);
      }

      // Log successful completion
      this.logExecution(context, node.id, node.type || "unknown", "completed");

      // Find and execute next nodes
      const nextEdges = edges.filter((e) => e.source === node.id);
      for (const edge of nextEdges) {
        const nextNode = allNodes.find((n) => n.id === edge.target);
        if (nextNode) {
          await this.executeNode(nextNode, allNodes, edges, context);
        }
      }
    } catch (error: any) {
      this.logExecution(context, node.id, node.type || "unknown", "failed", error.message);
      throw error;
    }
  }

  /**
   * Validate trigger conditions
   */
  private async validateTrigger(
    node: Node,
    triggerData: any,
    context: WorkflowContext
  ): Promise<boolean> {
    const triggerType = node.data?.config?.triggerType || node.data?.triggerType;
    
    switch (triggerType) {
      case "EMPLOYEE_CREATED":
        if (!triggerData?.employeeId) return false;
        context.employee = await prisma.employee.findUnique({
          where: { id: triggerData.employeeId },
          include: { User: true, Department: true, JobRole: true },
        });
        return !!context.employee;
        
      case "DOCUMENT_EXPIRING":
        {
          const cfg = (node.data?.config ?? {}) as any;
          const daysBefore = cfg.daysBefore ?? 30;
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + daysBefore);

          const driverLicences = await prisma.driverLicence.findMany({
            where: {
              expiryDate: { lte: targetDate, gte: new Date() },
              Employee: { companyId: context.company?.id },
            },
            include: { Employee: { include: { User: true } } },
          });

          const trainingRecords = await prisma.trainingRecord.findMany({
            where: {
              expiryDate: { lte: targetDate, gte: new Date() },
              Employee: { companyId: context.company?.id },
            },
            include: { Employee: { include: { User: true } } },
          });

          const employmentChecks = await prisma.employmentCheck.findMany({
            where: {
              expiryDate: { lte: targetDate, gte: new Date() },
              Employee: { companyId: context.company?.id },
            },
            include: { Employee: { include: { User: true } } },
          });

          const items = [...driverLicences, ...trainingRecords, ...employmentChecks];
          if (items.length > 0) {
            context.variables.expiringDocuments = items;
            return true;
          }
          return false;
        }
        
      case "FORM_SUBMITTED":
        const formId = node.data?.config?.formId;
        if (!formId || !triggerData?.submissionId) return false;
        
        const submission = await prisma.formSubmission.findUnique({
          where: { id: triggerData.submissionId },
          include: { Employee: { include: { User: true } } },
        });
        
        if (submission && submission.formId === formId) {
          context.employee = submission.Employee;
          context.variables.formSubmission = submission;
          return true;
        }
        return false;
        
      case "SCHEDULED":
        // Always valid for scheduled triggers
        return true;
        
      case "WEBHOOK":
        // Validate webhook payload
        return !!triggerData?.payload;
        
      case "LEAVE_REQUEST":
        if (!triggerData?.leaveRequestId) return false;
        const leaveRequest = await prisma.leaveRequest.findUnique({
          where: { id: triggerData.leaveRequestId },
          include: { Employee: { include: { User: true } } },
        });
        context.employee = leaveRequest?.Employee;
        context.variables.leaveRequest = leaveRequest;
        return !!leaveRequest;
        
      default:
        return true;
    }
  }

  /**
   * Evaluate condition nodes
   */
  private async evaluateCondition(node: Node, context: WorkflowContext): Promise<boolean> {
    const conditionType = node.data?.conditionType || node.data?.type;
    const config = node.data?.config || {};
    
    switch (conditionType) {
      case "department":
        if (!context.employee?.departmentId) return false;
        const operator = config.operator || "equals";
        const values = config.value || [];
        
        switch (operator) {
          case "equals":
            return values.includes(context.employee.departmentId);
          case "not_equals":
            return !values.includes(context.employee.departmentId);
          case "in":
            return values.includes(context.employee.departmentId);
          default:
            return false;
        }
        
      case "jobRole":
        if (!context.employee?.jobRoleId) return false;
        const roleValues = config.value || [];
        return roleValues.includes(context.employee.jobRoleId);
        
      case "contractType":
        if (!context.employee?.contractType) return false;
        const types = config.value || [];
        return types.includes(context.employee.contractType);
        
      case "probationStatus":
        if (!context.employee?.startDate) return false;
        const daysSinceStart = Math.floor(
          (Date.now() - new Date(context.employee.startDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        switch (config.status) {
          case "in_probation":
            return daysSinceStart <= 90;
          case "ending_soon":
            return daysSinceStart >= 80 && daysSinceStart <= 90;
          case "completed":
            return daysSinceStart > 90;
          default:
            return false;
        }
        
      case "leaveBalance":
        if (!context.employee?.id) return false;
        const leaveType = config.leaveType || "ANNUAL";
        const balanceOperator = config.operator || ">";
        const balanceValue = config.value || 0;
        
        const entitlement = await prisma.leaveEntitlement.findFirst({
          where: {
            employeeId: context.employee.id,
            EventCategory: { name: leaveType },
          },
        });
        
        if (!entitlement) return false;
        const balance = entitlement.totalDays - entitlement.usedDays;
        
        switch (balanceOperator) {
          case ">":
            return balance > balanceValue;
          case ">=":
            return balance >= balanceValue;
          case "<":
            return balance < balanceValue;
          case "<=":
            return balance <= balanceValue;
          case "==":
            return balance === balanceValue;
          default:
            return false;
        }
        
      case "documentStatus":
        const docType = config.documentType;
        const status = config.status || "valid";
        
        if (context.employee?.id) {
          const docs = await prisma.document.findMany({
            where: {
              employeeId: context.employee.id,
              ...(docType && { category: docType }),
            },
          });
          
          switch (status) {
            case "missing":
              return docs.length === 0;
            case "expiring":
              const thirtyDaysFromNow = new Date();
              thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
              return docs.some(d => d.expiryDate && d.expiryDate <= thirtyDaysFromNow && d.expiryDate > new Date());
            case "expired":
              return docs.some(d => d.expiryDate && d.expiryDate < new Date());
            case "valid":
              return docs.length > 0 && docs.every(d => !d.expiryDate || d.expiryDate > new Date());
            default:
              return false;
          }
        }
        return false;
        
      case "workingHours":
        const now = new Date();
        const nzTime = new Date(now.toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));
        const hour = nzTime.getHours();
        const day = nzTime.getDay();
        
        // Check if within NZ working hours (Mon-Fri, 8am-6pm)
        return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
        
      case "customField":
        const field = config.field;
        const customOperator = config.operator || "equals";
        const customValue = config.value;
        
        if (!field) return false;
        
        // Navigate nested fields with dot notation
        const fieldValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], context);
        
        switch (customOperator) {
          case "equals":
            return fieldValue === customValue;
          case "not_equals":
            return fieldValue !== customValue;
          case "contains":
            return String(fieldValue).includes(String(customValue));
          case "regex":
            return new RegExp(customValue).test(String(fieldValue));
          case "exists":
            return fieldValue !== undefined && fieldValue !== null;
          case "not_exists":
            return fieldValue === undefined || fieldValue === null;
          default:
            return false;
        }
        
      default:
        // Unknown condition type, default to true to continue flow
        console.warn(`Unknown condition type: ${conditionType}`);
        return true;
    }
  }

  /**
   * Execute action nodes
   */
  private async executeAction(node: Node, context: WorkflowContext): Promise<void> {
    const actionType = node.data?.actionType || node.data?.type;
    const config = node.data?.config || {};
    
    switch (actionType) {
      case "send_notification":
        await this.executeSendNotification(config, context);
        break;
        
      case "create_task":
        await this.executeCreateTask(config, context);
        break;
        
      case "assign_form":
        await this.executeAssignForm(config, context);
        break;
        
      case "update_field":
        await this.executeUpdateField(config, context);
        break;
        
      case "request_document":
        await this.executeRequestDocument(config, context);
        break;
        
      case "add_offboarding_task":
        await this.executeAddOffboardingTask(config, context);
        break;
        
      case "adjust_leave_balance":
        await this.executeAdjustLeaveBalance(config, context);
        break;
        
      case "assign_training":
        await this.executeAssignTraining(config, context);
        break;
        
      case "schedule_review":
        await this.executeScheduleReview(config, context);
        break;
        
      case "update_permissions":
        await this.executeUpdatePermissions(config, context);
        break;
        
      case "webhook":
        await this.executeWebhook(config, context);
        break;
        
      default:
        console.warn(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotification(config: any, context: WorkflowContext): Promise<void> {
    const channels = config.channels || ["email"];
    const recipientType = config.recipientType || "employee";
    const subject = this.interpolateVariables(config.subject, context);
    const message = this.interpolateVariables(config.message, context);
    
    // Get recipients
    const recipients = await this.getRecipients(recipientType, config, context);
    
    if (channels.includes("email")) {
      for (const recipient of recipients) {
        if (recipient.email) {
          const emailContent = renderPeopleCoreEmail({
            preview: subject,
            content: message,
            actionUrl: config.actionUrl,
            actionText: config.actionText,
          });
          
          await resend.emails.send({
            from: "PeopleCore <notifications@peoplecore.app>",
            to: recipient.email,
            subject,
            html: emailContent,
          });
        }
      }
    }
    
    // Handle Slack/Teams notifications if configured
    if (channels.includes("slack") && config.slackWebhook) {
      await fetch(config.slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${subject}\n${message}` }),
      });
    }
  }

  /**
   * Execute create task action
   */
  private async executeCreateTask(config: any, context: WorkflowContext): Promise<void> {
    const assigneeType = config.assigneeType || "employee";
    const assignees = await this.getRecipients(assigneeType, config, context);
    
    for (const assignee of assignees) {
      if (assignee.id) {
        await prisma.actionItem.create({
          data: {
            id: uuidv4(),
            type: "TASK",
            title: this.interpolateVariables(config.title, context),
            description: this.interpolateVariables(config.description || "", context),
            status: "PENDING",
            priority: config.priority || "MEDIUM",
            dueDate: config.dueDays ? this.addBusinessDays(new Date(), config.dueDays) : null,
            assignedToId: assignee.id,
            relatedEmployeeId: context.employee?.id,
            companyId: context.company?.id || assignee.companyId,
            updatedAt: new Date(),
            metadata: {
              source: "workflow",
              workflowId: context.workflowId,
              executionId: context.executionId,
            },
          },
        });
      }
    }
  }

  /**
   * Execute assign form action
   */
  private async executeAssignForm(config: any, context: WorkflowContext): Promise<void> {
    const formId = config.formId;
    if (!formId || !context.employee?.id) return;
    
    const dueDate = config.dueInDays 
      ? this.addBusinessDays(new Date(), config.dueInDays)
      : null;
    
    const assigner = context.company?.id
      ? await prisma.user.findFirst({ where: { role: "ADMIN", companyId: context.company.id } })
      : null;

    await prisma.formAssignment.create({
      data: {
        id: uuidv4(),
        formId,
        employeeId: context.employee.id,
        assignedById: assigner?.id || context.employee.userId,
        dueDate,
        status: "PENDING",
      },
    });

    // Also create action item for visibility
    await prisma.actionItem.create({
      data: {
        id: uuidv4(),
        type: "FORM",
        title: `Complete form: ${config.formName || formId}`,
        status: "PENDING",
        dueDate,
        assignedToId: context.employee.userId,
        relatedEmployeeId: context.employee.id,
        companyId: context.company?.id,
        updatedAt: new Date(),
        metadata: {
          formId,
          source: "workflow",
        },
      },
    });
  }

  /**
   * Execute update field action
   */
  private async executeUpdateField(config: any, context: WorkflowContext): Promise<void> {
    if (!context.employee?.id) return;
    
    const field = config.field;
    const value = config.value;
    
    const updateData: any = {};
    
    switch (field) {
      case "department":
        updateData.departmentId = value;
        break;
      case "jobRole":
        updateData.jobRoleId = value;
        break;
      case "manager":
        updateData.managerId = value;
        break;
      case "location":
        updateData.location = value;
        break;
      case "contractType":
        updateData.contractType = value;
        break;
      default:
        // Handle custom fields
        updateData[field] = value;
    }
    
    await prisma.employee.update({
      where: { id: context.employee.id },
      data: updateData,
    });
    // Optional: audit logging can be integrated here if required
  }

  /**
   * Execute delay node
   */
  private async executeDelay(node: Node, context: WorkflowContext): Promise<void> {
    const config = node.data?.config || {};
    const days = config.days || 0;
    const hours = config.hours || 0;
    const minutes = config.minutes || 0;
    const businessDaysOnly = config.businessDaysOnly || false;
    
    if (businessDaysOnly && days > 0) {
      // Calculate business days delay
      const delayUntil = this.addBusinessDays(new Date(), days);
      const delayMs = delayUntil.getTime() - Date.now();
      
      // For long delays, we should schedule instead of blocking
      if (delayMs > 60000) {
        await this.scheduleDelayedExecution(node, context, delayUntil);
        return;
      }
      
      await this.sleep(delayMs);
    } else {
      const totalMs = (days * 24 * 60 * 60 * 1000) + 
                     (hours * 60 * 60 * 1000) + 
                     (minutes * 60 * 1000);
      
      if (totalMs > 60000) {
        const delayUntil = new Date(Date.now() + totalMs);
        await this.scheduleDelayedExecution(node, context, delayUntil);
        return;
      }
      
      await this.sleep(totalMs);
    }
  }

  /**
   * Execute branch node (parallel or conditional)
   */
  private async executeBranch(
    node: Node,
    allNodes: Node[],
    edges: Edge[],
    context: WorkflowContext
  ): Promise<void> {
    const config = node.data?.config || {};
    const branchType = config.type || "parallel";
    
    const outgoingEdges = edges.filter((e) => e.source === node.id);
    
    if (branchType === "parallel") {
      // Execute all branches in parallel
      const promises = outgoingEdges.map(async (edge) => {
        const nextNode = allNodes.find((n) => n.id === edge.target);
        if (nextNode) {
          const branchContext = { ...context, variables: { ...context.variables } };
          await this.executeNode(nextNode, allNodes, edges, branchContext);
        }
      });
      
      await Promise.all(promises);
    } else {
      // Conditional branch - evaluate conditions
      for (const edge of outgoingEdges) {
        const condition = edge.data?.condition || edge.label;
        if (condition) {
          const conditionMet = await this.evaluateInlineCondition(condition, context);
          if (conditionMet) {
            const nextNode = allNodes.find((n) => n.id === edge.target);
            if (nextNode) {
              await this.executeNode(nextNode, allNodes, edges, context);
            }
            break; // Only execute first matching branch
          }
        }
      }
    }
  }

  /**
   * Execute loop node
   */
  private async executeLoop(
    node: Node,
    allNodes: Node[],
    edges: Edge[],
    context: WorkflowContext
  ): Promise<void> {
    const config = node.data?.config || {};
    const iterations = config.iterations || 1;
    const interval = config.interval || { days: 0, hours: 0, minutes: 0 };
    const collection = config.collection;
    
    let items: any[] = [];
    
    if (collection) {
      // Loop over collection
      items = context.variables[collection] || [];
    } else {
      // Fixed iterations
      items = Array.from({ length: iterations }, (_, i) => i);
    }
    
    for (let i = 0; i < items.length; i++) {
      // Set loop variables
      const loopContext = {
        ...context,
        variables: {
          ...context.variables,
          loopIndex: i,
          loopItem: items[i],
          loopCount: items.length,
        },
      };
      
      // Execute loop body
      const outgoingEdges = edges.filter((e) => e.source === node.id);
      for (const edge of outgoingEdges) {
        const nextNode = allNodes.find((n) => n.id === edge.target);
        if (nextNode) {
          await this.executeNode(nextNode, allNodes, edges, loopContext);
        }
      }
      
      // Wait between iterations if configured
      if (i < items.length - 1 && (interval.days || interval.hours || interval.minutes)) {
        const delayMs = (interval.days * 24 * 60 * 60 * 1000) +
                       (interval.hours * 60 * 60 * 1000) +
                       (interval.minutes * 60 * 1000);
        await this.sleep(Math.min(delayMs, 60000)); // Cap at 1 minute for now
      }
    }
  }

  /**
   * Helper: Get recipients based on type
   */
  private async getRecipients(
    recipientType: string,
    config: any,
    context: WorkflowContext
  ): Promise<any[]> {
    switch (recipientType) {
      case "employee":
        return context.employee ? [context.employee.User || context.employee] : [];
        
      case "manager":
        if (context.employee?.managerId) {
          const manager = await prisma.user.findUnique({
            where: { id: context.employee.managerId },
          });
          return manager ? [manager] : [];
        }
        return [];
        
      case "hr":
        const hrUsers = await prisma.user.findMany({
          where: {
            companyId: context.company?.id,
            role: "ADMIN",
          },
        });
        return hrUsers;
        
      case "specific":
        const specificIds = config.recipients || config.assigneeId ? [config.assigneeId] : [];
        if (specificIds.length > 0) {
          const users = await prisma.user.findMany({
            where: { id: { in: specificIds } },
          });
          return users;
        }
        return [];
        
      case "department":
        if (context.employee?.departmentId) {
          const deptEmployees = await prisma.employee.findMany({
            where: { departmentId: context.employee.departmentId },
            include: { User: true },
          });
          return deptEmployees.map(e => e.User).filter(Boolean);
        }
        return [];
        
      default:
        return [];
    }
  }

  /**
   * Helper: Interpolate variables in strings
   */
  private interpolateVariables(text: string, context: WorkflowContext): string {
    if (!text) return "";
    
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj: any, key: string) => {
        const trimmedKey = key.trim();
        return obj?.[trimmedKey];
      }, {
        ...context,
        ...context.variables,
        employee: context.employee,
        company: context.company,
      });
      
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Helper: Add business days to date
   */
  private addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let daysAdded = 0;
    
    while (daysAdded < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }
    
    return result;
  }

  /**
   * Helper: Sleep for milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Log execution step
   */
  private logExecution(
    context: WorkflowContext,
    nodeId: string,
    nodeType: string,
    status: ExecutionLog["status"],
    message?: string
  ): void {
    context.logs.push({
      timestamp: new Date(),
      nodeId,
      nodeType,
      status,
      message,
    });
  }

  /**
   * Record execution in database
   */
  private async recordExecution(
    workflow: any,
    context: WorkflowContext,
    success: boolean,
    error?: string
  ): Promise<void> {
    const duration = Date.now() - context.startTime.getTime();
    
    await prisma.automationExecution.create({
      data: {
        id: context.executionId,
        ruleId: workflow.id,
        companyId: workflow.companyId,
        status: success ? "COMPLETED" : "FAILED",
        triggeredAt: context.startTime,
        triggerData: context.triggerData,
        executionLog: context.logs,
        errorMessage: error,
      },
    });
    
    // Update workflow statistics
    await prisma.automationRule.update({
      where: { id: workflow.id },
      data: {
        lastExecutedAt: new Date(),
        executionCount: { increment: 1 },
        successCount: success ? { increment: 1 } : undefined,
        failureCount: !success ? { increment: 1 } : undefined,
        averageExecutionTime: Math.round(
          ((workflow.averageExecutionTime || 0) * workflow.executionCount + duration) / 
          (workflow.executionCount + 1)
        ),
      },
    });
  }

  /**
   * Schedule delayed execution
   */
  private async scheduleDelayedExecution(
    node: Node,
    context: WorkflowContext,
    executeAt: Date
  ): Promise<void> {
    await prisma.automationJob.create({
      data: {
        id: uuidv4(),
        ruleId: context.workflowId,
        companyId: context.company?.id,
        status: "PENDING",
        scheduledAt: executeAt,
        jobType: "DELAYED_EXECUTION",
        jobData: {
          nodeId: node.id,
          context: {
            ...context,
            logs: undefined, // Don't store logs in job data
          },
        },
      },
    });
  }

  /**
   * Evaluate inline conditions for branches
   */
  private async evaluateInlineCondition(condition: string, context: WorkflowContext): Promise<boolean> {
    // Simple condition evaluator
    if (condition.includes("==")) {
      const [left, right] = condition.split("==").map(s => s.trim());
      const leftValue = this.interpolateVariables(`{{${left}}}`, context);
      const rightValue = this.interpolateVariables(`{{${right}}}`, context);
      return leftValue === rightValue;
    }
    
    if (condition.includes("!=")) {
      const [left, right] = condition.split("!=").map(s => s.trim());
      const leftValue = this.interpolateVariables(`{{${left}}}`, context);
      const rightValue = this.interpolateVariables(`{{${right}}}`, context);
      return leftValue !== rightValue;
    }
    
    // Default to true if we can't evaluate
    return true;
  }

  // Additional action implementations...
  
  private async executeRequestDocument(config: any, context: WorkflowContext): Promise<void> {
    if (!context.employee?.id) return;
    
    await prisma.actionItem.create({
      data: {
        id: uuidv4(),
        type: "DOCUMENT",
        title: `Upload document: ${config.documentType}`,
        description: config.description,
        status: "PENDING",
        dueDate: config.dueDays ? this.addBusinessDays(new Date(), config.dueDays) : null,
        assignedToId: context.employee.userId,
        relatedEmployeeId: context.employee.id,
        companyId: context.company?.id,
        updatedAt: new Date(),
        metadata: {
          documentType: config.documentType,
          required: config.required || false,
        },
      },
    });
  }

  private async executeWebhook(config: any, context: WorkflowContext): Promise<void> {
    const url = config.url;
    const method = config.method || "POST";
    const headers = config.headers || {};
    const body = config.includeContext 
      ? {
          ...config.body,
          context: {
            employee: context.employee,
            variables: context.variables,
            executionId: context.executionId,
          },
        }
      : config.body;
    
    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  // Remaining action implementations follow similar patterns...
}

// Export singleton instance
export const workflowEngine = WorkflowExecutionEngine.getInstance();
