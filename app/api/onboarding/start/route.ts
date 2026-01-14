// /app/api/onboarding/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

async function findBestOnboardingTemplate(employee: any, companyId: string) {
  // 1. By Job Role
  if (employee.jobRoleId) {
    const byJobRole = await prisma.onboardingTemplate.findFirst({
      where: {
        JobRole: { some: { id: employee.jobRoleId } },
        isActive: true,
        companyId,
      },
      include: { OnboardingStep: true },
    });
    if (byJobRole) return byJobRole;
  }

  // 2. By Department
  if (employee.departmentId) {
    const byDept = await prisma.onboardingTemplate.findFirst({
      where: {
        Department: { some: { id: employee.departmentId } },
        isActive: true,
        companyId,
      },
      include: { OnboardingStep: true },
    });
    if (byDept) return byDept;
  }

  // 3. Default (fallback)
  return prisma.onboardingTemplate.findFirst({
    where: { isDefault: true, isActive: true, companyId },
    include: { OnboardingStep: true },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const {
      employeeId,
      templateId: rawTemplateId,
      sendEmail = true,
    } = await req.json();
    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 },
      );
    }

    const templateId =
      typeof rawTemplateId === "string" && rawTemplateId.length > 0
        ? rawTemplateId
        : undefined;

    // Fetch employee with related user, dept, role scoped to company
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.user.companyId },
      include: { User: true, Department: true, JobRole: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Enhanced duplicate onboarding prevention
    // Check for any non-terminal onboarding instances (active, in_progress, or paused)
    const existingInstance = await prisma.onboardingInstance.findFirst({
      where: { 
        employeeId, 
        status: { in: ["active", "in_progress", "paused"] } 
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
      },
    });
    
    if (existingInstance) {
      return NextResponse.json(
        { 
          error: "Onboarding already in progress",
          existingInstanceId: existingInstance.id,
          existingStatus: existingInstance.status,
          startedAt: existingInstance.startedAt,
        },
        { status: 409 },
      );
    }

    // Check for recently completed onboarding (within 30 days)
    const recentlyCompleted = await prisma.onboardingInstance.findFirst({
      where: {
        employeeId,
        status: "completed",
        completedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
      },
      select: {
        id: true,
        completedAt: true,
      },
    });

    if (recentlyCompleted) {
      // Allow re-onboarding but log a warning
      console.warn(`[onboarding/start] Re-onboarding employee ${employeeId} who completed onboarding on ${recentlyCompleted.completedAt}`);
    }

    // Rate limiting: Prevent rapid re-triggering (5 second cooldown)
    const recentAttempt = await prisma.onboardingInstance.findFirst({
      where: {
        employeeId,
        startedAt: {
          gte: new Date(Date.now() - 5000), // 5 seconds ago
        },
      },
    });

    if (recentAttempt) {
      return NextResponse.json(
        { error: "Please wait before starting another onboarding" },
        { status: 429 },
      );
    }

    // Fetch related user for email notification and template resolution
    const user = employee.User;

    // Find a template to use
    let template: any;
    if (templateId) {
      template = await prisma.onboardingTemplate.findFirst({
        where: {
          id: templateId,
          isActive: true,
          companyId: session.user.companyId,
        },
        include: { OnboardingStep: true },
      });
    }
    if (!template) {
      template = await findBestOnboardingTemplate(
        employee,
        session.user.companyId,
      );
    }
    if (!template) {
      return NextResponse.json(
        { error: "No onboarding template found" },
        { status: 400 },
      );
    }
    if (!template.OnboardingStep?.length) {
      return NextResponse.json(
        { error: "Selected template has no steps" },
        { status: 400 },
      );
    }

    // Create assignment + instance + seed steps atomically
    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.onboardingAssignment.create({
        data: {
          id: crypto.randomUUID(),
          userId: employee.userId,
          templateId: template.id,
          progress: [],
        },
      });

      const onboardingInstance = await tx.onboardingInstance.create({
        data: {
          id: crypto.randomUUID(),
          employeeId,
          templateId: template.id,
          status: "active",
          startedAt: new Date(),
        },
      });

      await tx.onboardingStepInstance.createMany({
        data: template.OnboardingStep.map((step: any, index: number) => ({
          id: crypto.randomUUID(),
          onboardingInstanceId: onboardingInstance.id,
          stepId: step.id,
          status: "pending",
          order: step.order ?? index,
        })),
      });

      return { assignment, onboardingInstance };
    });

    if (sendEmail) {
      try {
        const baseUrl = getAppBaseUrl();
        const loginWithNext = `${baseUrl}/login?next=/${employee.id}/onboarding`;

        const { html, text } = renderPeopleCoreEmail({
          preheader: "Your PeopleCore onboarding is ready",
          title: "Welcome to PeopleCore",
          intro: [
            `Hi ${user.firstName || "there"},`,
            "Your onboarding journey has started. Log in to review your tasks and begin working through them.",
          ],
          sections: [
            {
              description: [
                "You can access your personalised onboarding checklist at any time from PeopleCore.",
              ],
            },
          ],
          ctas: {
            label: "Start Onboarding",
            href: loginWithNext,
          },
          outro: [
            "If you need any help, reach out to your HR team.",
            "Thank you,",
            "The PeopleCore Team",
          ],
        });

        await resend.emails.send({
          from: "PeopleCore Notifications <noreply@peoplecore.co.nz>",
          to: user.email,
          subject: "Welcome to PeopleCore – Your onboarding is ready",
          html,
          text,
        });
      } catch (e) {
        console.error("Failed to send onboarding email:", e);
        // continue without failing the request
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Start onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

