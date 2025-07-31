// /app/api/onboarding/assignments/route.ts
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Find any active assignment for this user
  const assignment = await prisma.onboardingAssignment.findFirst({
    where: {
      userId: session.user.id,
      completedAt: null,
    },
    include: { template: { include: { steps: true } } },
  });

  return NextResponse.json({ assignment });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { templateId, userId, employeeId } = await req.json();

  if (!templateId || !userId || !employeeId) {
    return NextResponse.json({ error: "templateId, userId, and employeeId are required" }, { status: 400 });
  }

  // ✅ Fetch template with steps
  const template = await prisma.onboardingTemplate.findUnique({
    where: { id: templateId },
    include: { steps: true },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // ✅ Transaction: Create assignment, instance, and seed steps atomically
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create onboarding assignment
    const assignment = await tx.onboardingAssignment.create({
      data: {
        userId,
        templateId,
        progress: [],
      },
    });

    // 2. Create onboarding instance
    const onboardingInstance = await tx.onboardingInstance.create({
      data: {
        employeeId,
        templateId,
        status: "active",
        startedAt: new Date(),
      },
    });

    // 3. Seed step instances for this onboarding instance
    await tx.onboardingStepInstance.createMany({
      data: template.steps.map((step) => ({
        onboardingInstanceId: onboardingInstance.id,
        stepId: step.id,
        status: "pending",
        order: step.order,
      })),
    });

    return { assignment, onboardingInstance };
  });

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { onboardingInstanceId } = await req.json();

  if (!onboardingInstanceId) {
    return NextResponse.json({ error: "onboardingInstanceId is required" }, { status: 400 });
  }

  // Fetch instance with steps and related assignment
  const instance = await prisma.onboardingInstance.findUnique({
    where: { id: onboardingInstanceId },
    include: {
      steps: true,
      employee: { include: { user: true } },
    },
  });

  if (!instance) {
    return NextResponse.json({ error: "Onboarding instance not found" }, { status: 404 });
  }

  const allCompleted = instance.steps.every((step) => step.status === "completed");

  if (allCompleted) {
    await prisma.onboardingAssignment.updateMany({
      where: {
        userId: instance.employee.userId,
        templateId: instance.templateId,
        completedAt: null,
      },
      data: { completedAt: new Date() },
    });

    await prisma.onboardingInstance.update({
      where: { id: instance.id },
      data: { status: "completed" },
    });
  }

  return NextResponse.json({ success: true, completed: allCompleted });
}
