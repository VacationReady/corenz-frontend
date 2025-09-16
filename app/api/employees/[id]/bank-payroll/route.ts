import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { computeDiffs, createAuditLogs } from "@/lib/audit-helpers";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!employee || employee.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, any>;
    const { reasons, ...updateFields } = body;
    
    const allowed = [
      "bankAccountNumber",
      "taxCode",
      "kiwiSaverEnrolled",
      "kiwiSaverContribution",
    ] as const;

    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updateFields, key)) {
        updates[key] = updateFields[key as string];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Compute diffs before update
    const diffs = computeDiffs(employee, { ...employee, ...updates }, allowed);
    
    // Check if reasons are required and provided
    if (diffs.some(diff => diff.newValue)) {
      if (!reasons) {
        return NextResponse.json(
          { error: "Reasons required for changes" },
          { status: 400 }
        );
      }
      
      // Validate reasons (will throw if missing)
      try {
        await createAuditLogs({
          companyId: session.user.companyId!,
          employeeId: employee.id,
          section: "bank-payroll",
          diffs,
          reasons: reasons as Record<string, string>,
          changedById: session.user.id,
        });
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: updates,
    });

    return NextResponse.json({ ok: true, employee: updated });
  } catch (e: any) {
    console.error("[bank-payroll-update]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!employee || employee.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      bankAccountNumber: employee.bankAccountNumber,
      taxCode: employee.taxCode,
      kiwiSaverEnrolled: employee.kiwiSaverEnrolled,
      kiwiSaverContribution: employee.kiwiSaverContribution,
    });
  } catch (e: any) {
    console.error("[bank-payroll-get]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}


