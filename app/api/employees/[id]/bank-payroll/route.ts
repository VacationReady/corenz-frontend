import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

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
    const allowed = [
      "bankAccountNumber",
      "taxCode",
      "kiwiSaverEnrolled",
      "kiwiSaverContribution",
    ] as const;

    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updates[key] = body[key as string];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
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


