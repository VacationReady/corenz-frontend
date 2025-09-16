import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ruleIds, daysBefore, notifyAdmin, notifyManager, notifyEmployee } =
      body || {};
    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      return NextResponse.json(
        { error: "ruleIds is required" },
        { status: 400 },
      );
    }

    const updated = await prisma.expiryRule.updateMany({
      where: { id: { in: ruleIds } },
      data: {
        ...(daysBefore !== undefined && { daysBefore }),
        ...(notifyAdmin !== undefined && { notifyAdmin }),
        ...(notifyManager !== undefined && { notifyManager }),
        ...(notifyEmployee !== undefined && { notifyEmployee }),
      },
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error("[expiry-rules bulk]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

