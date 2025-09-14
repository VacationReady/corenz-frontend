// /app/api/onboarding/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";

async function findBestOnboardingTemplate(employee: any, companyId: string) {
  // 1. By Job Role
  if (employee.jobRoleId) {
    const byJobRole = await prisma.onboardingTemplate.findFirst({
      where: {
        jobRoles: { some: { id: employee.jobRoleId } },
        isActive: true,
        companyId,
      },
      include: { steps: true },
    });
    if (byJobRole) return byJobRole;
  }

  // 2. By Department
  if (employee.departmentId) {
    const byDept = await prisma.onboardingTemplate.findFirst({
      where: {
        departments: { some: { id: employee.departmentId } },
        isActive: true,
        companyId,
      },
      include: { steps: true },
    });
    if (byDept) return byDept;
  }

  // 3. Default (fallback)
  return prisma.onboardingTemplate.findFirst({
    where: { isDefault: true, isActive: true, companyId },
    include: { steps: true },
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
      include: { user: true, department: true, jobRole: true },
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
    const user = employee.user;

    // Find a template to use
    let template: any;
    if (templateId) {
      template = await prisma.onboardingTemplate.findFirst({
        where: {
          id: templateId,
          isActive: true,
          companyId: session.user.companyId,
        },
        include: { steps: true },
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
    if (!template.steps?.length) {
      return NextResponse.json(
        { error: "Selected template has no steps" },
        { status: 400 },
      );
    }

    // Create assignment + instance + seed steps atomically
    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.onboardingAssignment.create({
        data: {
          userId: employee.userId,
          templateId: template.id,
          progress: [],
        },
      });

      const onboardingInstance = await tx.onboardingInstance.create({
        data: {
          employeeId,
          templateId: template.id,
          status: "active",
          startedAt: new Date(),
        },
      });

      await tx.onboardingStepInstance.createMany({
        data: template.steps.map((step: any, index: number) => ({
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
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.NEXT_PUBLIC_BASE_URL ||
          "";
        const onboardingLink = `${baseUrl}/${employee.id}/onboarding`;
        const loginWithNext = `${baseUrl}/login?next=/${employee.id}/onboarding`;
        await resend.emails.send({
          from: "PeopleCore Notifications <noreply@peoplecore.co.nz>",
          to: user.email,
          subject: "Welcome to PeopleCore – Your onboarding is ready",
          html: `
            <p>Hi ${user.firstName || "there"},</p>
            <p>Your onboarding has been started. Please log in and complete your onboarding steps.</p>
            <p><a href="${loginWithNext}">Login to start onboarding</a></p>
            <p>Thank you,<br/>HR Team</p>
          `,
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
