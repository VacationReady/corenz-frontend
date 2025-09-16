/**
 * Automation Scheduler
 *
 * Handles scheduled evaluation of automation rules and creation of jobs
 * when triggers are met. Supports both cron-based and event-based scheduling.
 */

import { prisma } from "@/lib/prisma";
import { AutomationJobQueue } from "./queue";
import { AutomationRuleEvaluator } from "./evaluator";
import { AutomationTriggerType } from "@prisma/client";
import { JobLogger } from "./types";

export class AutomationScheduler {
  private queue: AutomationJobQueue;
  private evaluator: AutomationRuleEvaluator;
  private logger: JobLogger;
  private isRunning: boolean = false;
  private schedulerIntervalId?: NodeJS.Timeout;

  constructor(logger?: JobLogger) {
    this.logger = logger || this.createDefaultLogger();
    this.queue = new AutomationJobQueue(this.logger);
    this.evaluator = new AutomationRuleEvaluator(this.logger);
  }

  /**
   * Start the scheduler
   */
  start(intervalMs: number = 60000): void {
    // Default: check every minute
    if (this.isRunning) {
      this.logger.warn("Scheduler is already running");
      return;
    }

    this.isRunning = true;
    this.logger.info("Automation scheduler started", { intervalMs });

    this.schedulerIntervalId = setInterval(() => {
      this.checkTriggers().catch((error) => {
        this.logger.error("Error in scheduler check", error as Error);
      });
    }, intervalMs);

    // Run initial check
    this.checkTriggers().catch((error) => {
      this.logger.error("Error in initial scheduler check", error as Error);
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.schedulerIntervalId) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = undefined;
    }

    this.logger.info("Automation scheduler stopped");
  }

  /**
   * Manually trigger evaluation for a specific rule
   */
  async triggerRule(ruleId: string, triggerData?: any): Promise<string[]> {
    try {
      const rule = await prisma.automationRule.findFirst({
        where: {
          id: ruleId,
          isActive: true,
        },
      });

      if (!rule) {
        throw new Error(`Rule not found or inactive: ${ruleId}`);
      }

      if (triggerData) {
        // Direct trigger with provided data
        const jobId = await this.queue.enqueue(
          rule.id,
          rule.companyId,
          triggerData,
          { priority: 5 }, // Higher priority for manual triggers
        );

        this.logger.info("Manual trigger created job", {
          ruleId,
          jobId,
          triggerData,
        });

        return [jobId];
      } else {
        // Evaluate trigger and create jobs if matches found
        return await this.evaluateAndCreateJobs(rule);
      }
    } catch (error) {
      this.logger.error("Failed to trigger rule", error as Error, {
        ruleId,
        triggerData,
      });
      throw error;
    }
  }

  /**
   * Handle real-time events (webhooks from other parts of the system)
   */
  async handleEvent(eventType: string, eventData: any): Promise<void> {
    try {
      this.logger.debug("Handling event", { eventType, eventData });

      // Map event types to trigger types
      const triggerTypeMap: Record<string, AutomationTriggerType> = {
        "form.submitted": AutomationTriggerType.FORM_SUBMITTED,
        "onboarding.step.completed":
          AutomationTriggerType.ONBOARDING_STEP_COMPLETED,
        "employee.created": AutomationTriggerType.EMPLOYEE_CREATED,
      };

      const triggerType = triggerTypeMap[eventType];
      if (!triggerType) {
        this.logger.debug("No trigger type mapped for event", { eventType });
        return;
      }

      // Find active rules for this trigger type
      const rules = await prisma.automationRule.findMany({
        where: {
          isActive: true,
          triggerType,
          ...(eventData.companyId && { companyId: eventData.companyId }),
        },
      });

      this.logger.info("Found rules for event", {
        eventType,
        triggerType,
        ruleCount: rules.length,
      });

      // Create jobs for matching rules
      const jobPromises = rules.map(async (rule) => {
        try {
          // For event-based triggers, we create jobs immediately
          // The worker will evaluate conditions when processing
          const jobId = await this.queue.enqueue(
            rule.id,
            rule.companyId,
            {
              type: eventType,
              data: eventData,
              triggeredAt: new Date(),
            },
            { priority: 3 }, // Medium priority for event-based triggers
          );

          this.logger.debug("Created job for event", {
            ruleId: rule.id,
            jobId,
            eventType,
          });

          return jobId;
        } catch (error) {
          this.logger.error("Failed to create job for rule", error as Error, {
            ruleId: rule.id,
            eventType,
          });
          return null;
        }
      });

      const jobIds = await Promise.all(jobPromises);
      const successfulJobs = jobIds.filter(Boolean);

      this.logger.info("Event processing completed", {
        eventType,
        rulesProcessed: rules.length,
        jobsCreated: successfulJobs.length,
      });
    } catch (error) {
      this.logger.error("Failed to handle event", error as Error, {
        eventType,
        eventData,
      });
    }
  }

  /**
   * Check all active rules for trigger conditions
   */
  async checkTriggers(): Promise<void> {
    try {
      this.logger.debug("Checking automation triggers");

      // Get all active rules
      const rules = await prisma.automationRule.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (rules.length === 0) {
        this.logger.debug("No active automation rules found");
        return;
      }

      this.logger.debug(`Checking ${rules.length} active rules`);

      // Process rules in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < rules.length; i += batchSize) {
        const batch = rules.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (rule) => {
            try {
              await this.evaluateAndCreateJobs(rule);
            } catch (error) {
              this.logger.error("Failed to evaluate rule", error as Error, {
                ruleId: rule.id,
                ruleName: rule.name,
              });
            }
          }),
        );

        // Small delay between batches
        if (i + batchSize < rules.length) {
          await this.sleep(100);
        }
      }

      this.logger.debug("Trigger check completed");
    } catch (error) {
      this.logger.error("Failed to check triggers", error as Error);
    }
  }

  /**
   * Evaluate a rule and create jobs if triggers match
   */
  private async evaluateAndCreateJobs(rule: any): Promise<string[]> {
    try {
      // Skip time-based triggers for now (they should be handled by events)
      if (
        rule.triggerType === AutomationTriggerType.FORM_SUBMITTED ||
        rule.triggerType === AutomationTriggerType.ONBOARDING_STEP_COMPLETED ||
        rule.triggerType === AutomationTriggerType.EMPLOYEE_CREATED
      ) {
        return []; // These are handled by real-time events
      }

      // Evaluate the trigger
      const result = await this.evaluator.evaluateTrigger(
        rule.triggerType,
        rule.triggerConfig,
        rule.companyId,
      );

      if (!result.matches || result.matchingEntities.length === 0) {
        this.logger.debug("Rule trigger conditions not met", {
          ruleId: rule.id,
          triggerType: rule.triggerType,
        });
        return [];
      }

      this.logger.info("Rule trigger conditions met", {
        ruleId: rule.id,
        triggerType: rule.triggerType,
        matchingEntities: result.matchingEntities.length,
      });

      // Create jobs for each matching entity
      const jobPromises = result.matchingEntities.map(async (entity) => {
        try {
          // Check if we've already created a job for this entity recently
          const recentJob = await this.findRecentJob(rule.id, entity);
          if (recentJob) {
            this.logger.debug("Recent job exists for entity, skipping", {
              ruleId: rule.id,
              entityType: entity.type,
              recentJobId: recentJob.id,
            });
            return null;
          }

          const jobId = await this.queue.enqueue(
            rule.id,
            rule.companyId,
            entity,
            { priority: 1 }, // Low priority for scheduled triggers
          );

          return jobId;
        } catch (error) {
          this.logger.error("Failed to create job for entity", error as Error, {
            ruleId: rule.id,
            entity,
          });
          return null;
        }
      });

      const jobIds = await Promise.all(jobPromises);
      const successfulJobs = jobIds.filter(Boolean) as string[];

      this.logger.info("Jobs created for rule", {
        ruleId: rule.id,
        entitiesFound: result.matchingEntities.length,
        jobsCreated: successfulJobs.length,
      });

      return successfulJobs;
    } catch (error) {
      this.logger.error("Failed to evaluate and create jobs", error as Error, {
        ruleId: rule.id,
      });
      return [];
    }
  }

  /**
   * Check if a recent job exists for the same entity to avoid duplicates
   */
  private async findRecentJob(
    ruleId: string,
    entity: any,
  ): Promise<any | null> {
    try {
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);

      // Create a unique key for the entity
      let entityKey = "";
      if (entity.type === "document_expiry" && entity.data?.employmentCheckId) {
        entityKey = `doc_${entity.data.employmentCheckId}`;
      } else if (
        entity.type === "form_submission" &&
        entity.data?.submissionId
      ) {
        entityKey = `form_${entity.data.submissionId}`;
      } else if (
        entity.type === "onboarding_step_completed" &&
        entity.data?.stepInstanceId
      ) {
        entityKey = `step_${entity.data.stepInstanceId}`;
      } else if (
        entity.type === "employee_created" &&
        entity.data?.employeeId
      ) {
        entityKey = `emp_${entity.data.employeeId}`;
      }

      if (!entityKey) {
        return null; // Can't determine uniqueness, allow creation
      }

      // Look for recent jobs with similar trigger data
      const recentJob = await prisma.automationJob.findFirst({
        where: {
          ruleId,
          createdAt: {
            gte: hourAgo,
          },
          // This is a simplified check - in a real implementation,
          // you might want to add a more sophisticated deduplication mechanism
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return recentJob;
    } catch (error) {
      this.logger.error("Failed to check for recent jobs", error as Error, {
        ruleId,
        entity,
      });
      return null; // Allow creation on error
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a default logger if none provided
   */
  private createDefaultLogger(): JobLogger {
    return {
      info: (message: string, data?: any) => {
        console.log(
          `[AutomationScheduler] ${message}`,
          data ? JSON.stringify(data) : "",
        );
      },
      warn: (message: string, data?: any) => {
        console.warn(
          `[AutomationScheduler] ${message}`,
          data ? JSON.stringify(data) : "",
        );
      },
      error: (message: string, error?: Error, data?: any) => {
        console.error(`[AutomationScheduler] ${message}`, {
          error: error?.message,
          stack: error?.stack,
          data,
        });
      },
      debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === "development") {
          console.debug(
            `[AutomationScheduler] ${message}`,
            data ? JSON.stringify(data) : "",
          );
        }
      },
    };
  }
}

// Singleton scheduler instance
let schedulerInstance: AutomationScheduler | null = null;

export function getAutomationScheduler(): AutomationScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new AutomationScheduler();
  }
  return schedulerInstance;
}

