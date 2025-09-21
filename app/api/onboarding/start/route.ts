// /app/api/onboarding/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
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
  const session = await getServerSession(authOptions);
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

    // Prevent duplicate onboarding
    const active = await prisma.onboardingInstance.findFirst({
      where: { employeeId, status: { in: ["active", "in_progress"] } },
    });
    if (active) {
      return NextResponse.json(
        { error: "Onboarding already in progress" },
        { status: 409 },
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
          id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: employee.userId,
          templateId: template.id,
          progress: [],
        },
      });

      const onboardingInstance = await tx.onboardingInstance.create({
        data: {
          id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          employeeId,
          templateId: template.id,
          status: "active",
          startedAt: new Date(),
        },
      });

      await tx.onboardingStepInstance.createMany({
        data: template.OnboardingStep.map((step: any, index: number) => ({
          id: `step_instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${step.id}`,
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

