/**
 * AI Workflow Generation Endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import {
  isAIEnabled,
  validateAPIKey,
  checkRateLimit,
} from "@/lib/ai/openai-client";
import {
  generateWorkflow,
  refineWorkflow,
  explainWorkflow,
  handleNodeDiscovery,
} from "@/lib/ai/workflow-generator";
import { prisma } from "@/lib/prisma";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

async function postHandler(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (!isAIEnabled()) {
      const validation = validateAPIKey();
      return NextResponse.json(
        { error: validation.error || "AI not enabled" },
        { status: 503 }
      );
    }

    const rateLimit = checkRateLimit(session.user.id, 50, 3600000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetAt: rateLimit.resetAt },
        { status: 429 }
      );
    }

    const { action, prompt, workflow, refinement } = await req.json();

    switch (action) {
      case "generate":
        if (!prompt) {
          return NextResponse.json(
            { error: "Prompt is required" },
            { status: 400 }
          );
        }
        const result = await generateWorkflow(prompt, session.user.companyId);
        
        // Handle clarification needed case
        if (!result.success && result.error === "CLARIFICATION_NEEDED") {
          return NextResponse.json({
            success: false,
            error: "CLARIFICATION_NEEDED",
            clarification: result.clarification,
          });
        }
        
        return NextResponse.json(result);

      case "refine":
        if (!workflow || !refinement) {
          return NextResponse.json(
            { error: "Workflow and refinement prompt required" },
            { status: 400 }
          );
        }
        const refined = await refineWorkflow(workflow, refinement);
        return NextResponse.json(refined);

      case "explain":
        if (!workflow) {
          return NextResponse.json(
            { error: "Workflow is required" },
            { status: 400 }
          );
        }
        const explanation = await explainWorkflow(workflow);
        return NextResponse.json({ success: true, explanation });

      case "save":
        if (!workflow) {
          return NextResponse.json(
            { error: "Workflow is required" },
            { status: 400 }
          );
        }
        const saved = await saveWorkflow(workflow, session.user);
        return NextResponse.json(saved);

      case "discover":
        if (!prompt) {
          return NextResponse.json(
            { error: "Query is required for discovery" },
            { status: 400 }
          );
        }
        const discovery = await handleNodeDiscovery(prompt);
        return NextResponse.json(discovery);

      case "report":
        if (!prompt) {
          return NextResponse.json(
            { error: "Query is required for report discovery" },
            { status: 400 }
          );
        }
        const reportDiscovery = await handleNodeDiscovery(prompt);
        return NextResponse.json(reportDiscovery);

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("[AI Workflow Error]", error);
    return NextResponse.json(
      { error: error.message || "Workflow generation failed" },
      { status: 500 }
    );
  }
}

async function saveWorkflow(workflow: any, user: any) {
  try {
    // Determine trigger type from first trigger node
    const triggerNode = workflow.nodes?.find((n: any) => n.type === "trigger");
    const triggerType = triggerNode?.data?.triggerType || "MANUAL";

    // Create automation rule
    const rule = await prisma.automationRule.create({
      data: {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        companyId: user.companyId,
        name: workflow.name || "AI Generated Workflow",
        description: workflow.description || "",
        isActive: false, // Start disabled for safety
        triggerType,
        triggerConfig: triggerNode?.data?.config || {},
        conditions: {},
        actions: {},
        workflowDefinition: {
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
        },
        category: workflow.category || "custom",
        tags: ["ai-generated"],
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      ruleId: rule.id,
      message: "Workflow saved successfully",
      warning: "Workflow is disabled by default. Review and activate in Settings > Automation Rules",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to save workflow",
    };
  }
}

// GET examples
async function getHandler() {
  return NextResponse.json({
    examples: [
      "Send a reminder to managers 5 days before probation ends",
      "Alert HR when a contract expires in 60 days",
      "Welcome new Engineering hires with IT setup form",
      "Notify manager when employee leave balance is low",
      "Create review task for employees after 90 days",
      "Send birthday wishes to employees",
      "Remind about expiring visas 30 days before",
      "Escalate if onboarding form not completed in 7 days",
    ],
    capabilities: [
      "Trigger on employee events (created, start date, probation end)",
      "Trigger on document/contract expiry",
      "Send emails to employees, managers, or HR",
      "Create action items and tasks",
      "Assign forms and request documents",
      "Filter by department, role, location",
      "Add delays and schedules",
      "Conditional logic and branching",
    ],
  });
}

// Apply feature guard to all handlers
const aiGuard = withFeatureGuard(FEATURE_KEYS.AI_ASSISTANT);
export const POST = aiGuard(postHandler);
export const GET = aiGuard(getHandler);

