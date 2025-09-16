// /app/api/onboarding/instances/employee/[employeeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } },
) {
  const { employeeId } = params;

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  try {
    // Fetch all onboarding instances for employee, newest first
    const instances = await prisma.onboardingInstance.findMany({
      where: { employeeId },
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
