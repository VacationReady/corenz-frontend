// /app/api/onboarding/assignments/route.ts
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Find any active assignment for this user scoped to their company
  const assignment = await prisma.onboardingAssignment.findFirst({
    where: {
      userId: session.user.id,
      completedAt: null,
      template: { companyId: session.user.companyId },
      User: { companyId: session.user.companyId },
    },
    include: { template: { include: { steps: true } } },
  });

  return NextResponse.json({ assignment });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { templateId, userId, employeeId } = await req.json();

  if (!templateId || !userId || !employeeId) {
    return NextResponse.json(
      { error: "templateId, userId, and employeeId are required" },
      { status: 400 },
    );
  }

  // Ensure template belongs to company
  const template = await prisma.onboardingTemplate.findFirst({
    where: { id: templateId, companyId: session.user.companyId },
    include: { steps: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Ensure employee belongs to company
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: session.user.companyId },
    include: { User: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Optional: validate provided userId matches employee's userId
  if (employee.userId !== userId) {
    return NextResponse.json(
      { error: "User does not match employee" },
      { status: 400 },
    );
  }

  // Transaction: Create assignment, instance, and seed steps atomically
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create onboarding assignment
    const assignment = await tx.onboardingAssignment.create({
      data: {
        userId: employee.userId,
        templateId: template.id,
        progress: [],
      },
    });

    // 2. Create onboarding instance
    const onboardingInstance = await tx.onboardingInstance.create({
      data: {
        employeeId: employee.id,
        templateId: template.id,
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
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { onboardingInstanceId } = await req.json();

  if (!onboardingInstanceId) {
    return NextResponse.json(
      { error: "onboardingInstanceId is required" },
      { status: 400 },
    );
  }

  // Fetch instance with steps and related assignment, scoped to company
  const instance = await prisma.onboardingInstance.findFirst({
    where: {
      id: onboardingInstanceId,
      Employee: { companyId: session.user.companyId },
      template: { companyId: session.user.companyId },
    },
    include: {
      steps: true,
      Employee: { include: { User: true } },
    },
  });

  if (!instance) {
    return NextResponse.json(
      { error: "Onboarding instance not found" },
      { status: 404 },
    );
  }

  const allCompleted = instance.steps.every(
    (step) => step.status === "completed",
  );

  if (allCompleted) {
    await prisma.onboardingAssignment.updateMany({
      where: {
        userId: instance.employee.userId,
        templateId: instance.templateId,
        completedAt: null,
        template: { companyId: session.user.companyId },
        User: { companyId: session.user.companyId },
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

