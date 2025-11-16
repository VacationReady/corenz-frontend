// /app/api/onboarding/instances/employee/[employeeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: any,
) {
  // 🔒 Authentication check
  const session = await getServerSession(authOptions);
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
        OnboardingTemplate: { select: { name: true } },
        OnboardingStepInstance: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(instances, { status: 200 });
  } catch (error) {
    console.error("Admin get onboarding instances error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
