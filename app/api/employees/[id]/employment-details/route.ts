import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        user: {
          select: {
            manager: { select: { id: true, firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      employmentType: employee.employmentType,
      contractType: employee.contractType,
      siteLocation: employee.siteLocation,
      startDate: employee.startDate,
      department: employee.user?.department,
      manager: employee.user?.manager,
      salaryAmount: employee.salaryAmount,
      hourlyRate: employee.hourlyRate,
      isActive: employee.isActive,
    });
  } catch (e: any) {
    console.error("[employment-details-get]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

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

    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, any>;
    const updates: Record<string, any> = {};
    const keys = [
      "employmentType",
      "contractType",
      "siteLocation",
      "startDate",
      "departmentId",
      "managerId",
      "salaryAmount",
      "hourlyRate",
      "isActive",
    ] as const;
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updates[key] = body[key as string];
      }
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...updates,
        ...(updates.managerId ? { user: { update: { managerId: updates.managerId } } } : {}),
        ...(updates.departmentId
          ? { user: { update: { departmentId: updates.departmentId } } }
          : {}),
      },
    });

    return NextResponse.json({ ok: true, employee: updated });
  } catch (e: any) {
    console.error("[employment-details-patch]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}


