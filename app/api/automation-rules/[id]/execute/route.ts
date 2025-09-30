/**
 * Manual execution endpoint for workflows
 * Allows testing and manual triggering of workflows
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { workflowEngine } from "@/lib/workflows/WorkflowExecutionEngine";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workflowId } = await context.params;
    const body = await req.json().catch(() => ({}));

    // Fetch workflow
    const workflow = await prisma.automationRule.findFirst({
      where: {
        id: workflowId,
        companyId: session.user.companyId,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Check permissions (only ADMIN can execute workflows)
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Prepare trigger data
    const triggerData = {
      triggerType: body.triggerType || "MANUAL",
      testMode: body.testMode !== false, // Default to test mode
      testData: body.testData || {
        employeeId: body.employeeId,
        documentId: body.documentId,
        formId: body.formId,
        timestamp: new Date(),
      },
      manualTrigger: {
        userId: session.user.id,
        userName: `${session.user.firstName} ${session.user.lastName}`,
        triggeredAt: new Date(),
      },
      ...body.triggerData,
    };

    // Execute workflow
    console.log(`Manually executing workflow: ${workflow.name} (${workflowId})`);
    const result = await workflowEngine.executeWorkflow(workflowId, triggerData);

    // Return execution result
    return NextResponse.json({
      success: result.success,
      workflowName: workflow.name,
      executionTime: result.duration,
      logs: result.logs,
      error: result.error,
      testMode: triggerData.testMode,
      triggeredBy: session.user.email,
    });
  } catch (error: any) {
    console.error("Manual workflow execution error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to execute workflow",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve execution history
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workflowId } = await context.params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Fetch workflow to verify access
    const workflow = await prisma.automationRule.findFirst({
      where: {
        id: workflowId,
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastExecutedAt: true,
        executionCount: true,
        successCount: true,
        failureCount: true,
        averageExecutionTime: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Fetch execution history
    const [executions, total] = await Promise.all([
      prisma.automationExecution.findMany({
        where: {
          ruleId: workflowId,
        },
        orderBy: {
          triggeredAt: "desc",
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          status: true,
          triggeredAt: true,
          completedAt: true,
          executionTime: true,
          triggerData: true,
          errorMessage: true,
        },
      }),
      prisma.automationExecution.count({
        where: {
          ruleId: workflowId,
        },
      }),
    ]);

    // Calculate statistics
    const stats = {
      totalExecutions: workflow.executionCount || 0,
      successRate: workflow.executionCount 
        ? ((workflow.successCount || 0) / workflow.executionCount * 100).toFixed(1)
        : 0,
      averageTime: workflow.averageExecutionTime || 0,
      lastRun: workflow.lastExecutedAt,
    };

    return NextResponse.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        isActive: workflow.isActive,
      },
      stats,
      executions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error("Error fetching execution history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch execution history" },
      { status: 500 }
    );
  }
}
