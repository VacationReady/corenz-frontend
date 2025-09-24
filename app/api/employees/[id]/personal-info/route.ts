import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { computeDiffs, createAuditLogs, diffRequiresReason, serialize } from "@/lib/audit-helpers";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { User: true },
    });
    if (!employee || employee.User.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, any>;
    const { reasons, section: _section, ...updateFields } = body;
    const allowed = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "addressStreet",
      "addressCity",
      "addressPostcode",
      "addressCountry",
      "nationalId",
      "pronouns",
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

    const before = employee.User;

    // Compute diffs before update
    const diffs = computeDiffs(before, { ...before, ...updates }, allowed);
    
    // Check if reasons are required and provided
    if (diffs.length > 0) {
      const requiresReasons = diffs.some(diffRequiresReason);
      if (requiresReasons && !reasons) {
        return NextResponse.json(
          { error: "Reasons required for changes" },
          { status: 400 }
        );
      }

      try {
        await createAuditLogs({
          companyId: session.user.companyId!,
          employeeId: employee.id,
          section: "personal-info",
          diffs,
          reasons: (reasons as Record<string, string>) || {},
          changedById: session.user.id,
        });
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: before.id },
      data: updates,
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    console.error("[personal-info-update]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
