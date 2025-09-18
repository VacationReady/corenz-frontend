import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { computeDiffs, createAuditLogs } from "@/lib/audit-helpers";

// GET: Retrieve form data for an employee
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 },
    );
  }

  try {
    // Verify the form exists and belongs to the company
    const form = await prisma.form.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
        isActive: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Verify the employee belongs to the company
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Determine read-only rules for EMPLOYEE role based on onboarding
    let readOnly = false;
    if (session.user.role === "EMPLOYEE") {
      // If there is an active/in_progress onboarding instance AND it contains this form step
      // that is not yet completed, then editable; otherwise read-only
      const activeInstance = await prisma.onboardingInstance.findFirst({
        where: { employeeId, status: { in: ["active", "in_progress"] } },
        include: {
          OnboardingStepInstance: { include: { OnboardingStep: true } },
        },
      });
      if (!activeInstance) {
        readOnly = true;
      } else {
        const stepForForm = activeInstance.OnboardingStepInstance.find(
          (s) => s.OnboardingStep?.formId === params.id,
        );
        readOnly = !stepForForm || stepForForm.status === "completed";
      }
    }

    // Get the data record for this form and employee
    const dataRecord = await prisma.formDataRecord.findUnique({
      where: {
        formId_employeeId: {
          formId: params.id,
          employeeId: employeeId,
        },
      },
    });

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        formType: form.formType,
        schema: form.schema,
      },
      data: dataRecord?.data || {},
      lastUpdated: dataRecord?.updatedAt || null,
      readOnly,
    });
  } catch (error) {
    console.error("Error fetching form data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST/PUT: Save or update form data for an employee
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { employeeId, data, reasons } = await req.json();

  if (!employeeId || !data) {
    return NextResponse.json(
      { error: "employeeId and data are required" },
      { status: 400 },
    );
  }

  try {
    // Verify the form exists and belongs to the company
    const form = await prisma.form.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
        isActive: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Verify the employee belongs to the company
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Upsert the data record (create or update)
    const existing = await prisma.formDataRecord.findUnique({
      where: {
        formId_employeeId: {
          formId: params.id,
          employeeId,
        },
      },
    });

    // Ensure we only diff plain object maps (ignore primitives/arrays)
    const beforeRaw: any = existing?.data ?? {};
    const afterRaw: any = data ?? {};
    const beforeObj: Record<string, any> =
      beforeRaw && typeof beforeRaw === "object" && !Array.isArray(beforeRaw)
        ? (beforeRaw as Record<string, any>)
        : {};
    const afterObj: Record<string, any> =
      afterRaw && typeof afterRaw === "object" && !Array.isArray(afterRaw)
        ? (afterRaw as Record<string, any>)
        : {};

    const allowed = Array.from(
      new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]),
    ) as readonly string[];
    const diffs = computeDiffs(beforeObj, afterObj, allowed);

    if (diffs.some((d) => d.newValue)) {
      try {
        await createAuditLogs({
          companyId: session.user.companyId!,
          employeeId,
          section: `forms:${params.id}`,
          diffs,
          reasons: reasons || {},
          changedById: session.user.id,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    const dataRecord = await prisma.formDataRecord.upsert({
      where: {
        formId_employeeId: {
          formId: params.id,
          employeeId: employeeId,
        },
      },
      update: {
        data: data,
      },
      create: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        formId: params.id,
        employeeId: employeeId,
        data: data,
      },
    });

    return NextResponse.json(dataRecord, { status: 200 });
  } catch (error) {
    console.error("Error saving form data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
