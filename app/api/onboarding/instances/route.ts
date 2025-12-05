// /app/api/onboarding/instances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// Template selection helper (uses .steps relation)
async function findBestOnboardingTemplate(employee: any, companyId: string) {
  // 1. By Job Role
  if (employee.jobRoleId) {
    const byJobRole = await prisma.onboardingTemplate.findFirst({
      where: { 
        companyId,
        JobRole: { some: { id: employee.jobRoleId } } 
      },
      include: { OnboardingStep: true },
    });
    if (byJobRole) return byJobRole;
  }
  // 2. By Department
  if (employee.departmentId) {
    const byDept = await prisma.onboardingTemplate.findFirst({
      where: { 
        companyId,
        Department: { some: { id: employee.departmentId } } 
      },
      include: { OnboardingStep: true },
    });
    if (byDept) return byDept;
  }
  // 3. Default (fallback)
  return await prisma.onboardingTemplate.findFirst({
    where: { companyId, isDefault: true },
    include: { OnboardingStep: true },
  });
}

export async function POST(req: NextRequest) {
  // 🔒 Authentication check
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { employeeId } = await req.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId required" },
        { status: 400 },
      );
    }

    // 🔒 Tenant-scoped employee lookup
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { Department: true, JobRole: true },
      // Implicit: employee must exist; we'll check companyId next
    });
    
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // 🔒 Tenant boundary check
    if (employee.companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: Cross-tenant access denied" },
        { status: 403 },
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

    // 🔒 Find correct template (with steps) - scoped to tenant
    const template = await findBestOnboardingTemplate(employee, session.user.companyId);
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

