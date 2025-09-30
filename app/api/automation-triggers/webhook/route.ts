/**
 * Webhook trigger endpoint for workflows
 * Allows external systems to trigger workflows via HTTP
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workflowEngine } from "@/lib/workflows/WorkflowExecutionEngine";
import { z } from "zod";

const webhookSchema = z.object({
  workflowId: z.string().optional(),
  templateId: z.string().optional(),
  webhookKey: z.string().optional(),
  payload: z.any(),
});

export async function POST(req: NextRequest) {
  try {
    // Validate webhook key from headers
    const authHeader = req.headers.get("authorization");
    const webhookKey = authHeader?.replace("Bearer ", "") || 
                      req.nextUrl.searchParams.get("key");

    const body = await req.json();
    const { workflowId, templateId, payload } = webhookSchema.parse(body);

    // Find workflow by ID, template, or webhook key
    let workflow;
    
    if (workflowId) {
      workflow = await prisma.automationRule.findFirst({
        where: {
          id: workflowId,
          isActive: true,
          triggerType: "WEBHOOK",
        },
      });
    } else if (templateId) {
      workflow = await prisma.automationRule.findFirst({
        where: {
          templateId,
          isActive: true,
          triggerType: "WEBHOOK",
        },
      });
    } else if (webhookKey) {
      workflow = await prisma.automationRule.findFirst({
        where: {
          isActive: true,
          triggerType: "WEBHOOK",
          triggerConfig: {
            path: ["webhookKey"],
            equals: webhookKey,
          },
        },
      });
    }

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found or inactive" },
        { status: 404 }
      );
    }

    // Validate webhook key if configured
    const configuredKey = workflow.triggerConfig?.webhookKey;
    if (configuredKey && configuredKey !== webhookKey) {
      return NextResponse.json(
        { error: "Invalid webhook key" },
        { status: 401 }
      );
    }

    // Execute workflow
    const result = await workflowEngine.executeWorkflow(workflow.id, {
      triggerType: "WEBHOOK",
      payload,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: result.success,
      executionId: result.logs[0]?.timestamp, // Use first log timestamp as execution ID
      message: result.success 
        ? "Workflow executed successfully" 
        : result.error || "Workflow execution failed",
      logs: result.logs,
    });
  } catch (error: any) {
    console.error("Webhook trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Support GET for webhook testing
export async function GET(req: NextRequest) {
  const workflowId = req.nextUrl.searchParams.get("workflowId");
  
  if (!workflowId) {
    return NextResponse.json({
      message: "Webhook trigger endpoint",
      usage: "POST /api/automation-triggers/webhook",
      params: {
        workflowId: "string (optional)",
        templateId: "string (optional)", 
        webhookKey: "string (optional - via header or query)",
        payload: "any (required)",
      },
    });
  }

  // Return webhook URL for specific workflow
  const workflow = await prisma.automationRule.findUnique({
    where: { id: workflowId },
    select: { id: true, name: true, triggerType: true, triggerConfig: true },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://peoplecore.app";
  const webhookKey = workflow.triggerConfig?.webhookKey;
  
  return NextResponse.json({
    workflow: workflow.name,
    webhookUrl: `${baseUrl}/api/automation-triggers/webhook?workflowId=${workflow.id}`,
    webhookKey: webhookKey ? "Required (use Authorization header)" : "Not required",
    method: "POST",
    headers: webhookKey ? { Authorization: `Bearer ${webhookKey}` } : {},
    body: { payload: "Your data here" },
  });
}
