/**
 * Automation Rule Test Endpoint
 * POST /api/automation-rules/[id]/test - Start a test run
 * Supports both saved rules and inline workflow definitions
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { testSimulator } from "@/lib/automation/test-simulator";
import type { TestRunConfig } from "@/lib/automation/test-simulator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id: ruleId } = await params;

    // Handle both saved rules and inline definitions
    let testConfig: TestRunConfig;

    if (ruleId === "draft" || ruleId === "unsaved") {
      // Testing an unsaved draft - use inline definition
      if (!body.workflowDefinition && !body.actions) {
        return NextResponse.json(
          { error: "workflowDefinition or actions required for unsaved drafts" },
          { status: 400 }
        );
      }

      testConfig = {
        workflowDefinition: body.workflowDefinition,
        triggerType: body.triggerType || "MANUAL",
        triggerConfig: body.triggerConfig || {},
        conditions: body.conditions || [],
        actions: body.actions || [],
        skipDelays: body.skipDelays !== false, // Default to true
        inputOverrides: body.inputOverrides || {},
      };
    } else {
      // Testing a saved rule
      const rule = await prisma.automationRule.findFirst({
        where: {
          id: ruleId,
          companyId: session.user.companyId,
        },
      });

      if (!rule) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }

      testConfig = {
        workflowId: rule.id,
        workflowDefinition: (rule.workflowDefinition as any) || undefined,
        triggerType: rule.triggerType,
        triggerConfig: rule.triggerConfig as any,
        conditions: (rule.conditions as any[]) || [],
        actions: (rule.actions as any[]) || [],
        skipDelays: body.skipDelays !== false,
        inputOverrides: body.inputOverrides || {},
      };
    }

    // Validate required fields
    if (!testConfig.triggerType) {
      return NextResponse.json(
        { error: "triggerType is required" },
        { status: 400 }
      );
    }

    // Start the test run
    const sessionId = await testSimulator.startTestRun(
      testConfig,
      session.user.companyId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      sessionId,
      message: "Test run started",
      streamUrl: `/api/automation-rules/${ruleId}/test/stream?session=${sessionId}`,
      statusUrl: `/api/automation-rules/${ruleId}/test/status?session=${sessionId}`,
    });
  } catch (error: any) {
    console.error("Test execution error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start test" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    message: "Test endpoint ready",
    endpoints: {
      start: `POST /api/automation-rules/${id}/test`,
      stream: `GET /api/automation-rules/${id}/test/stream?session=<sessionId>`,
      status: `GET /api/automation-rules/${id}/test/status?session=<sessionId>`,
    },
  });
}

