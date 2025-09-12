import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  getSystemStatus,
  healthCheck,
  performMaintenance,
} from "@/lib/automation";
import { automationJobQueue } from "@/lib/automation";

// GET: Get automation system status
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "status";

    switch (type) {
      case "health":
        // Health check for monitoring systems
        const healthStatus = await healthCheck();
        return NextResponse.json(healthStatus);

      case "queue":
        // Queue-specific statistics
        const queueStats = await automationJobQueue.getQueueStats(
          session.user.companyId,
        );
        return NextResponse.json({
          companyId: session.user.companyId,
          queue: queueStats,
          timestamp: new Date(),
        });

      case "detailed":
        // Detailed system status with all metrics
        const detailedStatus = await getSystemStatus();
        const companyQueueStats = await automationJobQueue.getQueueStats(
          session.user.companyId,
        );

        return NextResponse.json({
          ...detailedStatus,
          companyQueue: companyQueueStats,
          companyId: session.user.companyId,
        });

      default:
        // Basic status information
        const basicStatus = await getSystemStatus();
        return NextResponse.json({
          status: basicStatus.worker.isHealthy ? "healthy" : "unhealthy",
          worker: {
            isHealthy: basicStatus.worker.isHealthy,
            jobsProcessed: basicStatus.worker.metrics.jobsProcessed,
            successRate:
              basicStatus.worker.metrics.jobsProcessed > 0
                ? (
                    (basicStatus.worker.metrics.jobsSucceeded /
                      basicStatus.worker.metrics.jobsProcessed) *
                    100
                  ).toFixed(1) + "%"
                : "N/A",
          },
          scheduler: basicStatus.scheduler,
          timestamp: basicStatus.timestamp,
        });
    }
  } catch (error) {
    console.error("GET /api/automation/status error:", error);
    return NextResponse.json(
      {
        error: "Failed to get system status",
        status: "unhealthy",
        timestamp: new Date(),
      },
      { status: 500 },
    );
  }
}

// POST: Perform system operations
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin users to perform system operations
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case "maintenance":
        // Perform system maintenance
        const maintenanceResult = await performMaintenance();
        return NextResponse.json({
          success: true,
          action: "maintenance",
          result: maintenanceResult,
          timestamp: new Date(),
        });

      case "cleanup":
        // Clean up old jobs
        const olderThanDays = params.olderThanDays || 30;
        const cleanupCount = await automationJobQueue.cleanup(olderThanDays);
        return NextResponse.json({
          success: true,
          action: "cleanup",
          result: {
            jobsCleanedUp: cleanupCount,
            olderThanDays,
          },
          timestamp: new Date(),
        });

      case "queue_stats":
        // Get detailed queue statistics
        const stats = await automationJobQueue.getQueueStats(
          session.user.companyId,
        );
        return NextResponse.json({
          success: true,
          action: "queue_stats",
          result: stats,
          companyId: session.user.companyId,
          timestamp: new Date(),
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("POST /api/automation/status error:", error);
    return NextResponse.json(
      { error: "Failed to perform system operation" },
      { status: 500 },
    );
  }
}

// PUT: Update system configuration (admin only)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin users to update system configuration
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { component, config } = body;

    // For now, we'll just log the configuration update
    // In a real implementation, you might want to store these in the database
    // or update the worker configuration dynamically
    console.log(`System configuration update requested:`, {
      component,
      config,
      updatedBy: session.user.id,
      companyId: session.user.companyId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Configuration update logged",
      component,
      config,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("PUT /api/automation/status error:", error);
    return NextResponse.json(
      { error: "Failed to update system configuration" },
      { status: 500 },
    );
  }
}
