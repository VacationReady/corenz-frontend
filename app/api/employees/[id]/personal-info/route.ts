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

    // Require admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!employee || employee.user.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, any>;
    const allowed = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "addressStreet",
      "addressCity",
      "addressPostcode",
      "addressCountry",
      "emergencyContactName",
      "emergencyContactRelationship",
      "emergencyContactPhone",
      "nationalId",
      "residencyStatus",
      "pronouns",
      "genderOptionId",
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

    const before = employee.user;

    const updated = await prisma.user.update({
      where: { id: before.id },
      data: updates,
    });

    // Audit per field
    const changedFields = Object.keys(updates) as Array<keyof typeof updates>;
    if (changedFields.length > 0) {
      await prisma.personalInfoAudit.createMany({
        data: changedFields.map((field) => ({
          companyId: session.user.companyId!,
          subjectUserId: before.id,
          changedById: session.user.id,
          field,
          oldValue: serialize(before as any, field as string),
          newValue: serialize(updated as any, field as string),
        })),
      });
    }

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    console.error("[personal-info-update]", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}

function serialize(obj: any, key: string): string | null {
  const val = obj?.[key];
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
