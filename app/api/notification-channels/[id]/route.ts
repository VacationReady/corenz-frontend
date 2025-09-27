import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = await req.json();
  const { type, name, config, isActive, fallbackToEmail } = body || {};

  try {
    const updated = await prisma.notificationChannel.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(name !== undefined && { name }),
        ...(config !== undefined && { config }),
        ...(isActive !== undefined && { isActive }),
        ...(fallbackToEmail !== undefined && { fallbackToEmail }),
        updatedAt: new Date(),
      },
    });
    if (updated.companyId !== session.user.companyId) {
      // Prevent cross-tenant modification
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    if (String(error?.code) === "P2025") {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  try {
    const existing = await prisma.notificationChannel.findUnique({ where: { id } });
    if (!existing || existing.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.notificationChannel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}


