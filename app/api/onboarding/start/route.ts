// /app/api/onboarding/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";

async function findBestOnboardingTemplate(employee: any) {
  // 1. By Job Role
  if (employee.jobRoleId) {
    const byJobRole = await prisma.onboardingTemplate.findFirst({
      where: { jobRoles: { some: { id: employee.jobRoleId } }, isActive: true },
      include: { steps: true },
    });
    if (byJobRole) return byJobRole;
  }

  // 2. By Department
  if (employee.departmentId) {
    const byDept = await prisma.onboardingTemplate.findFirst({
      where: { departments: { some: { id: employee.departmentId } }, isActive: true },
      include: { steps: true },
    });
    if (byDept) return byDept;
  }

  // 3. Default (fallback)
  return prisma.onboardingTemplate.findFirst({ where: { isDefault: true, isActive: true }, include: { steps: true } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { employeeId } = await req.json();
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    // Fetch employee with related user, dept, role
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true, department: true, jobRole: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Prevent duplicate onboarding
    const active = await prisma.onboardingInstance.findFirst({
      where: { employeeId, status: { in: ["active", "in_progress"] } },
    });
    if (active) {
      return NextResponse.json({ error: "Onboarding already in progress" }, { status: 409 });
    }

    // If user hasn't activated their account yet, notify HR and stop
    const user = employee.user;
    if (!user?.isActivated) {
      const hrEmail = session.user.email;
      if (hrEmail) {
        try {
          await resend.emails.send({
            from: "CoreNZ Notifications <onboarding@resend.dev>",
            to: hrEmail,
            subject: "Onboarding blocked: user not activated",
            html: `
              <p>Onboarding could not be started for ${user?.firstName || ""} ${user?.lastName || ""} (${user?.email}).</p>
              <p>The user has not activated their account or set a password yet.</p>
              <p>Please resend the activation email or assist them with first-time setup.</p>
            `,
          });
        } catch (e) {
          // Log but don't fail the request solely due to email issues
          console.error("Failed to send HR notification email:", e);
        }
      }
      return NextResponse.json({ error: "User not activated. Notified HR." }, { status: 409 });
    }

    // Find a template to use
    const template = await findBestOnboardingTemplate(employee);
    if (!template) {
      return NextResponse.json({ error: "No onboarding template found" }, { status: 400 });
    }
    if (!template.steps?.length) {
      return NextResponse.json({ error: "Selected template has no steps" }, { status: 400 });
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
        data: template.steps.map((step, index) => ({
          onboardingInstanceId: onboardingInstance.id,
          stepId: step.id,
          status: "pending",
          order: step.order ?? index,
        })),
      });

      return { assignment, onboardingInstance };
    });

    // Send onboarding invitation to employee
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
      const onboardingLink = `${baseUrl}/${employee.id}/onboarding`;
      const loginWithNext = `${baseUrl}/login?next=/${employee.id}/onboarding`;
      await resend.emails.send({
        from: "CoreNZ Notifications <onboarding@resend.dev>",
        to: user.email,
        subject: "Welcome to CoreNZ – Your onboarding is ready",
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

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Start onboarding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


