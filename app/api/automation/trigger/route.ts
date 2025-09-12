import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";
import { getAutomationScheduler } from "@/lib/automation";

const TriggerSchema = z
  .object({
    ruleId: z.string().cuid().optional(),
    eventType: z.string().optional(),
    eventData: z.record(z.any()).optional(),
    triggerData: z.record(z.any()).optional(),
  })
  .refine((data) => data.ruleId || data.eventType, {
    message: "Either ruleId or eventType must be provided",
  });

// POST: Manually trigger automation rules or handle events
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = TriggerSchema.parse(body);
    const scheduler = getAutomationScheduler();

    if (validatedData.ruleId) {
      // Manual rule trigger
      const rule = await prisma.automationRule.findFirst({
        where: {
          id: validatedData.ruleId,
          companyId: session.user.companyId,
          isActive: true,
        },
      });

      if (!rule) {
        return NextResponse.json(
          { error: "Rule not found or inactive" },
          { status: 404 },
        );
      }

      const jobIds = await scheduler.triggerRule(
        validatedData.ruleId,
        validatedData.triggerData,
      );

      // Log the manual trigger in audit log
      await prisma.globalAuditLog.create({
        data: {
          companyId: session.user.companyId,
          entityType: "AUTOMATION_RULE",
          entityId: validatedData.ruleId,
          action: "ACTIVATED", // Manual activation
          actorId: session.user.id,
          changes: {
            trigger: "manual",
            triggerData: validatedData.triggerData,
            jobsCreated: jobIds.length,
          },
          metadata: {
            jobIds,
            triggeredBy: session.user.email,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Created ${jobIds.length} jobs for rule`,
        jobIds,
        ruleId: validatedData.ruleId,
      });
    } else if (validatedData.eventType && validatedData.eventData) {
      // Event-based trigger
      const eventData = {
        ...validatedData.eventData,
        companyId: session.user.companyId, // Ensure company context
        triggeredBy: session.user.id,
      };

      await scheduler.handleEvent(validatedData.eventType, eventData);

      return NextResponse.json({
        success: true,
        message: `Event processed: ${validatedData.eventType}`,
        eventType: validatedData.eventType,
        companyId: session.user.companyId,
      });
    }

    return NextResponse.json(
      { error: "Invalid trigger request" },
      { status: 400 },
    );
  } catch (error) {
    console.error("POST /api/automation/trigger error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to trigger automation" },
      { status: 500 },
    );
  }
}

// GET: Get trigger status and recent activity
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const ruleId = url.searchParams.get("ruleId");

    if (ruleId) {
      // Get trigger status for specific rule
      const rule = await prisma.automationRule.findFirst({
        where: {
          id: ruleId,
          companyId: session.user.companyId,
        },
        include: {
          executions: {
            take: 10,
            orderBy: { triggeredAt: "desc" },
            select: {
              id: true,
              status: true,
              triggeredAt: true,
              executionLog: true,
              errorMessage: true,
            },
          },
          jobs: {
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              attempts: true,
              scheduledAt: true,
              startedAt: true,
              completedAt: true,
              errorMessage: true,
            },
          },
        },
      });

      if (!rule) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }

      return NextResponse.json({
        rule: {
          id: rule.id,
          name: rule.name,
          isActive: rule.isActive,
          triggerType: rule.triggerType,
        },
        recentExecutions: rule.executions,
        recentJobs: rule.jobs,
        summary: {
          totalExecutions: rule.executions.length,
          totalJobs: rule.jobs.length,
          lastTriggered: rule.executions[0]?.triggeredAt || null,
        },
      });
    } else {
      // Get overall trigger activity for company
      const [recentExecutions, recentJobs, activeRulesCount] =
        await Promise.all([
          prisma.automationExecution.findMany({
            where: { companyId: session.user.companyId },
            take: 20,
            orderBy: { triggeredAt: "desc" },
            include: {
              rule: {
                select: { id: true, name: true, triggerType: true },
              },
            },
          }),
          prisma.automationJob.findMany({
            where: { companyId: session.user.companyId },
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
              rule: {
                select: { id: true, name: true, triggerType: true },
              },
            },
          }),
          prisma.automationRule.count({
            where: {
              companyId: session.user.companyId,
              isActive: true,
            },
          }),
        ]);

      return NextResponse.json({
        summary: {
          activeRules: activeRulesCount,
          recentExecutions: recentExecutions.length,
          recentJobs: recentJobs.length,
        },
        recentActivity: {
          executions: recentExecutions,
          jobs: recentJobs,
        },
      });
    }
  } catch (error) {
    console.error("GET /api/automation/trigger error:", error);
    return NextResponse.json(
      { error: "Failed to get trigger status" },
      { status: 500 },
    );
  }
}
