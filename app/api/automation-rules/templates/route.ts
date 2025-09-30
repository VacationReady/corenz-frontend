import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { defaultWorkflows } from "@/lib/workflows/defaultWorkflows";
import type { AutomationTriggerType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!(session as any)?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const installedRules = await prisma.automationRule.findMany({
      where: {
        companyId: (session as any).user.companyId,
        NOT: [{ templateId: null }],
      },
      select: { templateId: true, isActive: true },
    });

    const templates = defaultWorkflows.map((template) => ({
      ...template,
      isInstalled: installedRules.some((r) => r.templateId === template.id),
      isActive: installedRules.find((r) => r.templateId === template.id)?.isActive || false,
    }));

    return NextResponse.json({ templates, categories: getCategories() });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "Failed to fetch workflow templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!(session as any)?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId, customizations } = await req.json();
    const template = defaultWorkflows.find((w) => w.id === templateId);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const rule = await prisma.automationRule.create({
      data: {
        id: crypto.randomUUID(),
        companyId: (session as any).user.companyId,
        templateId: template.id,
        name: customizations?.name || template.name,
        description: template.description,
        category: (template as any).category,
        isActive: customizations?.autoActivate || false,
        triggerType: extractTriggerType(template),
        triggerConfig: extractTriggerConfig(template),
        conditions: extractConditions(template) as any,
        actions: extractActions(template) as any,
        workflowDefinition: {
          nodes: (template as any).nodes,
          edges: (template as any).edges,
          config: (template as any).config,
        } as any,
        createdBy: (session as any).user.id,
        tags: (template as any).tags,
        version: 1,
        updatedAt: new Date(),
      },
    });

    await logTemplateUsage(templateId, (session as any).user.companyId);

    return NextResponse.json({ success: true, rule, message: `Workflow "${rule.name}" created successfully` });
  } catch (error) {
    console.error("Error installing template:", error);
    return NextResponse.json({ error: "Failed to install workflow template" }, { status: 500 });
  }
}

function extractTriggerType(template: any): AutomationTriggerType {
  const triggerNode = (template.nodes || []).find((n: any) => n.type === "trigger");
  const type = triggerNode?.data?.config?.triggerType || "MANUAL";
  return type as AutomationTriggerType;
}

function extractTriggerConfig(template: any): any {
  const triggerNode = (template.nodes || []).find((n: any) => n.type === "trigger");
  return triggerNode?.data?.config || {};
}

function extractConditions(template: any): any[] {
  return (template.nodes || [])
    .filter((n: any) => n.type === "condition")
    .map((n: any) => n.data?.config || []);
}

function extractActions(template: any): any[] {
  return (template.nodes || [])
    .filter((n: any) => n.type === "action")
    .map((n: any) => ({
      type: n.data?.actionType,
      config: n.data?.config || {},
      order: n.position?.y || 0,
    }))
    .sort((a: any, b: any) => a.order - b.order);
}

async function logTemplateUsage(templateId: string, companyId: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE "WorkflowTemplate" SET "usageCount" = "usageCount" + 1 WHERE "id" = $1`,
    templateId,
  );
}

function getCategories() {
  return [
    { id: "compliance", label: "Compliance & Legal", icon: "⚖️", count: 3 },
    { id: "hr", label: "HR Operations", icon: "👥", count: 3 },
    { id: "engagement", label: "Employee Engagement", icon: "🎯", count: 2 },
    { id: "operations", label: "Daily Operations", icon: "⚙️", count: 2 },
  ];
}


