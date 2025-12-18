/**
 * Cron job to process scheduled workflows and delayed executions
 * Should run every minute to check for pending jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workflowEngine } from "@/lib/workflows/WorkflowExecutionEngine";
import { verifyCronSecret, getUnauthorizedResponse } from "@/lib/cron/auth";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

type NewsEmailJobProcessResult = {
  jobsProcessed: number;
  jobsCompleted: number;
  jobsFailed: number;
  emailsSent: number;
  errors: string[];
};

type CronProcessingResults = {
  scheduled: number;
  delayed: number;
  eventBased: number;
  newsEmail: NewsEmailJobProcessResult;
  errors: string[];
};

const NEWS_EMAIL_JOBS_PER_RUN = 2;
const NEWS_EMAIL_RECIPIENTS_PER_JOB_PER_RUN = 75;
const NEWS_EMAIL_CONCURRENCY = 5;

async function processNewsEmailJobs(): Promise<NewsEmailJobProcessResult> {
  const result: NewsEmailJobProcessResult = {
    jobsProcessed: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
    emailsSent: 0,
    errors: [],
  };

  for (let i = 0; i < NEWS_EMAIL_JOBS_PER_RUN; i++) {
    const claimedJob = await claimNextNewsEmailJob();
    if (!claimedJob) {
      break;
    }

    result.jobsProcessed++;

    try {
      const batchResult = await processSingleNewsEmailJob(claimedJob.id);
      result.emailsSent += batchResult.emailsSent;
      if (batchResult.completed) {
        result.jobsCompleted++;
      }
    } catch (error: any) {
      result.jobsFailed++;
      result.errors.push(`NewsEmailJob ${claimedJob.id}: ${error?.message || "Unknown error"}`);

      // Don't leave the job stuck RUNNING.
      // Increment attempts only on failures (not per batch).
      const updated = await (prisma as any).newsEmailJob.update({
        where: { id: claimedJob.id },
        data: {
          status: "PENDING",
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
          errorMessage: error?.message || "Unknown error",
          attempts: { increment: 1 },
        },
        select: {
          id: true,
          attempts: true,
          maxAttempts: true,
        },
      });

      if (updated.attempts >= updated.maxAttempts) {
        await (prisma as any).newsEmailJob.update({
          where: { id: claimedJob.id },
          data: {
            status: "FAILED",
            completedAt: new Date(),
          },
        });
      }
    }
  }

  return result;
}

async function claimNextNewsEmailJob(): Promise<{ id: string } | null> {
  const now = new Date();

  const job = await (prisma as any).newsEmailJob.findFirst({
    where: {
      status: "PENDING",
      scheduledAt: { lte: now },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      attempts: { lt: 3 },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (!job) return null;

  const claimed = await (prisma as any).newsEmailJob.updateMany({
    where: {
      id: job.id,
      status: "PENDING",
    },
    data: {
      status: "RUNNING",
      startedAt: now,
      errorMessage: null,
    },
  });

  return claimed.count === 1 ? { id: job.id } : null;
}

async function processSingleNewsEmailJob(jobId: string): Promise<{ emailsSent: number; completed: boolean }> {
  const now = new Date();
  const job = await (prisma as any).newsEmailJob.findUnique({
    where: { id: jobId },
    include: {
      NewsPost: {
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          audience: true,
          sendEmail: true,
          companyId: true,
        },
      },
    },
  });

  if (!job) {
    throw new Error("NewsEmailJob not found");
  }

  if (!job.NewsPost) {
    await (prisma as any).newsEmailJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: now,
        errorMessage: "Related NewsPost not found",
      },
    });
    return { emailsSent: 0, completed: true };
  }

  if (!job.NewsPost.sendEmail) {
    await (prisma as any).newsEmailJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        completedAt: now,
        errorMessage: "NewsPost sendEmail flag is false",
      },
    });
    return { emailsSent: 0, completed: true };
  }

  const companyId = job.companyId;
  const audience = job.NewsPost.audience as any;

  const userWhere = await buildNewsAudienceUserWhere(audience, companyId);
  const cursorUserId = job.cursorUserId;

  const users = await prisma.user.findMany({
    where: {
      ...userWhere,
      companyId,
      email: { not: "" },
      ...(cursorUserId ? { id: { gt: cursorUserId } } : {}),
    },
    orderBy: { id: "asc" },
    take: NEWS_EMAIL_RECIPIENTS_PER_JOB_PER_RUN,
    select: {
      id: true,
      email: true,
      firstName: true,
    },
  });

  if (users.length === 0) {
    await (prisma as any).newsEmailJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        executionLog: {
          ...(job.executionLog as any),
          completedAt: now,
        },
      },
    });
    return { emailsSent: 0, completed: true };
  }

  const baseUrl = getAppBaseUrl();
  const previewText = renderNewsContentPreview(job.NewsPost.content);

  let emailsSent = 0;
  let lastUserId: string | null = null;

  for (let idx = 0; idx < users.length; idx += NEWS_EMAIL_CONCURRENCY) {
    const chunk = users.slice(idx, idx + NEWS_EMAIL_CONCURRENCY);

    const sendResults = await Promise.all(
      chunk.map(async (user) => {
        const { html, text } = renderPeopleCoreEmail({
          preheader: job.NewsPost.title,
          title: "New PeopleCore News",
          intro: [
            `Hi ${user.firstName || "there"},`,
            "There's a new news post on your portal.",
          ],
          sections: [
            {
              title: job.NewsPost.title,
              description: previewText ? [previewText] : undefined,
            },
          ],
          ctas: {
            label: "View News Post",
            href: `${baseUrl}/news`,
          },
          outro: ["Log in to view the full post."],
        });

        await resend.emails.send({
          from: "noreply@peoplecore.co.nz",
          to: user.email,
          subject: `New News Post: ${job.NewsPost.title}`,
          html,
          text,
        });

        return user.id;
      }),
    );

    emailsSent += sendResults.length;
    lastUserId = sendResults[sendResults.length - 1] ?? lastUserId;

    await (prisma as any).newsEmailJob.update({
      where: { id: jobId },
      data: {
        cursorUserId: lastUserId,
        status: "RUNNING",
        executionLog: {
          ...(job.executionLog as any),
          lastBatchAt: new Date().toISOString(),
          lastBatchCount: sendResults.length,
        },
      },
    });
  }

  const batchFinished = users.length < NEWS_EMAIL_RECIPIENTS_PER_JOB_PER_RUN;
  if (batchFinished) {
    await (prisma as any).newsEmailJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        executionLog: {
          ...(job.executionLog as any),
          completedAt: new Date().toISOString(),
        },
      },
    });
  } else {
    await (prisma as any).newsEmailJob.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        scheduledAt: new Date(),
      },
    });
  }

  return { emailsSent, completed: batchFinished };
}

function renderNewsContentPreview(content: any): string {
  if (Array.isArray(content)) {
    const firstParagraph = content.find((block: any) => block?.type === "paragraph");
    return firstParagraph ? firstParagraph.text : "";
  }

  if (content && typeof content === "object" && content.type && content.content) {
    try {
      const firstParagraph = (content.content as any[]).find(
        (node: any) => node?.type === "paragraph" && Array.isArray(node.content),
      );
      if (!firstParagraph) return "";
      return (firstParagraph.content as any[])
        .filter((n: any) => n?.type === "text" && typeof n.text === "string")
        .map((n: any) => n.text)
        .join("")
        .slice(0, 240);
    } catch {
      return "";
    }
  }

  return "";
}

async function buildNewsAudienceUserWhere(audience: any, companyId: string) {
  const normalizedAudience = audience || { type: "all" };
  if (normalizedAudience?.type === "all") {
    return {};
  }

  const filters: any = {};

  if (normalizedAudience.departments?.length) {
    filters.departmentId = {
      in: await getDepartmentIdsByName(normalizedAudience.departments, companyId),
    };
  }
  if (normalizedAudience.roles?.length) {
    filters.jobRoleId = {
      in: await getJobRoleIdsByName(normalizedAudience.roles, companyId),
    };
  }
  if (normalizedAudience.locations?.length) {
    filters.Employee = {
      is: {
        locationId: {
          in: await getLocationIdsByName(normalizedAudience.locations, companyId),
        },
      },
    };
  }

  return filters;
}

async function getDepartmentIdsByName(names: string[], companyId: string) {
  const deps = await prisma.department.findMany({
    where: { name: { in: names }, companyId },
    select: { id: true },
  });
  return deps.map((d) => d.id);
}

async function getJobRoleIdsByName(names: string[], companyId: string) {
  const roles = await prisma.jobRole.findMany({
    where: { name: { in: names }, companyId },
    select: { id: true },
  });
  return roles.map((r) => r.id);
}

async function getLocationIdsByName(names: string[], companyId: string) {
  const locs = await prisma.location.findMany({
    where: { name: { in: names }, companyId },
    select: { id: true },
  });
  return locs.map((l) => l.id);
}

export async function GET(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    if (!verifyCronSecret(req)) {
      return getUnauthorizedResponse();
    }

    const now = new Date();
    const results: CronProcessingResults = {
      scheduled: 0,
      delayed: 0,
      eventBased: 0,
      newsEmail: {
        jobsProcessed: 0,
        jobsCompleted: 0,
        jobsFailed: 0,
        emailsSent: 0,
        errors: [],
      },
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

    // 4. Process queued news email sends
    const newsEmailResult = await processNewsEmailJobs();
    results.newsEmail = newsEmailResult;

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
      
      // Get entity and field from config, or default to all entities
      const entity = cfg.entity;
      const field = cfg.field;
      const fieldId = cfg.fieldId;

      let expiringItems: any[] = [];

      // If entity and field are specified, query dynamically
      if (entity && field && fieldId) {
        expiringItems = await queryExpiringEntities(entity, field, fieldId, targetDate, workflow.companyId, cfg);
      } else {
        // Backward compatibility: check all known entity types
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

        expiringItems = [...driverLicences, ...trainingRecords, ...employmentChecks];
      }

      for (const doc of expiringItems) {
        try {
          await workflowEngine.executeWorkflow(workflow.id, {
            triggerType: "DOCUMENT_EXPIRING",
            documentId: doc.id,
            employeeId: doc.employeeId,
            expiryDate: doc.expiryDate || doc[field],
            entity,
            field,
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
 * Query expiring entities dynamically based on entity type and field
 */
async function queryExpiringEntities(
  entity: string,
  field: string,
  fieldId: string,
  targetDate: Date,
  companyId: string,
  config: any
): Promise<any[]> {
  const today = new Date();
  
  switch (fieldId) {
    case "DriverLicence.expiryDate":
      return await prisma.driverLicence.findMany({
        where: {
          expiryDate: { lte: targetDate, gte: today },
          Employee: { companyId },
        },
        include: { Employee: true },
      });

    case "TrainingRecord.expiryDate":
      return await prisma.trainingRecord.findMany({
        where: {
          expiryDate: { lte: targetDate, gte: today },
          Employee: { companyId },
        },
        include: { Employee: true, Course: true },
      });

    case "EmploymentCheck.expiryDate":
      const whereClause: any = {
        expiryDate: { lte: targetDate, gte: today },
        Employee: { companyId },
      };
      // Add documentTypes filter if specified
      if (config.documentTypes && Array.isArray(config.documentTypes) && config.documentTypes.length > 0) {
        whereClause.typeOfCheck = { in: config.documentTypes };
      }
      return await prisma.employmentCheck.findMany({
        where: whereClause,
        include: { Employee: true },
      });

    case "Document.signatureDueAt":
      return await prisma.documentSignatureEmployee.findMany({
        where: {
          dueAt: { lte: targetDate, gte: today },
          Document: { Company: { id: companyId } },
        },
        include: { 
          Document: true,
          Employee: true,
        },
      });

    case "LeaveEntitlement.carryoverExpiry":
      return await prisma.leaveEntitlement.findMany({
        where: {
          carryoverExpiry: { lte: targetDate, gte: today },
          Company: { id: companyId },
        },
        include: { Employee: true },
      });

    case "EmployeeOffboarding.lastWorkingDate":
      return await prisma.employeeOffboarding.findMany({
        where: {
          lastWorkingDate: { lte: targetDate, gte: today },
          Employee: { companyId },
        },
        include: { Employee: true },
      });

    default:
      console.warn(`Unsupported fieldId in automation trigger: ${fieldId}`);
      return [];
  }
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
