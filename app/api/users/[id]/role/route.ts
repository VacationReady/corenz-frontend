import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

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

    const body = await req.json().catch(() => ({}));
    const role = body?.role as string | undefined;
    if (!role || !["ADMIN", "MANAGER", "EMPLOYEE"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: role as Role },
      select: { id: true, role: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}


