/**
 * Automation System Utilities
 *
 * Utility functions for managing the automation system,
 * including startup, shutdown, and status monitoring.
 */

import { getAutomationWorker } from "./worker";
import { getAutomationScheduler } from "./scheduler";
import { automationJobQueue } from "./queue";

interface SystemStatus {
  worker: {
    isHealthy: boolean;
    metrics: any;
  };
  scheduler: {
    isRunning: boolean;
  };
  queue: {
    stats: any;
  };
  timestamp: Date;
}

let systemRunning = false;

/**
 * Start the complete automation system
 */
export async function startAutomationSystem(): Promise<void> {
  if (systemRunning) {
    console.warn("Automation system is already running");
    return;
  }

  try {
    console.log("Starting automation system...");

    // Start the scheduler first
    const scheduler = getAutomationScheduler();
    scheduler.start(60000); // Check triggers every minute

    // Start the worker
    const worker = getAutomationWorker();
    await worker.start();

    systemRunning = true;
    console.log("Automation system started successfully");

    // Set up graceful shutdown handlers
    setupGracefulShutdown();
  } catch (error) {
    console.error("Failed to start automation system:", error);
    throw error;
  }
}

/**
 * Stop the complete automation system
 */
export async function stopAutomationSystem(): Promise<void> {
  if (!systemRunning) {
    return;
  }

  try {
    console.log("Stopping automation system...");

    // Stop the scheduler first
    const scheduler = getAutomationScheduler();
    scheduler.stop();

    // Stop the worker (this will wait for current jobs to complete)
    const worker = getAutomationWorker();
    await worker.stop();

    systemRunning = false;
    console.log("Automation system stopped successfully");
  } catch (error) {
    console.error("Error stopping automation system:", error);
    throw error;
  }
}

/**
 * Get the current system status
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    const worker = getAutomationWorker();
    const queueStats = await automationJobQueue.getQueueStats();

    return {
      worker: {
        isHealthy: worker.isHealthy(),
        metrics: worker.getMetrics(),
      },
      scheduler: {
        isRunning: systemRunning,
      },
      queue: {
        stats: queueStats,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to get system status:", error);
    throw error;
  }
}

/**
 * Set up graceful shutdown handlers
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(
      `Received ${signal}, shutting down automation system gracefully...`,
    );
    try {
      await stopAutomationSystem();
      process.exit(0);
    } catch (error) {
      console.error("Error during graceful shutdown:", error);
      process.exit(1);
    }
  };

  // Handle various shutdown signals
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGHUP", () => shutdown("SIGHUP"));

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    shutdown("uncaughtException").catch(() => process.exit(1));
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled rejection at:", promise, "reason:", reason);
    shutdown("unhandledRejection").catch(() => process.exit(1));
  });
}

/**
 * Health check function for load balancers/monitoring
 */
export async function healthCheck(): Promise<{
  status: "healthy" | "unhealthy";
  details: any;
}> {
  try {
    const status = await getSystemStatus();
    const isHealthy = status.worker.isHealthy && status.scheduler.isRunning;

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      details: status,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      details: {
        error: (error as Error).message,
      },
    };
  }
}

/**
 * Clean up old jobs and maintain system health
 */
export async function performMaintenance(): Promise<{
  jobsCleanedUp: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let jobsCleanedUp = 0;

  try {
    // Clean up old completed/failed jobs (older than 30 days)
    jobsCleanedUp = await automationJobQueue.cleanup(30);
  } catch (error) {
    errors.push(`Job cleanup failed: ${(error as Error).message}`);
  }

  return {
    jobsCleanedUp,
    errors,
  };
}

