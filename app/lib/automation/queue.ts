/**
 * Automation Job Queue Manager
 *
 * Database-based job queue system for serverless environments.
 * Handles job creation, scheduling, prioritization, and retry logic.
 */

import { prisma } from "@/lib/prisma";
import { AutomationJobStatus } from "@prisma/client";
import { AutomationJob, JobLogger } from "./types";

export class AutomationJobQueue {
  private logger: JobLogger;

  constructor(logger?: JobLogger) {
    this.logger = logger || this.createDefaultLogger();
  }

  /**
   * Create a new job in the queue
   */
  async enqueue(
    ruleId: string,
    companyId: string,
    triggerData: any,
    options: {
      priority?: number;
      maxAttempts?: number;
      scheduledAt?: Date;
    } = {},
  ): Promise<string> {
    try {
      const job = await prisma.automationJob.create({
        data: {
          ruleId,
          companyId,
          triggerData,
          priority: options.priority || 0,
          maxAttempts: options.maxAttempts || 3,
          scheduledAt: options.scheduledAt || new Date(),
          status: AutomationJobStatus.PENDING,
        },
      });

      this.logger.info(`Job enqueued: ${job.id}`, {
        ruleId,
        companyId,
        priority: job.priority,
        scheduledAt: job.scheduledAt,
      });

      return job.id;
    } catch (error) {
      this.logger.error("Failed to enqueue job", error as Error, {
        ruleId,
        companyId,
        triggerData,
      });
      throw error;
    }
  }

  /**
   * Get the next available job to process
   */
  async dequeue(workerId?: string): Promise<AutomationJob | null> {
    try {
      // Use a transaction to atomically claim a job
      const result = await prisma.$transaction(async (tx) => {
        // Find the next available job
        const job = await tx.automationJob.findFirst({
          where: {
            status: AutomationJobStatus.PENDING,
            scheduledAt: {
              lte: new Date(),
            },
            attempts: {
              lt: tx.automationJob.fields.maxAttempts,
            },
            OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
          },
          orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
        });

        if (!job) {
          return null;
        }

        // Claim the job by updating its status
        const claimedJob = await tx.automationJob.update({
          where: { id: job.id },
          data: {
            status: AutomationJobStatus.RUNNING,
            startedAt: new Date(),
            attempts: job.attempts + 1,
            executionLog: {
              workerId,
              claimedAt: new Date(),
              previousAttempts: job.attempts,
            },
          },
        });

        return claimedJob;
      });

      if (result) {
        this.logger.info(`Job dequeued: ${result.id}`, {
          ruleId: result.ruleId,
          companyId: result.companyId,
          attempt: result.attempts,
          workerId,
        });
      }

      return result;
    } catch (error) {
      this.logger.error("Failed to dequeue job", error as Error, { workerId });
      return null;
    }
  }

  /**
   * Mark a job as completed
   */
  async complete(
    jobId: string,
    executionLog?: any,
    workerId?: string,
  ): Promise<void> {
    try {
      await prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: AutomationJobStatus.COMPLETED,
          completedAt: new Date(),
          executionLog: {
            ...executionLog,
            workerId,
            completedAt: new Date(),
          },
        },
      });

      this.logger.info(`Job completed: ${jobId}`, {
        workerId,
        completedAt: new Date(),
      });
    } catch (error) {
      this.logger.error("Failed to complete job", error as Error, {
        jobId,
        workerId,
      });
      throw error;
    }
  }

  /**
   * Mark a job as failed and schedule retry if applicable
   */
  async fail(
    jobId: string,
    errorMessage: string,
    executionLog?: any,
    workerId?: string,
  ): Promise<void> {
    try {
      const job = await prisma.automationJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const shouldRetry = job.attempts < job.maxAttempts;
      const nextRetryAt = shouldRetry
        ? this.calculateNextRetryTime(job.attempts)
        : null;

      await prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: shouldRetry
            ? AutomationJobStatus.PENDING
            : AutomationJobStatus.FAILED,
          errorMessage,
          nextRetryAt,
          executionLog: {
            ...executionLog,
            workerId,
            failedAt: new Date(),
            error: errorMessage,
            willRetry: shouldRetry,
            nextRetryAt,
          },
        },
      });

      this.logger.warn(`Job failed: ${jobId}`, {
        workerId,
        errorMessage,
        attempt: job.attempts,
        willRetry: shouldRetry,
        nextRetryAt,
      });
    } catch (error) {
      this.logger.error("Failed to mark job as failed", error as Error, {
        jobId,
        workerId,
        originalError: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Cancel a job
   */
  async cancel(jobId: string, reason?: string): Promise<void> {
    try {
      await prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: AutomationJobStatus.CANCELLED,
          errorMessage: reason || "Job cancelled",
          completedAt: new Date(),
        },
      });

      this.logger.info(`Job cancelled: ${jobId}`, { reason });
    } catch (error) {
      this.logger.error("Failed to cancel job", error as Error, {
        jobId,
        reason,
      });
      throw error;
    }
  }

  /**
   * Get job status and details
   */
  async getJob(jobId: string): Promise<AutomationJob | null> {
    try {
      const job = await prisma.automationJob.findUnique({
        where: { id: jobId },
        include: {
          rule: {
            select: {
              id: true,
              name: true,
              triggerType: true,
            },
          },
        },
      });

      return job;
    } catch (error) {
      this.logger.error("Failed to get job", error as Error, { jobId });
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(companyId?: string): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  }> {
    try {
      const where = companyId ? { companyId } : {};

      const [pending, running, completed, failed, cancelled, total] =
        await Promise.all([
          prisma.automationJob.count({
            where: { ...where, status: AutomationJobStatus.PENDING },
          }),
          prisma.automationJob.count({
            where: { ...where, status: AutomationJobStatus.RUNNING },
          }),
          prisma.automationJob.count({
            where: { ...where, status: AutomationJobStatus.COMPLETED },
          }),
          prisma.automationJob.count({
            where: { ...where, status: AutomationJobStatus.FAILED },
          }),
          prisma.automationJob.count({
            where: { ...where, status: AutomationJobStatus.CANCELLED },
          }),
          prisma.automationJob.count({ where }),
        ]);

      return {
        pending,
        running,
        completed,
        failed,
        cancelled,
        total,
      };
    } catch (error) {
      this.logger.error("Failed to get queue stats", error as Error, {
        companyId,
      });
      throw error;
    }
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await prisma.automationJob.deleteMany({
        where: {
          status: {
            in: [
              AutomationJobStatus.COMPLETED,
              AutomationJobStatus.FAILED,
              AutomationJobStatus.CANCELLED,
            ],
          },
          completedAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.info(`Cleaned up ${result.count} old jobs`, {
        olderThanDays,
        cutoffDate,
      });

      return result.count;
    } catch (error) {
      this.logger.error("Failed to cleanup jobs", error as Error, {
        olderThanDays,
      });
      throw error;
    }
  }

  /**
   * Calculate next retry time using exponential backoff
   */
  private calculateNextRetryTime(attempt: number): Date {
    // Exponential backoff: 2^attempt minutes, with jitter
    const baseDelayMs = Math.pow(2, attempt) * 60 * 1000; // 2^n minutes in ms
    const maxDelayMs = 60 * 60 * 1000; // 1 hour max
    const jitterMs = Math.random() * 30 * 1000; // Up to 30 seconds jitter

    const delayMs = Math.min(baseDelayMs, maxDelayMs) + jitterMs;

    return new Date(Date.now() + delayMs);
  }

  /**
   * Create a default logger if none provided
   */
  private createDefaultLogger(): JobLogger {
    return {
      info: (message: string, data?: any) => {
        console.log(
          `[AutomationQueue] ${message}`,
          data ? JSON.stringify(data) : "",
        );
      },
      warn: (message: string, data?: any) => {
        console.warn(
          `[AutomationQueue] ${message}`,
          data ? JSON.stringify(data) : "",
        );
      },
      error: (message: string, error?: Error, data?: any) => {
        console.error(`[AutomationQueue] ${message}`, {
          error: error?.message,
          stack: error?.stack,
          data,
        });
      },
      debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === "development") {
          console.debug(
            `[AutomationQueue] ${message}`,
            data ? JSON.stringify(data) : "",
          );
        }
      },
    };
  }
}

// Singleton instance for the application
export const automationJobQueue = new AutomationJobQueue();

