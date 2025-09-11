import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

const DryRunSchema = z.object({
  ruleId: z.string().cuid(),
});

// POST: Run a dry test of an automation rule
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ruleId } = DryRunSchema.parse(body);

    // Fetch the automation rule
    const rule = await prisma.automationRule.findFirst({
      where: {
        id: ruleId,
        companyId: session.user.companyId,
      },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Simulate rule execution based on trigger type
    let matchingEmployees = 0;
    let preview: any[] = [];

    const triggerConfig = rule.triggerConfig as any;

    switch (rule.triggerType) {
      case 'DOCUMENT_EXPIRING':
        // Simulate document expiry check
        const daysBefore = triggerConfig?.daysBefore || 30;
        const expiringDocs = await prisma.employmentCheck.count({
          where: {
            employee: {
              companyId: session.user.companyId,
              isActive: true,
            },
            expiryDate: {
              gte: new Date(),
              lte: new Date(Date.now() + daysBefore * 24 * 60 * 60 * 1000),
            },
          },
        });
        matchingEmployees = expiringDocs;
        preview = [
          {
            action: "Document Expiry Check",
            description: `Found ${expiringDocs} documents expiring in the next ${daysBefore} days`,
          },
        ];
        break;

      case 'FORM_SUBMITTED':
        // Simulate form submission check
        const formId = triggerConfig?.formId;
        if (formId) {
          const recentSubmissions = await prisma.formSubmission.count({
            where: {
              formId,
              employee: {
                companyId: session.user.companyId,
              },
              submittedAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
          });
          matchingEmployees = recentSubmissions;
          preview = [
            {
              action: "Form Submission Check",
              description: `Found ${recentSubmissions} form submissions in the last 24 hours`,
            },
          ];
        }
        break;

      case 'ONBOARDING_STEP_COMPLETED':
        // Simulate onboarding step completion check
        const completedSteps = await prisma.onboardingStepInstance.count({
          where: {
            status: 'completed',
            onboardingInstance: {
              employee: {
                companyId: session.user.companyId,
                isActive: true,
              },
            },
            completedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        });
        matchingEmployees = completedSteps;
        preview = [
          {
            action: "Onboarding Step Check",
            description: `Found ${completedSteps} completed onboarding steps in the last 24 hours`,
          },
        ];
        break;

      case 'EMPLOYEE_CREATED':
        // Simulate new employee check
        const newEmployees = await prisma.employee.count({
          where: {
            companyId: session.user.companyId,
            isActive: true,
            user: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
          },
        });
        matchingEmployees = newEmployees;
        preview = [
          {
            action: "New Employee Check",
            description: `Found ${newEmployees} new employees created in the last 24 hours`,
          },
        ];
        break;
    }

    // Simulate actions that would be executed
    const actions = (rule.actions as any[]) || [];
    const actionsToRun = matchingEmployees * actions.length;

    // Add action previews
    actions.forEach((action: any, index: number) => {
      let actionDescription = '';
      
      switch (action.type) {
        case 'create_task':
          actionDescription = `Create task: "${action.config?.title || 'Untitled Task'}"`;
          break;
        case 'send_notification':
          const channels = action.config?.channels?.join(', ') || 'email';
          actionDescription = `Send notification via ${channels}`;
          break;
        case 'start_onboarding':
          actionDescription = `Start onboarding template`;
          break;
        case 'update_field':
          actionDescription = `Update employee field: ${action.config?.field}`;
          break;
        default:
          actionDescription = `Execute ${action.type}`;
      }

      preview.push({
        action: `Action ${index + 1}`,
        description: actionDescription,
      });
    });

    // Estimate runtime (rough calculation)
    const estimatedRuntime = Math.max(1, Math.ceil(actionsToRun / 10)); // Assume 10 actions per second

    return NextResponse.json({
      matchingEmployees,
      actionsToRun,
      estimatedRuntime,
      preview,
      conditions: ((rule.conditions as any[]) || []).length,
      wouldExecute: matchingEmployees > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/automation-rules/dry-run error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to run dry test" },
      { status: 500 }
    );
  }
}
