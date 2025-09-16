// /app/api/onboarding/instances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Template selection helper (uses .steps relation)
async function findBestOnboardingTemplate(employee: any) {
  // 1. By Job Role
  if (employee.jobRoleId) {
    const byJobRole = await prisma.onboardingTemplate.findFirst({
      where: { JobRole: { some: { id: employee.jobRoleId } } },
      include: { OnboardingStep: true },
    });
    if (byJobRole) return byJobRole;
  }
  // 2. By Department
  if (employee.departmentId) {
    const byDept = await prisma.onboardingTemplate.findFirst({
      where: { Department: { some: { id: employee.departmentId } } },
      include: { OnboardingStep: true },
    });
    if (byDept) return byDept;
  }
  // 3. Default (fallback)
  return await prisma.onboardingTemplate.findFirst({
    where: { isDefault: true },
    include: { OnboardingStep: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId required" },
        { status: 400 },
      );
    }

    // Fetch employee with dept/role
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { Department: true, JobRole: true },
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

    // Find correct template (with steps)
    const template = await findBestOnboardingTemplate(employee);
    if (!template) {
      return NextResponse.json(
        { error: "No onboarding template found" },
        { status: 400 },
      );
    }

    // Use related steps
    const steps = template.OnboardingStep;
    if (!steps || !steps.length) {
      return NextResponse.json(
        { error: "Onboarding template has no steps" },
        { status: 400 },
      );
    }

    // Create instance and step instances atomically
    const onboardingInstance = await prisma.onboardingInstance.create({
      data: {
        id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        templateId: template.id,
        status: "active",
        OnboardingStepInstance: {
          // <-- this matches your Prisma model
          create: steps.map((step, idx) => ({
            id: `step_instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${step.id}`,
            stepId: step.id,
            status: "pending",
            order: idx,
          })),
        },
      },
      include: { OnboardingStepInstance: true },
    });

    return NextResponse.json(onboardingInstance, { status: 201 });
  } catch (error) {
    console.error("OnboardingInstance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

