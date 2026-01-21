// /app/api/onboarding/instances/employee/[employeeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: any,
) {
  // 🔒 Authentication check
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { employeeId } = rawParams?.then ? await rawParams : rawParams;

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  // 🔒 Tenant-scoped access control: Verify employee belongs to user's company
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { companyId: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (employee.companyId !== session.user.companyId) {
    return NextResponse.json(
      { error: "Forbidden: Cross-tenant access denied" },
      { status: 403 },
    );
  }

  try {
    // Fetch all onboarding instances for employee, newest first
    const instances = await prisma.onboardingInstance.findMany({
      where: {
        employeeId,
        OnboardingTemplate: { companyId: session.user.companyId },
      },
      orderBy: { startedAt: "desc" },
      include: {
        OnboardingTemplate: { 
          include: {
            OnboardingStep: {
              select: {
                id: true,
                type: true,
                label: true,
                order: true,
              },
            },
          },
        },
        OnboardingStepInstance: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Normalize response structure for admin view
    const normalized = instances.map(instance => ({
      id: instance.id,
      template: { name: instance.OnboardingTemplate.name },
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      status: instance.status,
      steps: instance.OnboardingStepInstance.map(stepInst => {
        const templateStep = instance.OnboardingTemplate.OnboardingStep?.find(
          (ts: any) => ts.id === stepInst.stepId
        );
        return {
          id: stepInst.id,
          type: templateStep?.type || 'unknown',
          label: templateStep?.label,
          status: stepInst.status,
          order: stepInst.order,
          completedAt: stepInst.completedAt,
        };
      }),
    }));

    return NextResponse.json(normalized, { status: 200 });
  } catch (error) {
    console.error("Admin get onboarding instances error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
