/**
 * Automation Worker
 *
 * Main worker class that processes automation jobs from the queue.
 * Handles job execution, error handling, retries, and metrics collection.
 */

import { prisma } from "@/lib/prisma";
import { AutomationJobQueue } from "./queue";
import { AutomationRuleEvaluator } from "./evaluator";
import { AutomationActionExecutor } from "./executor";
import {
  WorkerConfig,
  WorkerMetrics,
  JobExecutionContext,
  JobLogger,
  AutomationJob,
  RateLimitConfig,
  RateLimitState,
} from "./types";

export class AutomationWorker {
  private queue: AutomationJobQueue;
  private evaluator: AutomationRuleEvaluator;
  private executor: AutomationActionExecutor;
  private config: WorkerConfig;
  private metrics: WorkerMetrics;
  private rateLimitConfig: RateLimitConfig;
  private rateLimitState: RateLimitState;
  private logger: JobLogger;
  private workerId: string;
  private isRunning: boolean = false;
  private processingJobs: Set<string> = new Set();
  private circuitBreakerFailures: number = 0;
  private circuitBreakerLastFailure?: Date;

  constructor(config?: Partial<WorkerConfig>, logger?: JobLogger) {
    this.workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.logger = logger || this.createDefaultLogger();

    this.config = {
      maxConcurrentJobs: 5,
      pollIntervalMs: 5000,
      retryDelayMs: 1000,
      maxRetryDelayMs: 60000,
      jobTimeoutMs: 300000, // 5 minutes
      enableMetrics: true,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTimeMs: 60000,
      ...config,
    };

    this.rateLimitConfig = {
      enabled: true,
      maxJobsPerMinute: 60,
      maxJobsPerHour: 1000,
      burstLimit: 10,
    };

    this.rateLimitState = {
      currentMinuteJobs: 0,
      currentHourJobs: 0,
      currentBurst: 0,
      lastResetMinute: new Date(),
      lastResetHour: new Date(),
    };

    this.metrics = {
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      jobsRetried: 0,
      averageExecutionTime: 0,
      isHealthy: true,
      circuitBreakerOpen: false,
    };

    this.queue = new AutomationJobQueue(this.logger);
    this.evaluator = new AutomationRuleEvaluator(this.logger);
    this.executor = new AutomationActionExecutor(this.logger);

    this.logger.info(`Worker initialized: ${this.workerId}`, {
      config: this.config,
      rateLimitConfig: this.rateLimitConfig,
    });
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Worker is already running");
      return;
    }

    this.isRunning = true;
    this.logger.info(`Worker started: ${this.workerId}`);

    // Start the main processing loop
    this.processJobs().catch((error) => {
      this.logger.error("Worker processing loop failed", error as Error);
      this.isRunning = false;
    });
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.logger.info(`Worker stopping: ${this.workerId}`);

    // Wait for current jobs to complete
    while (this.processingJobs.size > 0) {
      this.logger.info(
        `Waiting for ${this.processingJobs.size} jobs to complete`,
      );
      await this.sleep(1000);
    }

    this.logger.info(`Worker stopped: ${this.workerId}`);
  }

  /**
   * Get worker metrics
   */
  getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get worker health status
   */
  isHealthy(): boolean {
    return this.metrics.isHealthy && !this.metrics.circuitBreakerOpen;
  }

  /**
   * Process a single job manually (for testing or manual execution)
   */
  async processJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      this.logger.error("Job not found", undefined, { jobId });
      return false;
    }

    return await this.executeJob(job);
  }

  /**
   * Main job processing loop
   */
  private async processJobs(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen()) {
          await this.sleep(this.config.pollIntervalMs);
          continue;
        }

        // Check rate limits
        if (!this.checkRateLimit()) {
          await this.sleep(1000);
          continue;
        }

        // Check if we can process more jobs
        if (this.processingJobs.size >= this.config.maxConcurrentJobs) {
          await this.sleep(1000);
          continue;
        }

        // Get next job
        const job = await this.queue.dequeue(this.workerId);
        if (!job) {
          await this.sleep(this.config.pollIntervalMs);
          continue;
        }

        // Process job asynchronously
        this.executeJobAsync(job);
      } catch (error) {
        this.logger.error("Error in processing loop", error as Error);
        await this.sleep(this.config.retryDelayMs);
      }
    }
  }

  /**
   * Execute a job asynchronously
   */
  private async executeJobAsync(job: AutomationJob): Promise<void> {
    this.processingJobs.add(job.id);

    try {
      await this.executeJob(job);
    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: AutomationJob): Promise<boolean> {
    const startTime = Date.now();
    const context: JobExecutionContext = {
      jobId: job.id,
      ruleId: job.ruleId,
      companyId: job.companyId,
      triggerData: job.triggerData,
      attempt: job.attempts,
      logger: this.logger,
    };

    this.logger.info(`Processing job: ${job.id}`, {
      ruleId: job.ruleId,
      companyId: job.companyId,
      attempt: job.attempts,
      workerId: this.workerId,
    });

    try {
      // Set job timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Job timeout")),
          this.config.jobTimeoutMs,
        );
      });

      // Execute job with timeout
      const success = await Promise.race([
        this.executeJobInternal(context),
        timeoutPromise,
      ]);

      // Update metrics
      const executionTime = Date.now() - startTime;
      this.updateMetrics(success, executionTime);

      if (success) {
        await this.queue.complete(job.id, { executionTime }, this.workerId);
        this.logger.info(`Job completed: ${job.id}`, {
          executionTime,
          workerId: this.workerId,
        });
      } else {
        await this.queue.fail(
          job.id,
          "Job execution failed",
          { executionTime },
          this.workerId,
        );
      }

      return success;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      this.logger.error(`Job failed: ${job.id}`, error as Error, {
        executionTime,
        workerId: this.workerId,
        context,
      });

      this.updateMetrics(false, executionTime);
      this.recordCircuitBreakerFailure();

      await this.queue.fail(
        job.id,
        errorMessage,
        { executionTime, error: errorMessage },
        this.workerId,
      );

      return false;
    }
  }

  /**
   * Internal job execution logic
   */
  private async executeJobInternal(
    context: JobExecutionContext,
  ): Promise<boolean> {
    try {
      // Get the automation rule
      const rule = await prisma.automationRule.findFirst({
        where: {
          id: context.ruleId,
          companyId: context.companyId,
          isActive: true,
        },
      });

      if (!rule) {
        this.logger.warn("Rule not found or inactive", {
          ruleId: context.ruleId,
          companyId: context.companyId,
        });
        return false;
      }

      // Extract employee ID from trigger data if available
      let employeeId: string | undefined;
      if (context.triggerData?.employeeId) {
        employeeId = context.triggerData.employeeId;
      } else if (context.triggerData?.data?.employeeId) {
        employeeId = context.triggerData.data.employeeId;
      }

      // Get employee data if available (for condition evaluation)
      let employee: any = null;
      if (employeeId) {
        employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          include: {
            user: true,
            department: true,
            jobRole: true,
          },
        });
      }

      // Evaluate conditions
      const conditionsPass = await this.evaluator.evaluateConditions(
        (rule.conditions as any[]) || [],
        {
          companyId: context.companyId,
          triggerData: context.triggerData,
          employeeId,
          employee,
        },
      );

      if (!conditionsPass) {
        this.logger.info("Rule conditions not met, skipping execution", {
          ruleId: context.ruleId,
          employeeId,
        });
        return true; // Not a failure, just conditions not met
      }

      // Execute actions
      const actionResults = await this.executor.executeActions(
        rule.actions as Array<{ type: string; config: any }>,
        {
          companyId: context.companyId,
          triggerData: context.triggerData,
          employeeId,
          logger: context.logger,
        },
      );

      // Create execution record
      await prisma.automationExecution.create({
        data: {
          ruleId: context.ruleId,
          companyId: context.companyId,
          status: actionResults.every((r) => r.success)
            ? "COMPLETED"
            : "FAILED",
          triggerData: context.triggerData,
          executionLog: {
            workerId: this.workerId,
            jobId: context.jobId,
            attempt: context.attempt,
            employeeId,
            conditionsEvaluated: rule.conditions
              ? (rule.conditions as any[]).length
              : 0,
            conditionsPassed: conditionsPass,
            actionsExecuted: actionResults.length,
            actionResults: actionResults.map((r) => ({
              success: r.success,
              message: r.message,
              error: r.error,
              data: r.data,
            })),
            executedAt: new Date().toISOString(),
          },
        },
      });

      const allSucceeded = actionResults.every((result) => result.success);
      const failedActions = actionResults.filter((result) => !result.success);

      if (!allSucceeded) {
        this.logger.warn("Some actions failed", {
          ruleId: context.ruleId,
          totalActions: actionResults.length,
          failedActions: failedActions.length,
          failures: failedActions.map((f) => f.error),
        });
      }

      return allSucceeded;
    } catch (error) {
      this.logger.error("Internal job execution failed", error as Error, {
        context,
      });
      throw error;
    }
  }

  /**
   * Update worker metrics
   */
  private updateMetrics(success: boolean, executionTime: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.jobsProcessed++;
    this.metrics.lastProcessedAt = new Date();

    if (success) {
      this.metrics.jobsSucceeded++;
      this.resetCircuitBreaker();
    } else {
      this.metrics.jobsFailed++;
    }

    // Update average execution time
    const totalTime =
      this.metrics.averageExecutionTime * (this.metrics.jobsProcessed - 1);
    this.metrics.averageExecutionTime =
      (totalTime + executionTime) / this.metrics.jobsProcessed;

    // Update health status
    const successRate = this.metrics.jobsSucceeded / this.metrics.jobsProcessed;
    this.metrics.isHealthy = successRate > 0.8; // 80% success rate threshold
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(): boolean {
    if (!this.rateLimitConfig.enabled) return true;

    const now = new Date();

    // Reset minute counter
    if (
      now.getTime() - this.rateLimitState.lastResetMinute.getTime() >=
      60000
    ) {
      this.rateLimitState.currentMinuteJobs = 0;
      this.rateLimitState.lastResetMinute = now;
    }

    // Reset hour counter
    if (
      now.getTime() - this.rateLimitState.lastResetHour.getTime() >=
      3600000
    ) {
      this.rateLimitState.currentHourJobs = 0;
      this.rateLimitState.lastResetHour = now;
    }

    // Check limits
    if (
      this.rateLimitState.currentMinuteJobs >=
      this.rateLimitConfig.maxJobsPerMinute
    ) {
      return false;
    }

    if (
      this.rateLimitState.currentHourJobs >= this.rateLimitConfig.maxJobsPerHour
    ) {
      return false;
    }

    if (this.rateLimitState.currentBurst >= this.rateLimitConfig.burstLimit) {
      return false;
    }

    // Increment counters
    this.rateLimitState.currentMinuteJobs++;
    this.rateLimitState.currentHourJobs++;
    this.rateLimitState.currentBurst++;

    // Reset burst counter gradually
    setTimeout(() => {
      this.rateLimitState.currentBurst = Math.max(
        0,
        this.rateLimitState.currentBurst - 1,
      );
    }, 1000);

    return true;
  }

  /**
   * Circuit breaker logic
   */
  private isCircuitBreakerOpen(): boolean {
    if (!this.config.enableCircuitBreaker) return false;

    if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
      const timeSinceLastFailure = this.circuitBreakerLastFailure
        ? Date.now() - this.circuitBreakerLastFailure.getTime()
        : 0;

      if (timeSinceLastFailure < this.config.circuitBreakerResetTimeMs) {
        this.metrics.circuitBreakerOpen = true;
        return true;
      } else {
        // Reset circuit breaker
        this.resetCircuitBreaker();
      }
    }

    this.metrics.circuitBreakerOpen = false;
    return false;
  }

  private recordCircuitBreakerFailure(): void {
    if (!this.config.enableCircuitBreaker) return;

    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailure = new Date();

    if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
      this.logger.warn("Circuit breaker opened", {
        failures: this.circuitBreakerFailures,
        threshold: this.config.circuitBreakerThreshold,
      });
    }
  }

  private resetCircuitBreaker(): void {
    if (this.circuitBreakerFailures > 0) {
      this.logger.info("Circuit breaker reset");
      this.circuitBreakerFailures = 0;
      this.circuitBreakerLastFailure = undefined;
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
          `[AutomationWorker:${this.workerId}] ${message}`,
          data ? JSON.stringify(data) : "",
        );
      },
      warn: (message: string, data?: any) => {
        console.warn(
          `[AutomationWorker:${this.workerId}] ${message}`,
          data ? JSON.stringify(data) : "",
        );
      },
      error: (message: string, error?: Error, data?: any) => {
        console.error(`[AutomationWorker:${this.workerId}] ${message}`, {
          error: error?.message,
          stack: error?.stack,
          data,
        });
      },
      debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === "development") {
          console.debug(
            `[AutomationWorker:${this.workerId}] ${message}`,
            data ? JSON.stringify(data) : "",
          );
        }
      },
    };
  }
}

// Singleton worker instance
let workerInstance: AutomationWorker | null = null;

export function getAutomationWorker(): AutomationWorker {
  if (!workerInstance) {
    workerInstance = new AutomationWorker();
  }
  return workerInstance;
}

