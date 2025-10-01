/**
 * Cron job to process scheduled workflows and delayed executions
 * Should run every minute to check for pending jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workflowEngine } from "@/lib/workflows/WorkflowExecutionEngine";
import { headers as nextHeaders } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

// Verify cron secret to prevent unauthorized execution
function verifyCronSecret(req: NextRequest): boolean {
  const headersList = nextHeaders();
  const cronSecret = (headersList as any)?.get?.("x-cron-secret") || 
                     req.headers.get("x-cron-secret") ||
                     req.nextUrl.searchParams.get("secret");
  
  return cronSecret === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    if (process.env.NODE_ENV === "production" && !verifyCronSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results = {
      scheduled: 0,
      delayed: 0,
      eventBased: 0,
      errors: [] as string[],
    };

    // 1. Process scheduled workflows (cron-based triggers)
    const scheduledWorkflows = await prisma.automationRule.findMany({
      where: {
        isActive: true,
        triggerType: "SCHEDULED",
      },
    });

    for (const workflow of scheduledWorkflows) {
      try {
        const cfg = (workflow.triggerConfig ?? {}) as any;
        const schedule = typeof cfg === "object" && cfg !== null ? (cfg as any).schedule : undefined;
        if (!schedule) continue;

        // Check if it's time to run based on cron expression
        if (shouldRunCron(schedule, now)) {
          await workflowEngine.executeWorkflow(workflow.id, {
            triggerType: "SCHEDULED",
            scheduledTime: now,
          });
          results.scheduled++;
        }
      } catch (error: any) {
        console.error(`Failed to execute scheduled workflow ${workflow.id}:`, error);
        results.errors.push(`Scheduled workflow ${workflow.name}: ${error.message}`);
      }
    }

    // 2. Process delayed execution jobs
    const delayedJobs = await prisma.automationJob.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: now },
        jobType: "DELAYED_EXECUTION",
      },
      take: 10, // Process max 10 delayed jobs per run
    });

    for (const job of delayedJobs) {
      try {
        // Mark as processing
        await prisma.automationJob.update({
          where: { id: job.id },
          data: { status: "RUNNING" },
        });

        // Resume workflow execution
        const jobData = job.jobData as any;
        if (jobData?.context?.workflowId) {
          await workflowEngine.executeWorkflow(
            jobData.context.workflowId,
            jobData.context.triggerData
          );
        }

        // Mark as completed
        await prisma.automationJob.update({
          where: { id: job.id },
          data: { 
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        
        results.delayed++;
      } catch (error: any) {
        console.error(`Failed to process delayed job ${job.id}:`, error);
        
        await prisma.automationJob.update({
          where: { id: job.id },
          data: { 
            status: "FAILED",
            errorMessage: error.message,
            completedAt: new Date(),
          },
        });
        
        results.errors.push(`Delayed job ${job.id}: ${error.message}`);
      }
    }

    // 3. Check for event-based triggers
    await processEventTriggers(results);

    // Clean up old completed jobs (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await prisma.automationJob.deleteMany({
      where: {
        status: { in: ["COMPLETED", "FAILED"] },
        completedAt: { lt: thirtyDaysAgo },
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now,
      processed: results,
    });
  } catch (error: any) {
    console.error("Cron automation processing error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to process automations",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

/**
 * Process event-based triggers
 */
async function processEventTriggers(results: any) {
  try {
    // Check for document expiry triggers
    const expiryWorkflows = await prisma.automationRule.findMany({
      where: {
        isActive: true,
        triggerType: "DOCUMENT_EXPIRING",
      },
    });

    for (const workflow of expiryWorkflows) {
      const cfg = (workflow.triggerConfig ?? {}) as any;
      const daysBefore = typeof cfg === "object" && cfg !== null && (cfg as any).daysBefore != null ? (cfg as any).daysBefore : 30;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      
      // Find documents expiring within the target date
      const driverLicences = await prisma.driverLicence.findMany({
        where: {
          expiryDate: { lte: targetDate, gte: new Date() },
          Employee: { companyId: workflow.companyId },
        },
        include: { Employee: true },
      });

      const trainingRecords = await prisma.trainingRecord.findMany({
        where: {
          expiryDate: { lte: targetDate, gte: new Date() },
          Employee: { companyId: workflow.companyId },
        },
        include: { Employee: true, Course: true },
      });

      const employmentChecks = await prisma.employmentCheck.findMany({
        where: {
          expiryDate: { lte: targetDate, gte: new Date() },
          Employee: { companyId: workflow.companyId },
        },
        include: { Employee: true },
      });

      for (const doc of [...driverLicences, ...trainingRecords, ...employmentChecks]) {
        try {
          await workflowEngine.executeWorkflow(workflow.id, {
            triggerType: "DOCUMENT_EXPIRING",
            documentId: doc.id,
            employeeId: doc.employeeId,
            expiryDate: doc.expiryDate,
          });
          
          // Record that we processed this document
          await recordProcessedDocument(workflow.id, doc.id);
          results.eventBased++;
        } catch (error: any) {
          console.error(`Failed to process expiring item ${doc.id}:`, error);
          const label = (doc as any)?.type || (doc as any)?.Course?.name || (doc as any)?.typeOfCheck || "Item";
          results.errors.push(`Expiry ${label}: ${error.message}`);
        }
      }
    }

    // Check for contract expiry triggers
    const contractWorkflows = await prisma.automationRule.findMany({
      where: {
        isActive: true,
        triggerType: "CONTRACT_EXPIRING",
      },
    });

    for (const workflow of contractWorkflows) {
      const cfg = (workflow.triggerConfig ?? {}) as any;
      const daysBefore = typeof cfg === "object" && cfg !== null && (cfg as any).daysBefore != null ? (cfg as any).daysBefore : 60;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      
      const expiringContracts = await prisma.employee.findMany({
        where: {
          companyId: workflow.companyId,
          contractType: "FIXED_TERM",
          contractEndDate: {
            gte: new Date(),
            lte: targetDate,
          },
        },
        include: {
          User: true,
          Department: true,
          JobRole: true,
        },
      });

      for (const employee of expiringContracts) {
        try {
          // Check if already processed today
          const alreadyProcessed = await prisma.automationExecution.findFirst({
            where: {
              ruleId: workflow.id,
              triggeredAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
              triggerData: {
                path: ["employeeId"],
                equals: employee.id,
              },
            },
          });

          if (!alreadyProcessed) {
            await workflowEngine.executeWorkflow(workflow.id, {
              triggerType: "CONTRACT_EXPIRING",
              employeeId: employee.id,
              contractEndDate: employee.contractEndDate,
            });
            results.eventBased++;
          }
        } catch (error: any) {
          console.error(`Failed to process expiring contract for ${employee.id}:`, error);
          results.errors.push(`Contract expiry ${employee.User?.firstName}: ${error.message}`);
        }
      }
    }

    // Check for employee start date triggers (first day)
    const startDateWorkflows = await prisma.automationRule.findMany({
      where: {
        isActive: true,
        triggerType: "EMPLOYEE_START_DATE",
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const workflow of startDateWorkflows) {
      const startingEmployees = await prisma.employee.findMany({
        where: {
          companyId: workflow.companyId,
          startDate: today,
        },
        include: {
          User: true,
          Department: true,
          JobRole: true,
        },
      });

      for (const employee of startingEmployees) {
        try {
          await workflowEngine.executeWorkflow(workflow.id, {
            triggerType: "EMPLOYEE_START_DATE",
            employeeId: employee.id,
            startDate: employee.startDate,
          });
          results.eventBased++;
        } catch (error: any) {
          console.error(`Failed to process start date for ${employee.id}:`, error);
          results.errors.push(`Start date ${employee.User?.firstName}: ${error.message}`);
        }
      }
    }

    // Check for leave ending triggers
    const leaveEndingWorkflows = await prisma.automationRule.findMany({
      where: {
        isActive: true,
        triggerType: "LEAVE_ENDING",
      },
    });

    for (const workflow of leaveEndingWorkflows) {
      const cfg = (workflow.triggerConfig ?? {}) as any;
      const daysBefore = typeof cfg === "object" && cfg !== null && (cfg as any).daysBefore != null ? (cfg as any).daysBefore : 14;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      
      const endingLeaves = await prisma.leaveRequest.findMany({
        where: {
          Employee: {
            companyId: workflow.companyId,
          },
          approvalStatus: "APPROVED",
          endDate: {
            gte: new Date(),
            lte: targetDate,
          },
        },
        include: {
          Employee: {
            include: {
              User: true,
            },
          },
        },
      });

      for (const leave of endingLeaves) {
        try {
          // Check if already processed
          const alreadyProcessed = await prisma.automationExecution.findFirst({
            where: {
              ruleId: workflow.id,
              triggeredAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
              triggerData: {
                path: ["leaveRequestId"],
                equals: leave.id,
              },
            },
          });

          if (!alreadyProcessed) {
            await workflowEngine.executeWorkflow(workflow.id, {
              triggerType: "LEAVE_ENDING",
              leaveRequestId: leave.id,
              employeeId: leave.employeeId,
              endDate: leave.endDate,
              leaveType: leave.eventCategoryId,
            });
            results.eventBased++;
          }
        } catch (error: any) {
          console.error(`Failed to process ending leave ${leave.id}:`, error);
          results.errors.push(`Leave ending ${leave.Employee?.User?.firstName}: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    console.error("Error processing event triggers:", error);
    results.errors.push(`Event processing: ${error.message}`);
  }
}

/**
 * Check if cron expression matches current time
 */
function shouldRunCron(cronExpression: string, now: Date): boolean {
  // This is a simplified cron checker
  // In production, use a proper cron parser library
  
  const parts = cronExpression.split(" ");
  if (parts.length < 5) return false;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  const currentMinute = now.getMinutes();
  const currentHour = now.getHours();
  const currentDayOfMonth = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentDayOfWeek = now.getDay();
  
  // Check each part (simplified - doesn't handle all cron features)
  if (minute !== "*" && parseInt(minute) !== currentMinute) return false;
  if (hour !== "*" && parseInt(hour) !== currentHour) return false;
  if (dayOfMonth !== "*" && parseInt(dayOfMonth) !== currentDayOfMonth) return false;
  if (month !== "*" && parseInt(month) !== currentMonth) return false;
  if (dayOfWeek !== "*" && parseInt(dayOfWeek) !== currentDayOfWeek) return false;
  
  return true;
}

/**
 * Get IDs of documents already processed today
 */
async function getProcessedDocumentIds(workflowId: string, date: Date): Promise<string[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const executions = await prisma.automationExecution.findMany({
    where: {
      ruleId: workflowId,
      triggeredAt: { gte: startOfDay },
      status: "COMPLETED",
    },
    select: {
      triggerData: true,
    },
  });
  
  return executions
    .map((e: any) => e.triggerData?.documentId)
    .filter(Boolean);
}

/**
 * Record that a document was processed
 */
async function recordProcessedDocument(workflowId: string, documentId: string): Promise<void> {
  // This is handled by the execution recording in the engine
  // But we could add additional tracking if needed
}
