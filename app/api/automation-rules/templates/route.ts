import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import workflowLibrary from "@/lib/workflows/workflowLibrary";
import type { AutomationTriggerType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!(session as any)?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const popular = searchParams.get("popular") === "true";

    const installedRules = await prisma.automationRule.findMany({
      where: {
        companyId: (session as any).user.companyId,
        NOT: [{ templateId: null }],
      },
      select: { templateId: true, isActive: true },
    });

    let templates = workflowLibrary.templates;

    // Filter by category
    if (category && category !== "all") {
      templates = workflowLibrary.getByCategory(category);
    }

    // Filter by search query
    if (search) {
      templates = workflowLibrary.search(search);
    }

    // Get popular only
    if (popular) {
      templates = workflowLibrary.getPopular(10);
    }

    const templatesWithStatus = templates.map((template) => ({
      ...template,
      isInstalled: installedRules.some((r) => r.templateId === template.id),
      isActive: installedRules.find((r) => r.templateId === template.id)?.isActive || false,
    }));

    return NextResponse.json({ 
      templates: templatesWithStatus, 
      categories: workflowLibrary.categories,
      totalCount: workflowLibrary.templates.length,
      installedCount: installedRules.length,
    });
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
    const template = workflowLibrary.templates.find((w) => w.id === templateId);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Apply customizations to template nodes
    let customizedNodes = [...template.nodes];
    let customizedEdges = [...template.edges];

    if (customizations?.customizations) {
      customizedNodes = customizedNodes.map(node => {
        const nodeClone = { ...node, data: { ...node.data } };
        
        // Apply customizations based on node type and field
        if (nodeClone.data?.config) {
          Object.entries(customizations.customizations).forEach(([key, value]) => {
            if (nodeClone.data.config[key] !== undefined) {
              nodeClone.data.config[key] = value;
            }
          });
        }
        
        return nodeClone;
      });
    }

    // Handle duplicate names by appending a number
    let ruleName = customizations?.name || template.name;
    const companyId = (session as any).user.companyId;
    
    // Check if a rule with this name already exists
    const existingRule = await prisma.automationRule.findFirst({
      where: {
        companyId,
        name: ruleName,
      },
    });

    if (existingRule) {
      // Find a unique name by appending a number
      let counter = 2;
      let uniqueName = `${ruleName} (${counter})`;
      
      while (await prisma.automationRule.findFirst({
        where: { companyId, name: uniqueName },
      })) {
        counter++;
        uniqueName = `${ruleName} (${counter})`;
      }
      
      ruleName = uniqueName;
    }

    const rule = await prisma.automationRule.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        templateId: template.id,
        name: ruleName,
        description: template.description,
        category: template.category.id,
        isActive: customizations?.autoActivate !== false,
        triggerType: extractTriggerType(template),
        triggerConfig: extractTriggerConfig(template, customizations?.customizations),
        conditions: extractConditions(template, customizations?.customizations) as any,
        actions: extractActions(template, customizations?.customizations) as any,
        workflowDefinition: {
          nodes: customizedNodes,
          edges: customizedEdges,
          config: template.config,
          customizations: customizations?.customizations || {},
        } as any,
        createdBy: (session as any).user.id,
        tags: template.tags,
        version: 1,
        updatedAt: new Date(),
      },
    });

    await logTemplateUsage(templateId, (session as any).user.companyId);

    if (rule.triggerType === "SCHEDULED") {
      const schedule = (rule.triggerConfig as any)?.schedule || (rule.triggerConfig as any)?.cronExpression;
      console.info("[AutomationTemplates] Scheduled workflow installed", {
        ruleId: rule.id,
        name: rule.name,
        schedule,
      });
    }

    return NextResponse.json({ 
      success: true, 
      rule, 
      message: `Workflow "${rule.name}" has been added successfully!`,
      redirect: `/settings/automation-rules?highlight=${rule.id}`
    });
  } catch (error) {
    console.error("Error installing template:", error);
    return NextResponse.json({ error: "Failed to install workflow template" }, { status: 500 });
  }
}

function extractTriggerType(template: any): AutomationTriggerType {
  const triggerNode = (template.nodes || []).find((n: any) => n.type === "trigger");
  const type = triggerNode?.data?.config?.triggerType || triggerNode?.data?.triggerType || "MANUAL";

  // Map workflow triggers to AutomationTriggerType enum values
  const triggerMap: Record<string, AutomationTriggerType> = {
    "EMPLOYEE_CREATED": "EMPLOYEE_CREATED" as AutomationTriggerType,
    "EMPLOYEE_START_DATE": "EMPLOYEE_CREATED" as AutomationTriggerType,
    "ONBOARDING_STEP_COMPLETED": "ONBOARDING_STEP_COMPLETED" as AutomationTriggerType,
    "FORM_SUBMITTED": "FORM_SUBMITTED" as AutomationTriggerType,
    "DOCUMENT_EXPIRING": "DOCUMENT_EXPIRING" as AutomationTriggerType,
    "LEAVE_REQUEST": "FORM_SUBMITTED" as AutomationTriggerType,
    "SCHEDULED": "SCHEDULED" as AutomationTriggerType,
    "RESIGNATION_SUBMITTED": "FORM_SUBMITTED" as AutomationTriggerType,
    "OFFER_ACCEPTED": "EMPLOYEE_CREATED" as AutomationTriggerType,
    "MANUAL": "MANUAL" as AutomationTriggerType,
  };

  return triggerMap[type] || ("FORM_SUBMITTED" as AutomationTriggerType);
}

function extractTriggerConfig(template: any, customizations?: any): any {
  const triggerNode = (template.nodes || []).find((n: any) => n.type === "trigger");
  const config = { ...(triggerNode?.data?.config || {}) };
  const triggerType = triggerNode?.data?.config?.triggerType || triggerNode?.data?.triggerType;
  
  // Apply customizations
  if (customizations) {
    Object.entries(customizations).forEach(([key, value]) => {
      if (key in config) {
        config[key] = value;
      }
    });
  }

  if (triggerType === "SCHEDULED") {
    const cronExpression =
      customizations?.schedule ||
      customizations?.cronExpression ||
      config.schedule ||
      config.cronExpression;

    if (cronExpression) {
      config.schedule = cronExpression;
      config.cronExpression = cronExpression;
    }
  }
  
  return config;
}

function extractConditions(template: any, customizations?: any): any[] {
  return (template.nodes || [])
    .filter((n: any) => n.type === "condition")
    .map((n: any) => {
      const config = { ...(n.data?.config || {}) };
      
      // Apply customizations
      if (customizations) {
        Object.entries(customizations).forEach(([key, value]) => {
          if (key in config) {
            config[key] = value;
          }
        });
      }
      
      return {
        type: n.data?.conditionType || "custom",
        config,
      };
    });
}

function extractActions(template: any, customizations?: any): any[] {
  return (template.nodes || [])
    .filter((n: any) => n.type === "action")
    .map((n: any) => {
      const config = { ...(n.data?.config || {}) };
      
      // Apply customizations
      if (customizations) {
        Object.entries(customizations).forEach(([key, value]) => {
          if (key in config) {
            config[key] = value;
          }
        });
      }
      
      return {
        type: n.data?.actionType || n.data?.config?.actionType || "send_notification",
        config,
        order: n.position?.y || 0,
      };
    })
    .sort((a: any, b: any) => a.order - b.order);
}

async function logTemplateUsage(templateId: string, companyId: string) {
  // Log usage for analytics (WorkflowTemplate table will be created in migration)
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "WorkflowTemplate" ("id", "name", "usageCount", "createdAt", "updatedAt") 
       VALUES ($1, $2, 1, NOW(), NOW()) 
       ON CONFLICT ("id") DO UPDATE SET "usageCount" = "WorkflowTemplate"."usageCount" + 1`,
      templateId,
      templateId,
    );
  } catch (error) {
    // Table might not exist yet, log and continue
    console.log("Template usage logging skipped:", error);
  }
}


